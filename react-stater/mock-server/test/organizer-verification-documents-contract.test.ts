import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { QueryClient } from '@tanstack/react-query';
import { ApiError } from '../../src/lib/api-client.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import {
  MAX_DOCUMENT_BYTES,
  documentFileError,
  verificationDocumentPayload,
  verificationDocumentKeys,
  verificationDocumentMutationOptions,
  verificationDocumentsQueryOptions
} from '../../src/features/organizer-verification-documents/api/documents.ts';
import type {
  UploadDocumentType,
  VerificationDocuments,
  VerificationDocument
} from '../../src/features/organizer-verification-documents/api/documents.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
const clients: QueryClient[] = [];
const listing: VerificationDocuments = {
  profileId: 42,
  uploadAllowed: true,
  maxFileSizeBytes: MAX_DOCUMENT_BYTES,
  supportedDocumentTypes: [
    'BUSINESS_LICENSE',
    'ID_CARD_FRONT',
    'ID_CARD_BACK',
    'TAX_CERTIFICATE',
    'OTHER'
  ],
  documents: []
};
const receipt: VerificationDocument = {
  id: 101,
  documentType: 'OTHER',
  fileName: 'evidence.pdf',
  status: 'PENDING',
  uploadedAt: '2026-11-04T08:00:00'
};
function file() {
  return new File(['%PDF-1.4\n%%EOF'], 'evidence.pdf', { type: 'application/pdf' });
}
function client() {
  const queryClient = new QueryClient();
  clients.push(queryClient);
  return queryClient;
}
function authenticate() {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  useAuthStore.getState().setAuth({
    accessToken: 'fixture-token',
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
  useAuthStore.getState().clearAuth();
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
  for (const queryClient of clients.splice(0)) queryClient.clear();
});

test('lists only the principal-owned documents through the real Spring route and Bearer session', async () => {
  authenticate();
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    assert.equal(url, '/api/organizer/verification-documents');
    assert.equal(options.method, 'GET');
    assert.equal((options.headers as Record<string, string>).Authorization, 'Bearer fixture-token');
    return Response.json({ success: true, data: listing });
  };
  assert.deepEqual(await client().fetchQuery(verificationDocumentsQueryOptions(7)), listing);
});

test('multipart contains exactly one text type and one file without owner IDs or an explicit boundary', async () => {
  authenticate();
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    assert.equal(url, '/api/organizer/verification-documents');
    assert.equal(options.method, 'POST');
    assert.equal((options.headers as Record<string, string>)['Content-Type'], undefined);
    assert.ok(options.body instanceof FormData);
    assert.deepEqual(Array.from(options.body.keys()), ['documentType', 'file']);
    assert.equal(options.body.get('documentType'), 'OTHER');
    const uploaded = options.body.get('file');
    assert.ok(uploaded instanceof File);
    assert.equal(uploaded.name, 'evidence.pdf');
    assert.equal(await uploaded.text(), await file().text());
    return Response.json({ success: true, statusCode: 201, data: receipt }, { status: 201 });
  };
  assert.deepEqual(
    await verificationDocumentMutationOptions(client(), 7).mutationFn({
      documentType: 'OTHER',
      file: file()
    }),
    receipt
  );
});

test('successful uploads refresh only the current account document cache', async () => {
  authenticate();
  const queryClient = client();
  queryClient.setQueryData(verificationDocumentKeys.detail(7), listing);
  queryClient.setQueryData(verificationDocumentKeys.detail(8), { ...listing, profileId: 43 });
  globalThis.fetch = async () => Response.json({ success: true, data: receipt }, { status: 201 });
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, verificationDocumentMutationOptions(queryClient, 7));
  await mutation.execute({ documentType: 'OTHER', file: file() });
  assert.deepEqual(
    queryClient.getQueryData<VerificationDocuments>(verificationDocumentKeys.detail(7))?.documents,
    [receipt]
  );
  assert.equal(queryClient.getQueryState(verificationDocumentKeys.detail(7))?.isInvalidated, true);
  assert.deepEqual(
    queryClient.getQueryData<VerificationDocuments>(verificationDocumentKeys.detail(8))?.documents,
    []
  );
  assert.equal(queryClient.getQueryState(verificationDocumentKeys.detail(8))?.isInvalidated, false);
});

