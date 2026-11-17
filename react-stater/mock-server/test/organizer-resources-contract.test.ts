import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import {
  resourceFormSchema,
  resourcePayload,
  resourceMoney,
  resourcesOptions,
  saveResource,
  setResourceStatus,
  deleteResource,
  canConfigureWorkspaceResources
} from '../../src/features/organizer-resources/api/resources.ts';
import type { ResourceDetail } from '../../src/features/organizer-resources/api/resources.ts';
const originalFetch = globalThis.fetch;
test('workspace configuration is writable only in Draft, Active and Inactive states', () => {
  for (const status of ['DRAFT', 'ACTIVE', 'INACTIVE']) {
    assert.equal(canConfigureWorkspaceResources(status), true, status);
  }
  for (const status of [
    'PENDING_REVIEW',
    'REJECTED',
    'SUSPENDED',
    'ARCHIVED',
    'UNKNOWN',
    undefined
  ]) {
    assert.equal(canConfigureWorkspaceResources(status), false, status);
  }
});
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthStore.getState().clearAuth();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});
function login() {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  useAuthStore.getState().setAuth({
    accessToken: 'fixture-token',
    user: {
      id: 7,
      userName: 'owner',
      email: 'owner@example.test',
      role: 'ORGANIZER',
      status: 'ACTIVE',
      verified: true
    }
  });
}
const form = {
  floorPlanId: '1',
  resourceTypeId: '2',
  code: ' A-01 ',
  name: ' Window desk ',
  zoneName: '',
  description: '',
  noiseLevel: '',
  capacityOverride: '',
  pricePerHour: '50000.25',
  posX: '10',
  posY: '20',
  width: '40',
  height: '40',
  rotation: '0'
};
const resource = { id: 3, revision: '2026-11-06T01:00:00', currency: 'VND' } as ResourceDetail;

test('validates exact prices and coordinate pairs before sending an allowlisted payload', () => {
  const value = resourceFormSchema.parse(form);
  assert.equal(value.code, 'A-01');
  assert.equal(value.pricePerHour, '50000.25');
  assert.equal(resourcePayload(value, resource).expectedRevision, resource.revision);
  for (const invalid of [
    { ...form, code: 'bad code' },
    { ...form, pricePerHour: '1.234' },
    { ...form, pricePerHour: '-1' },
    { ...form, posY: '' },
    { ...form, width: '0' },
    { ...form, rotation: '360' }
  ])
    assert.equal(resourceFormSchema.safeParse(invalid).success, false);
});

test('desk placement distinguishes open areas from explicit containing rooms', () => {
  assert.equal(
    resourcePayload(resourceFormSchema.parse({ ...form, parentRoomId: '' })).parentRoomId,
    null
  );
  assert.equal(
    resourcePayload(resourceFormSchema.parse({ ...form, parentRoomId: '19' })).parentRoomId,
    19
  );
  assert.equal(resourceFormSchema.safeParse({ ...form, parentRoomId: '-1' }).success, false);
  assert.equal(resourceFormSchema.safeParse({ ...form, parentRoomId: 'room' }).success, false);
});
test('keeps VND and USD amounts separate without converting or losing decimal precision', () => {
  assert.equal(resourceMoney('1234567890123456.78', 'USD', false), '1,234,567,890,123,456.78 USD');
  assert.equal(resourceMoney('50000.25', 'VND', true), '50.000,25 VND');
  assert.equal(resourceMoney(null, 'USD', false), '—');
});
test('CRUD uses Bearer identity, real Spring paths and explicit stale-write revision', async () => {
  login();
  const calls: { url: unknown; method: unknown; body: unknown }[] = [];
  globalThis.fetch = async (url, options) => {
    assert.equal(
      (options?.headers as Record<string, string>).Authorization,
      'Bearer fixture-token'
    );
    calls.push({
      url,
      method: options?.method,
      body: options?.body ? JSON.parse(String(options.body)) : null
    });
    return Response.json({ success: true, statusCode: 200, data: resource });
  };
  await saveResource(1, resourceFormSchema.parse(form));
  await setResourceStatus(resource, 'DISABLED');
  await deleteResource(resource);
  assert.equal(calls[0].url, '/api/organizer/workspaces/1/resources');
  assert.equal(calls[0].method, 'POST');
  assert.equal('organizerId' in (calls[0].body as object), false);
  assert.deepEqual(calls[1].body, { status: 'DISABLED', expectedRevision: resource.revision });
  assert.equal(calls[1].method, 'PATCH');
  assert.equal(calls[2].method, 'DELETE');
  assert.ok(String(calls[2].url).includes('expectedRevision='));
});
test('list filters use owned workspace endpoint and 1-based paging', async () => {
  login();
  const client = new QueryClient();
  globalThis.fetch = async (url) => {
    assert.ok(String(url).includes('/api/organizer/workspaces/1/resources?'));
    assert.ok(String(url).includes('page=2'));
    assert.ok(String(url).includes('category=ROOM'));
    return Response.json({
      success: true,
      data: {
        listObjects: [],
        pageNumber: 2,
        pageSize: 20,
        totalRecords: 0,
        totalPages: 0,
        hasNext: false,
        hasPrevious: false
      }
    });
  };
  try {
    await client.fetchQuery(
      resourcesOptions(7, 1, {
        page: 2,
        size: 20,
        search: 'A',
        category: 'ROOM',
        status: 'DRAFT',
        floorPlanId: ''
      })
    );
  } finally {
    client.clear();
  }
});
