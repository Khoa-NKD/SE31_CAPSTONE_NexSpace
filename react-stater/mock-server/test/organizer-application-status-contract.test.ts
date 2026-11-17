import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../src/lib/api-client.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import type { ApplicationDetails } from '../../src/features/organizer-application/api/application.ts';
import {
  APPLICATION_STATUS,
  applicationStatusPresentation,
  permittedReviewFeedback,
  applicationTimestamp,
  applicationStatusKeys,
  applicationStatusQueryOptions
} from '../../src/features/organizer-application-status/api/status.ts';

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
  useAuthStore.getState().setAuth({
    accessToken: 'status-fixture-token',
    user: {
      id: 7,
      userName: 'applicant',
      email: 'applicant@example.test',
      role: 'USER',
      status: 'ACTIVE',
      verified: true
    }
  });
}
afterEach(() => {
  globalThis.fetch = originalFetch;
  useAuthStore.getState().clearAuth();
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  for (const value of clients.splice(0)) value.clear();
});

test('reuses owner-only current API with GET and existing Bearer envelope for all real statuses', async () => {
  authenticate();
  for (const status of Object.keys(APPLICATION_STATUS) as ApplicationDetails['status'][]) {
    const response: ApplicationDetails = {
      id: 42,
      status,
      submittedAt: '2026-11-04T08:00:00',
      reviewedAt: '2026-11-04T09:00:00',
      reviewFeedback: 'Please correct the document'
    };
    globalThis.fetch = async (url, options) => {
      assert.ok(options);
      assert.equal(url, '/api/organizer/applications/current');
      assert.equal(options?.method, 'GET');
      assert.equal(options?.body, undefined);
      assert.equal(
        (options.headers as Record<string, string>).Authorization,
        'Bearer status-fixture-token'
      );
      return Response.json({ success: true, statusCode: 200, data: response });
    };
    assert.deepEqual(await client().fetchQuery(applicationStatusQueryOptions(7)), response);
  }
});

test('maps every supported status and hides feedback for states outside rejection or revision', () => {
  assert.deepEqual(
    new Set(Object.keys(APPLICATION_STATUS)),
    new Set(['DRAFT', 'PENDING_REVIEW', 'REVISION_REQUESTED', 'APPROVED', 'REJECTED'])
  );
  for (const status of Object.keys(APPLICATION_STATUS) as ApplicationDetails['status'][]) {
    assert.ok(applicationStatusPresentation(status).label.length);
    const details = { id: 42, status, reviewFeedback: '  Please correct the document  ' };
    assert.equal(
      permittedReviewFeedback(details),
      ['REJECTED', 'REVISION_REQUESTED'].includes(status) ? 'Please correct the document' : null
    );
  }
  assert.equal(permittedReviewFeedback({ id: 42, status: 'REJECTED' }), null);
  assert.equal(
    applicationStatusPresentation('SUSPENDED' as ApplicationDetails['status']).label,
    'Unknown status'
  );
});

test('formats actual UTC timestamps without local-timezone conversion and never invents missing dates', () => {
  assert.equal(applicationTimestamp('2026-11-04T08:00:00'), '2026-11-04 08:00:00 UTC');
  assert.equal(applicationTimestamp('2026-11-04T08:00:00.123'), '2026-11-04 08:00:00.123 UTC');
  for (const value of [null, undefined, '', 'invalid'])
    assert.equal(applicationTimestamp(value), 'Not available');
});

test('no application returns empty state while errors retain HTTP status', async () => {
  authenticate();
  globalThis.fetch = async () => Response.json({ message: 'No application' }, { status: 404 });
  assert.equal(await client().fetchQuery(applicationStatusQueryOptions(7)), null);
  for (const status of [403, 500, 401]) {
    globalThis.fetch = async () =>
      Response.json({ message: 'Cannot read application' }, { status });
    await assert.rejects(
      client().fetchQuery(applicationStatusQueryOptions(7)),
      (error: unknown) => error instanceof ApiError && error.status === status
    );
  }
  assert.equal(useAuthStore.getState().accessToken, null);
});

test('refresh reads actual status again and caches separately per owner', async () => {
  authenticate();
  const queries = client();
  let status: ApplicationDetails['status'] = 'PENDING_REVIEW';
  globalThis.fetch = async () => Response.json({ success: true, data: { id: 42, status } });
  assert.equal(
    (await queries.fetchQuery(applicationStatusQueryOptions(7)))?.status,
    'PENDING_REVIEW'
  );
  queries.setQueryData(applicationStatusKeys.detail(8), { id: 43, status: 'DRAFT' });
  status = 'APPROVED';
  assert.equal((await queries.fetchQuery(applicationStatusQueryOptions(7)))?.status, 'APPROVED');
  assert.deepEqual(queries.getQueryData(applicationStatusKeys.detail(8)), {
    id: 43,
    status: 'DRAFT'
  });
  assert.equal(applicationStatusQueryOptions(7).gcTime, 0);
});

test('anonymous or SSR requests cannot read private application status', async () => {
  Reflect.deleteProperty(globalThis, 'window');
  globalThis.fetch = async () => {
    throw new Error('Unexpected network call');
  };
  await assert.rejects(
    client().fetchQuery(applicationStatusQueryOptions(7)),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
});
