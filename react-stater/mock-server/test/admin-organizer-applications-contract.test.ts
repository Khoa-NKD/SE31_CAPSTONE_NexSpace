import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../src/lib/api-client.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import { checkRouteAccess } from '../../src/features/auth/utils/role-guard.ts';
import {
  adminApplicationEndpoint,
  adminApplicationKeys,
  adminApplicationsQueryOptions,
  adminApplicationSearchSchema
} from '../../src/features/admin-organizers/api/applications.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const clients: QueryClient[] = [];
function client() {
  const value = new QueryClient();
  clients.push(value);
  return value;
}
function authenticate() {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  const actor = {
    id: 1,
    userName: 'fixture.admin',
    email: 'admin@example.test',
    role: 'ADMIN',
    status: 'ACTIVE' as const,
    verified: true
  };
  useAuthStore.getState().setAuth({ accessToken: 'admin-list-fixture', user: actor });
  return actor;
}
afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthStore.getState().clearAuth();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  for (const value of clients.splice(0)) value.clear();
});

test('defaults to all submitted applications with one-based pagination and whitelisted URL parameters', () => {
  const filters = adminApplicationSearchSchema.parse({ appId: 'old-prototype-id' });
  const url = new URL(adminApplicationEndpoint(filters), 'http://fixture.test');
  assert.equal(url.pathname, '/admin/organizer-applications');
  assert.equal(url.searchParams.get('page'), '1');
  assert.equal(url.searchParams.get('size'), '20');
  assert.equal(filters.status, 'all');
  assert.equal(url.searchParams.has('status'), false);
  assert.equal(url.searchParams.get('sortBy'), 'submittedAt');
  assert.equal(url.searchParams.has('appId'), false);
  assert.equal(url.searchParams.has('userId'), false);
  assert.equal(url.searchParams.get('sortDir'), 'desc');
});

test('supports all submitted/review-outcome filters and safely encodes literal search input', () => {
  for (const status of ['all', 'PENDING_REVIEW', 'APPROVED', 'REJECTED', 'REVISION_REQUESTED']) {
    const filters = adminApplicationSearchSchema.parse({
      status,
      search: '  Company & %_!  ',
      sortBy: 'reviewedAt',
      sortDir: 'asc',
      page: '2',
      size: '10'
    });
    const url = new URL(adminApplicationEndpoint(filters), 'http://fixture.test');
    assert.equal(url.searchParams.get('status'), status === 'all' ? null : status);
    assert.equal(url.searchParams.get('search'), 'Company & %_!');
    assert.equal(url.searchParams.get('page'), '2');
    assert.equal(url.searchParams.get('sortDir'), 'asc');
    assert.equal(url.searchParams.get('size'), '10');
  }
});

test('normalizes malformed URL filters without permitting arbitrary sort fields or states', () => {
  const invalid = adminApplicationSearchSchema.parse({
    page: -1,
    size: 999,
    sortBy: 'organizer.password',
    sortDir: 'delete',
    status: 'SUSPENDED',
    search: 'x'.repeat(256)
  });
  assert.equal(invalid.page, 1);
  assert.equal(invalid.size, 20);
  assert.equal(invalid.sortBy, 'submittedAt');
  assert.equal(invalid.sortDir, 'desc');
  assert.equal(invalid.status, 'all');
  assert.equal(invalid.search, '');
});

test('calls the Spring Admin endpoint with Bearer and preserves server paging and total counts', async () => {
  authenticate();
  const filters = adminApplicationSearchSchema.parse({ page: 2, size: 10, status: 'APPROVED' });
  const page = {
    listObjects: [
      { id: 42, legalName: 'Company', status: 'APPROVED', reviewedAt: '2026-11-05T09:00:00' }
    ],
    pageNumber: 2,
    pageSize: 10,
    totalRecords: 31,
    totalPages: 4,
    hasNext: true,
    hasPrevious: true
  };
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    const requestUrl = new URL(String(url), 'http://fixture.test');
    assert.equal(requestUrl.pathname, '/api/admin/organizer-applications');
    assert.equal(requestUrl.searchParams.get('page'), '2');
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      'Bearer admin-list-fixture'
    );
    return Response.json({ success: true, statusCode: 200, data: page });
  };
  assert.deepEqual(await client().fetchQuery(adminApplicationsQueryOptions(1, filters)), page);
});

test('handles empty results and keeps original HTTP errors for authorization or retry UI', async () => {
  authenticate();
  const filters = adminApplicationSearchSchema.parse({});
  const empty = {
    listObjects: [],
    pageNumber: 1,
    pageSize: 20,
    totalRecords: 0,
    totalPages: 0,
    hasNext: false,
    hasPrevious: false
  };
  globalThis.fetch = async () => Response.json({ success: true, data: empty });
  assert.deepEqual(await client().fetchQuery(adminApplicationsQueryOptions(1, filters)), empty);
  for (const status of [400, 403, 500, 401]) {
    globalThis.fetch = async () =>
      Response.json({ message: 'Cannot read applications' }, { status });
    await assert.rejects(
      client().fetchQuery(adminApplicationsQueryOptions(1, filters)),
      (error: unknown) => error instanceof ApiError && error.status === status
    );
  }
  assert.equal(useAuthStore.getState().accessToken, null);
});

test('separates list caches by actor, page, search, status and sort', () => {
  const filters = adminApplicationSearchSchema.parse({});
  const key = adminApplicationKeys.list(1, filters);
  for (const patch of [
    { page: 2 },
    { search: 'Company' },
    { status: 'APPROVED' },
    { sortBy: 'legalName', sortDir: 'asc' }
  ])
    assert.notDeepEqual(
      adminApplicationKeys.list(1, adminApplicationSearchSchema.parse({ ...filters, ...patch })),
      key
    );
  assert.notDeepEqual(adminApplicationKeys.list(2, filters), key);
  assert.equal(adminApplicationsQueryOptions(1, filters).gcTime, 0);
});

test('existing dashboard guard permits ADMIN and denies USER/ORGANIZER and anonymous viewers', () => {
  const admin = authenticate();
  const route = '/dashboard/admin/organizers/queue';
  assert.equal(checkRouteAccess(route, true, admin).allowed, true);
  for (const role of ['USER', 'ORGANIZER'])
    assert.equal(checkRouteAccess(route, true, { ...admin, role }).allowed, false);
  assert.equal(checkRouteAccess(route, false, null).allowed, false);
});

test('anonymous and SSR clients stop before any private request', async () => {
  Reflect.deleteProperty(globalThis, 'window');
  globalThis.fetch = async () => {
    throw new Error('Unexpected network request');
  };
  await assert.rejects(
    client().fetchQuery(adminApplicationsQueryOptions(1, adminApplicationSearchSchema.parse({}))),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
});
