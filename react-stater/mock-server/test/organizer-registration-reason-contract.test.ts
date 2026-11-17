import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import {
  applicationDraftSchema,
  registrationReasonSubmissionSchema,
  applicationPayload,
  saveApplicationDraft,
  currentApplication,
  submitApplicationDraft
} from '../../src/features/organizer-application/api/application.ts';
import {
  correctionSchema,
  saveCorrection
} from '../../src/features/organizer-lifecycle/api/lifecycle.ts';
import { adminApplicationDetailsQueryOptions } from '../../src/features/admin-organizers/api/application-details.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import { ApiError } from '../../src/lib/api-client.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const clients: QueryClient[] = [];
const application = {
  legalName: 'Workspace Company',
  businessType: 'LIMITED_LIABILITY' as const,
  taxId: '0400000123',
  representativeName: 'Representative',
  address: '12 Test Street',
  contactPhone: '0900000123',
  contactEmail: 'contact@example.test',
  registrationReason: 'Offer flexible workspaces.\nSupport local businesses.'
};
function authenticate(role = 'USER') {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  useAuthStore
    .getState()
    .setAuth({
      accessToken: 'reason-contract-fixture',
      user: {
        id: 7,
        userName: 'applicant',
        email: 'applicant@example.test',
        role,
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
  for (const client of clients.splice(0)) client.clear();
});

test('draft and correction saves may leave reason blank while explicit submission requires it', () => {
  for (const reason of ['', '   ']) {
    assert.equal(
      applicationDraftSchema.safeParse({ ...application, registrationReason: reason }).success,
      true
    );
    assert.equal(
      correctionSchema.safeParse({ ...application, registrationReason: reason }).success,
      true
    );
    assert.equal(registrationReasonSubmissionSchema.safeParse(reason).success, false);
  }
  const { registrationReason, ...legacy } = application;
  assert.equal(applicationDraftSchema.parse(legacy).registrationReason, '');
  assert.equal(correctionSchema.safeParse({ ...application, legalName: '' }).success, false);
});
test('reason trims outer whitespace, preserves line breaks and enforces 2000 characters', () => {
  assert.equal(
    registrationReasonSubmissionSchema.parse('  First line\nSecond line  '),
    'First line\nSecond line'
  );
  assert.equal(registrationReasonSubmissionSchema.safeParse('x'.repeat(2000)).success, true);
  assert.equal(
    applicationDraftSchema.safeParse({ ...application, registrationReason: 'x'.repeat(2001) })
      .success,
    false
  );
  assert.equal(registrationReasonSubmissionSchema.safeParse('x'.repeat(2001)).success, false);
});
test('owner saves and reloads reason through the existing real Spring draft/current contract', async () => {
  authenticate();
  const requests: string[] = [];
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    requests.push(`${options.method} ${url}`);
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      'Bearer reason-contract-fixture'
    );
    if (options.method === 'PUT') assert.deepEqual(JSON.parse(options.body as string), application);
    return Response.json({ success: true, data: { id: 42, status: 'DRAFT', ...application } });
  };
  assert.equal(
    (await saveApplicationDraft(application)).registrationReason,
    application.registrationReason
  );
  assert.equal((await currentApplication())?.registrationReason, application.registrationReason);
  assert.deepEqual(requests, [
    'PUT /api/organizer/applications/draft',
    'GET /api/organizer/applications/current'
  ]);
});
test('multipart submission carries reason in application JSON without changing file handling', async () => {
  const payload = applicationPayload(
    application,
    new File(['%PDF-1.4'], 'license.pdf', { type: 'application/pdf' })
  );
  assert.equal(
    JSON.parse(await (payload.get('application') as Blob).text()).registrationReason,
    application.registrationReason
  );
  assert.deepEqual(Array.from(payload.keys()), ['application', 'businessLicense']);
});
test('Admin details preserve supplied reason or legacy null without replacing it with feedback', async () => {
  authenticate('ADMIN');
  const client = new QueryClient();
  clients.push(client);
  for (const reason of [application.registrationReason, null]) {
    globalThis.fetch = async (url, options) => {
      assert.equal(url, '/api/admin/organizer-applications/42');
      assert.equal(options?.method, 'GET');
      return Response.json({
        success: true,
        data: {
          id: 42,
          registrationReason: reason,
          reviewFeedback: 'Unrelated review note',
          documents: []
        }
      });
    };
    const result = await client.fetchQuery(adminApplicationDetailsQueryOptions(7, '42'));
    assert.equal(result.registrationReason, reason);
    client.clear();
  }
});
test('correction saves reason through nested application without implicitly resubmitting', async () => {
  authenticate();
  let count = 0;
  globalThis.fetch = async (url, options) => {
    count++;
    assert.equal(url, '/api/organizer/applications/current/correction');
    assert.equal(options?.method, 'PUT');
    assert.deepEqual(JSON.parse(options?.body as string), { revision: 12, application });
    return Response.json({
      success: true,
      data: { id: 42, status: 'REJECTED', revision: 13, canCorrect: true }
    });
  };
  assert.equal((await saveCorrection(12, application)).status, 'REJECTED');
  assert.equal(count, 1);
});
test('submission field errors preserve the backend reason error for the form', async () => {
  authenticate();
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        statusCode: 400,
        message: 'Invalid application',
        errors: { registrationReason: 'must not be blank' }
      },
      { status: 400 }
    );
  await assert.rejects(
    submitApplicationDraft(),
    (failure: unknown) =>
      failure instanceof ApiError &&
      failure.status === 400 &&
      failure.validationErrors?.registrationReason === 'must not be blank'
  );
});