test('failed uploads preserve the existing document list and expose the original HTTP error', async () => {
  authenticate();
  const queryClient = client();
  queryClient.setQueryData(verificationDocumentKeys.detail(7), listing);
  globalThis.fetch = async () =>
    Response.json({ success: false, message: 'Duplicate type' }, { status: 409 });
  const mutation = queryClient
    .getMutationCache()
    .build(queryClient, verificationDocumentMutationOptions(queryClient, 7));
  await assert.rejects(
    mutation.execute({ documentType: 'OTHER', file: file() }),
    (error: unknown) => error instanceof ApiError && error.status === 409
  );
  assert.deepEqual(queryClient.getQueryData(verificationDocumentKeys.detail(7)), listing);
});

test('file validation enforces extension and MIME agreement, nonempty content and the size boundary', () => {
  assert.equal(documentFileError(file()), null);
  assert.equal(
    documentFileError(
      new File([new Uint8Array(MAX_DOCUMENT_BYTES)], 'large.pdf', { type: 'application/pdf' })
    ),
    null
  );
  for (const invalid of [
    new File([], 'empty.pdf', { type: 'application/pdf' }),
    new File([new Uint8Array(MAX_DOCUMENT_BYTES + 1)], 'large.pdf', { type: 'application/pdf' }),
    new File(['x'], 'program.exe', { type: 'application/pdf' }),
    new File(['x'], 'image.png', { type: 'application/pdf' }),
    new File(['x'], 'file.pdf', { type: 'text/html' }),
    new File(['x'], '../file.pdf', { type: 'application/pdf' }),
    new File(['x'], 'bad\r\n.pdf', { type: 'application/pdf' }),
    new File(['x'], 'x'.repeat(252) + '.pdf', { type: 'application/pdf' })
  ])
    assert.ok(documentFileError(invalid));
  assert.ok(documentFileError(null));
  assert.ok(documentFileError(file(), 1));
});

test('unsupported document types and invalid files stop before sending a request', async () => {
  globalThis.fetch = async () => {
    throw new Error('Unexpected network request');
  };
  assert.throws(
    () => verificationDocumentPayload('BANK_CERTIFICATE' as UploadDocumentType, file()),
    /Unsupported/
  );
  assert.throws(
    () => verificationDocumentPayload('INVALID' as UploadDocumentType, file()),
    /Unsupported/
  );
  await assert.rejects(async () =>
    verificationDocumentMutationOptions(client(), 7).mutationFn({
      documentType: 'OTHER',
      file: new File([], 'empty.pdf', { type: 'application/pdf' })
    })
  );
});

test('missing authentication prevents document reads and uploads, including SSR', async () => {
  Reflect.deleteProperty(globalThis, 'window');
  globalThis.fetch = async () => {
    throw new Error('Unexpected network request');
  };
  await assert.rejects(
    client().fetchQuery(verificationDocumentsQueryOptions(7)),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
  await assert.rejects(
    verificationDocumentMutationOptions(client(), 7).mutationFn({
      documentType: 'OTHER',
      file: file()
    }),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
});

test('upload HTTP failures retain status codes and 401 clears the shared session', async () => {
  for (const status of [400, 403, 404, 409, 413, 500, 401]) {
    authenticate();
    globalThis.fetch = async () =>
      Response.json({ success: false, message: 'Upload rejected' }, { status });
    await assert.rejects(
      verificationDocumentMutationOptions(client(), 7).mutationFn({
        documentType: 'OTHER',
        file: file()
      }),
      (error: unknown) => error instanceof ApiError && error.status === status
    );
  }
  assert.equal(useAuthStore.getState().accessToken, null);
});
