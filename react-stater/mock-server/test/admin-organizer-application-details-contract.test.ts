import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../src/lib/api-client.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import { checkRouteAccess } from '../../src/features/auth/utils/role-guard.ts';
import {
  validApplicationId,
  adminApplicationDetailsEndpoint,
  adminApplicationDetailsKeys,
  adminApplicationDetailsQueryOptions
} from '../../src/features/admin-organizers/api/application-details.ts';

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
  useAuthStore.getState().setAuth({ accessToken: 'details-test-fixture', user: actor });
  return actor;
}
afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthStore.getState().clearAuth();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  for (const item of clients.splice(0)) item.clear();
});

test('accepts only positive decimal Long IDs without rounding or path injection', () => {
  for (const id of ['1', '42', '9007199254740993', '9223372036854775807']) {
    assert.equal(validApplicationId(id), true);
    assert.equal(adminApplicationDetailsEndpoint(id), `/admin/organizer-applications/${id}`);
  }
  for (const id of [
    '',
    '0',
    '-1',
    '01',
    '1.5',
    '1e2',
    '9223372036854775808',
    '../queue',
    '1?ownerId=2'
  ]) {
    assert.equal(validApplicationId(id), false);
    assert.throws(
      () => adminApplicationDetailsEndpoint(id),
      (error: unknown) => error instanceof ApiError && error.status === 400
    );
  }
});

test('reads the real Spring detail endpoint with Bearer and preserves metadata and review fields', async () => {
  authenticate();
  const details = {
    id: 7,
    legalName: 'Workspace Company',
    status: 'REVISION_REQUESTED',
    applicant: {
      id: 42,
      userName: 'applicant',
      email: 'applicant@example.test',
      fullName: 'Test Applicant'
    },
    reviewFeedback: 'Clarify address',
    documents: [{ id: 9, fileName: 'license.pdf', current: true, status: 'PENDING' }]
  };
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    assert.equal(String(url), '/api/admin/organizer-applications/7');
    assert.equal(options.method, 'GET');
    assert.equal(options.body, undefined);
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      'Bearer details-test-fixture'
    );
    assert.ok(options.signal instanceof AbortSignal);
    return Response.json({ success: true, statusCode: 200, data: details });
  };
  assert.deepEqual(await client().fetchQuery(adminApplicationDetailsQueryOptions(1, '7')), details);
});

test('invalid IDs stop before a network request', async () => {
  authenticate();
  globalThis.fetch = async () => {
    throw new Error('Unexpected request');
  };
  await assert.rejects(
    client().fetchQuery(adminApplicationDetailsQueryOptions(1, '../7')),
    (error: unknown) => error instanceof ApiError && error.status === 400
  );
});

test('preserves empty documents and HTTP errors for not-found, denied and retry states', async () => {
  authenticate();
  globalThis.fetch = async () => Response.json({ success: true, data: { id: 7, documents: [] } });
  assert.deepEqual(
    (await client().fetchQuery(adminApplicationDetailsQueryOptions(1, '7'))).documents,
    []
  );
  for (const status of [400, 404, 403, 500, 401]) {
    globalThis.fetch = async () =>
      Response.json({ message: 'Cannot read application' }, { status });
    await assert.rejects(
      client().fetchQuery(adminApplicationDetailsQueryOptions(1, '7')),
      (error: unknown) => error instanceof ApiError && error.status === status
    );
  }
  assert.equal(useAuthStore.getState().accessToken, null);
});

test('private detail caches are separated by actor and application and are not retained', () => {
  assert.notDeepEqual(
    adminApplicationDetailsKeys.detail(1, '7'),
    adminApplicationDetailsKeys.detail(2, '7')
  );
  assert.notDeepEqual(
    adminApplicationDetailsKeys.detail(1, '7'),
    adminApplicationDetailsKeys.detail(1, '8')
  );
  assert.equal(adminApplicationDetailsQueryOptions(1, '7').gcTime, 0);
  assert.equal(adminApplicationDetailsQueryOptions(1, '7').retry, false);
});

test('dashboard protection admits only Admin for detail deep links', () => {
  const admin = authenticate();
  const route = '/dashboard/admin/organizers/7';
  assert.equal(checkRouteAccess(route, true, admin).allowed, true);
  for (const role of ['USER', 'ORGANIZER'])
    assert.equal(checkRouteAccess(route, true, { ...admin, role }).allowed, false);
  assert.equal(checkRouteAccess(route, false, null).allowed, false);
});

test('anonymous and SSR detail reads cannot start private network traffic', async () => {
  Reflect.deleteProperty(globalThis, 'window');
  globalThis.fetch = async () => {
    throw new Error('Unexpected request');
  };
  await assert.rejects(
    client().fetchQuery(adminApplicationDetailsQueryOptions(1, '7')),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
});
