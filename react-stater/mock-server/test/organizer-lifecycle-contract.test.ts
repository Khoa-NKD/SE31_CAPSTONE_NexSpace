import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../src/lib/api-client.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import {
  adminReview,
  ownerLifecycle,
  adminLifecycleQueryOptions,
  reviewPayload,
  saveCorrection,
  resubmit,
  correctionDocumentPayload,
  reviewMutationOptions,
  correctionSchema,
  lifecycleKeys
} from '../../src/features/organizer-lifecycle/api/lifecycle.ts';
const fetchOriginal = globalThis.fetch;
const windowOriginal = Object.getOwnPropertyDescriptor(globalThis, 'window');
const clients: QueryClient[] = [];
function authenticate(role = 'ADMIN') {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  useAuthStore.getState().setAuth({
    accessToken: 'isolated-contract-token',
    user: {
      id: 7,
      userName: 'actor',
      email: 'actor@example.test',
      role,
      status: 'ACTIVE',
      verified: true
    }
  });
}
const context = {
  id: 42,
  status: 'PENDING_REVIEW',
  revision: 12,
  suspended: false,
  currentDocumentIds: [9],
  canApprove: true,
  canReject: true,
  canSuspend: false,
  canCorrect: false
};
afterEach(() => {
  globalThis.fetch = fetchOriginal;
  useAuthStore.getState().clearAuth();
  if (windowOriginal) Object.defineProperty(globalThis, 'window', windowOriginal);
  else Reflect.deleteProperty(globalThis, 'window');
  for (const client of clients.splice(0)) client.clear();
});
test('admin actions call real authenticated Spring routes and preserve reviewed revision', async () => {
  authenticate();
  const calls: string[] = [];
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    assert.ok(options);
    assert.equal(options?.method, 'POST');
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      'Bearer isolated-contract-token'
    );
    const body = JSON.parse(options?.body as string);
    assert.equal(body.revision, 12);
    assert.equal('actorId' in body, false);
    assert.equal('status' in body, false);
    assert.equal('role' in body, false);
    if (String(url).endsWith('/approve'))
      assert.deepEqual(body, {
        revision: 12,
        documentsConfirmed: true,
        documentIds: [9],
        note: 'Checked'
      });
    else assert.deepEqual(body, { revision: 12, reason: 'Policy reason' });
    return Response.json({ success: true, data: context });
  };
  await adminReview('42', {
    action: 'approve',
    revision: 12,
    documentsConfirmed: true,
    documentIds: [9],
    note: ' Checked '
  });
  for (const action of ['reject', 'suspend'] as const)
    await adminReview('42', { action, revision: 12, reason: ' Policy reason ' });
  assert.deepEqual(calls, [
    '/api/admin/organizer-applications/42/approve',
    '/api/admin/organizer-applications/42/reject',
    '/api/admin/organizer-applications/42/suspend'
  ]);
});
test('review validation blocks invalid reason, stale revision format and unconfirmed approval before HTTP', () => {
  for (const revision of [-1, NaN, 0.1, Number.MAX_SAFE_INTEGER + 1])
    assert.throws(() => reviewPayload({ action: 'reject', revision, reason: 'reason' }));
  for (const reason of ['', '   ', 'x'.repeat(501)])
    assert.throws(() => reviewPayload({ action: 'suspend', revision: 0, reason }));
  assert.throws(() =>
    reviewPayload({ action: 'approve', revision: 0, documentsConfirmed: false, documentIds: [9] })
  );
  assert.throws(() =>
    reviewPayload({ action: 'approve', revision: 0, documentsConfirmed: true, documentIds: [] })
  );
  assert.throws(() => adminReview('../42', { action: 'reject', revision: 0, reason: 'reason' }));
});
test('owner correction and explicit resubmit use same current profile and do not send owner or role', async () => {
  authenticate('USER');
  const calls: string[] = [];
  const application = {
    legalName: 'Workspace Company',
    businessType: 'LIMITED_LIABILITY' as const,
    taxId: '0400000123',
    representativeName: 'Legal Representative',
    address: '12 Example Street',
    contactPhone: '0900000123',
    contactEmail: 'contact@example.test'
  };
  globalThis.fetch = async (url, options) => {
    calls.push(String(url));
    const body = options?.body ? JSON.parse(options.body as string) : undefined;
    if (String(url).endsWith('/correction')) {
      assert.equal(options?.method, 'PUT');
      assert.deepEqual(body, { revision: 12, application });
    }
    if (String(url).endsWith('/resubmit')) {
      assert.equal(options?.method, 'POST');
      assert.deepEqual(body, { revision: 13 });
    }
    return Response.json({ success: true, data: context });
  };
  await ownerLifecycle();
  await saveCorrection(12, application);
  await resubmit(13);
  assert.deepEqual(calls, [
    '/api/organizer/applications/current/lifecycle',
    '/api/organizer/applications/current/correction',
    '/api/organizer/applications/current/resubmit'
  ]);
  assert.equal(correctionSchema.safeParse({ ...application, legalName: '  ' }).success, false);
  assert.equal(correctionSchema.safeParse(application).success, true);
});
test('document correction requires explicit previous document reference and safe file metadata', () => {
  const file = new File(['%PDF-1.4'], 'license.pdf', { type: 'application/pdf' });
  const payload = correctionDocumentPayload(12, 'BUSINESS_LICENSE', 9, file);
  assert.deepEqual(Array.from(payload.keys()), [
    'revision',
    'documentType',
    'expectedCurrentDocumentId',
    'file'
  ]);
  assert.equal(payload.get('expectedCurrentDocumentId'), '9');
  const added = correctionDocumentPayload(12, 'OTHER', null, file);
  assert.equal(added.has('expectedCurrentDocumentId'), false);
  assert.throws(() =>
    correctionDocumentPayload(
      12,
      'BUSINESS_LICENSE',
      9,
      new File(['bad'], '../license.pdf', { type: 'application/pdf' })
    )
  );
  assert.throws(() =>
    correctionDocumentPayload(
      12,
      'BUSINESS_LICENSE',
      9,
      new File(['bad'], 'license.pdf', { type: 'text/plain' })
    )
  );
});
test('successful decision invalidates status, list, details, documents and operational caches', async () => {
  const client = new QueryClient();
  clients.push(client);
  const prefixes = [
    'organizer-lifecycle',
    'admin-organizer-applications',
    'admin-organizer-application-details',
    'organizer-application-status',
    'organizer-verification-documents',
    'organizer-business-profile'
  ];
  for (const prefix of prefixes) client.setQueryData([prefix, 7], context);
  await reviewMutationOptions(client, '42').onSuccess();
  for (const prefix of prefixes)
    assert.equal(client.getQueryState([prefix, 7])?.isInvalidated, true);
});
test('server conflict propagates and does not optimistically approve cached data', async () => {
  authenticate();
  const client = new QueryClient();
  clients.push(client);
  const key = ['admin-organizer-applications', 7];
  client.setQueryData(key, context);
  globalThis.fetch = async () =>
    Response.json(
      { success: false, message: 'Application changed', statusCode: 409 },
      { status: 409 }
    );
  await assert.rejects(
    reviewMutationOptions(client, '42').mutationFn({
      action: 'reject',
      revision: 0,
      reason: 'reason'
    }),
    (error: unknown) => error instanceof ApiError && error.status === 409
  );
  assert.deepEqual(client.getQueryData(key), context);
  assert.equal(client.getQueryState(key)?.isInvalidated, false);
});
test('query keys isolate administrators and owners and reads cannot mutate state', async () => {
  authenticate();
  assert.notDeepEqual(lifecycleKeys.admin(1, '42'), lifecycleKeys.admin(2, '42'));
  assert.notDeepEqual(lifecycleKeys.owner(1), lifecycleKeys.owner(2));
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/admin/organizer-applications/42/lifecycle');
    assert.equal(options?.method, 'GET');
    return Response.json({ success: true, data: context });
  };
  const client = new QueryClient();
  clients.push(client);
  assert.deepEqual(await client.fetchQuery(adminLifecycleQueryOptions(7, '42')), context);
});
test('anonymous lifecycle requests fail before HTTP', async () => {
  let called = false;
  globalThis.fetch = async () => {
    called = true;
    throw new Error('unexpected request');
  };
  await assert.rejects(
    ownerLifecycle(),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
  assert.equal(called, false);
});
