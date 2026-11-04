import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../src/lib/api-client.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import {
  businessContactSchema,
  businessProfileKeys,
  businessProfileMutationOptions,
  businessProfileQueryOptions
} from '../../src/features/organizer-business-profile/api/profile.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const clients: QueryClient[] = [];
const profile = {
  id: 42,
  legalName: 'Example Company',
  businessType: 'LIMITED_LIABILITY' as const,
  taxId: 'TEST-TAX-123',
  representativeName: 'Test Representative',
  address: '123 Example Street',
  contactEmail: 'contact@example.test',
  contactPhone: '0901234567'
};
const contacts = {
  address: ' 456 New Street ',
  contactEmail: ' new@example.test ',
  contactPhone: ' +84901234567 '
};

function authenticate() {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  useAuthStore.getState().setAuth({
    accessToken: 'fixture-organizer-token',
    user: {
      id: 7,
      userName: 'organizer',
      email: 'owner@example.test',
      role: 'ORGANIZER',
      status: 'ACTIVE',
      verified: true
    }
  });
}

function client() {
  const value = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } }
  });
  clients.push(value);
  return value;
}

afterEach(() => {
  useAuthStore.getState().clearAuth();
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  for (const value of clients.splice(0)) value.clear();
});

test('loads current business profile from Spring with the shared Bearer session', async () => {
  authenticate();
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    assert.equal(url, '/api/organizer/business-profile');
    assert.equal(options?.method, 'GET');
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      'Bearer fixture-organizer-token'
    );
    return Response.json({ success: true, statusCode: 200, data: profile });
  };
  assert.deepEqual(await client().fetchQuery(businessProfileQueryOptions(7)), profile);
});

test('saves only trimmed contact fields and synchronizes only the current organizer cache', async () => {
  authenticate();
  const queryClient = client();
  queryClient.setQueryData(businessProfileKeys.detail(7), profile);
  queryClient.setQueryData(businessProfileKeys.detail(8), { ...profile, id: 43 });
  const updated = {
    ...profile,
    address: '456 New Street',
    contactEmail: 'new@example.test',
    contactPhone: '+84901234567'
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/organizer/business-profile');
    assert.equal(options?.method, 'PUT');
    assert.deepEqual(JSON.parse(options?.body as string), {
      address: updated.address,
      contactEmail: updated.contactEmail,
      contactPhone: updated.contactPhone
    });
    return Response.json({ success: true, statusCode: 200, data: updated });
  };
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, businessProfileMutationOptions(queryClient, 7));
  const tampered = {
    ...contacts,
    legalName: 'Injected',
    status: 'REJECTED',
    organizerId: 8
  };
  await mutation.execute(tampered);
  assert.deepEqual(queryClient.getQueryData(businessProfileKeys.detail(7)), updated);
  assert.equal(queryClient.getQueryState(businessProfileKeys.detail(7))?.isInvalidated, true);
  assert.deepEqual(queryClient.getQueryData(businessProfileKeys.detail(8)), { ...profile, id: 43 });
  assert.equal(queryClient.getQueryState(businessProfileKeys.detail(8))?.isInvalidated, false);
});

test('failed saves preserve cached profile and expose backend field errors', async () => {
  authenticate();
  const queryClient = client();
  queryClient.setQueryData(businessProfileKeys.detail(7), profile);
  globalThis.fetch = async () =>
    Response.json(
      { success: false, message: 'Invalid contact', errors: { contactPhone: 'Invalid phone' } },
      { status: 400 }
    );
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, businessProfileMutationOptions(queryClient, 7));
  await assert.rejects(mutation.execute(contacts), (error: unknown) => {
    assert.ok(error instanceof ApiError);
    assert.equal(error.status, 400);
    assert.deepEqual(error.validationErrors, { contactPhone: 'Invalid phone' });
    return true;
  });
  assert.deepEqual(queryClient.getQueryData(businessProfileKeys.detail(7)), profile);
  assert.equal(queryClient.getQueryState(businessProfileKeys.detail(7))?.isInvalidated, false);
});

test('validation matches the backend contact limits and rejects invalid values before fetch', async () => {
  assert.equal(
    businessContactSchema.safeParse({ ...contacts, address: 'x'.repeat(500) }).success,
    true
  );
  for (const invalid of [
    { ...contacts, address: '' },
    { ...contacts, address: 'x'.repeat(501) },
    { ...contacts, contactEmail: 'invalid' },
    { ...contacts, contactEmail: 'x'.repeat(250) + '@test.test' },
    { ...contacts, contactPhone: '1234567' },
    { ...contacts, contactPhone: '1'.repeat(21) },
    { ...contacts, contactPhone: 'abcdefghi' }
  ])
    assert.equal(businessContactSchema.safeParse(invalid).success, false);
  globalThis.fetch = async () => {
    throw new Error('Unexpected network request');
  };
  await assert.rejects(async () =>
    businessProfileMutationOptions(client(), 7).mutationFn({ ...contacts, address: ' ' })
  );
});

test('missing browser authentication stops profile reads before any network request', async () => {
  globalThis.fetch = async () => {
    throw new Error('Unexpected network request');
  };
  await assert.rejects(
    client().fetchQuery(businessProfileQueryOptions(7)),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
});

test('server errors and changed eligibility retain their HTTP status', async () => {
  authenticate();
  for (const status of [403, 404, 409, 500]) {
    globalThis.fetch = async () =>
      Response.json({ success: false, message: 'Request rejected' }, { status });
    await assert.rejects(
      businessProfileMutationOptions(client(), 7).mutationFn(contacts),
      (error: unknown) => error instanceof ApiError && error.status === status
    );
  }
});
