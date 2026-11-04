import { afterEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import { ApiError } from '../../src/lib/api-client.ts';
import {
  documentContentEndpoint,
  fetchDocumentContent,
  safeDocumentFilename
} from '../../src/features/admin-organizers/api/document-content.ts';
const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
function authenticate(role = 'ADMIN', id = 1, token = 'document-test-fixture') {
  Object.defineProperty(globalThis, 'window', { configurable: true, value: {} });
  useAuthStore.getState().setAuth({
    accessToken: token,
    user: {
      id,
      role,
      userName: 'fixture',
      email: 'fixture@example.test',
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
});
test('scopes content paths by application and document, with no token in the URL', () => {
  assert.equal(
    documentContentEndpoint('7', '9', true),
    '/admin/organizer-applications/7/documents/9/content?download=true'
  );
  for (const invalid of ['0', '../7', '1?owner=2', '9223372036854775808'])
    assert.throws(() => documentContentEndpoint('7', invalid));
});
test('uses Bearer for bounded binary content without caching, cookies or redirects', async () => {
  authenticate();
  const controller = new AbortController();
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    assert.equal(String(url), '/api/admin/organizer-applications/7/documents/9/content');
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      'Bearer document-test-fixture'
    );
    assert.equal(options.cache, 'no-store');
    assert.equal(options.credentials, 'omit');
    assert.equal(options.redirect, 'error');
    assert.equal(options.signal, controller.signal);
    return new Response('%PDF-1.4 demo', {
      headers: { 'content-type': 'application/pdf; charset=binary' }
    });
  };
  const blob = await fetchDocumentContent('7', '9', controller.signal);
  assert.equal(blob.type, 'application/pdf');
  assert.equal(await blob.text(), '%PDF-1.4 demo');
});
test('recognizes original PNG and JPEG content and sanitizes download names', async () => {
  authenticate();
  for (const [mime, bytes] of [
    ['image/png', [137, 80, 78, 71, 13, 10, 26, 10]],
    ['image/jpeg', [255, 216, 255, 0]]
  ] as const) {
    globalThis.fetch = async () =>
      new Response(new Uint8Array(bytes), { headers: { 'content-type': mime } });
    assert.equal((await fetchDocumentContent('7', '9')).type, mime);
  }
  assert.equal(
    safeDocumentFilename('C:\\private\\giấy phép\r\n.pdf', 'application/pdf'),
    'giấy phép__.pdf'
  );
  assert.equal(safeDocumentFilename('attack.html', 'image/png'), 'attack.html.png');
});
test('anonymous and non-Admin clients do not fetch file contents', async () => {
  globalThis.fetch = async () => {
    throw new Error('Unexpected network');
  };
  await assert.rejects(
    fetchDocumentContent('7', '9'),
    (e: unknown) => e instanceof ApiError && e.status === 401
  );
  authenticate('USER');
  await assert.rejects(
    fetchDocumentContent('7', '9'),
    (e: unknown) => e instanceof ApiError && e.status === 403
  );
});
test('propagates not-found/authorization/provider errors and clears expired session', async () => {
  authenticate();
  for (const status of [404, 403, 502, 401]) {
    globalThis.fetch = async () => Response.json({ message: 'Document unavailable' }, { status });
    await assert.rejects(
      fetchDocumentContent('7', '9'),
      (e: unknown) => e instanceof ApiError && e.status === status
    );
  }
  assert.equal(useAuthStore.getState().accessToken, null);
});
test('a late error or content response from an old session cannot affect a new session', async () => {
  authenticate();
  globalThis.fetch = async () => {
    authenticate('ADMIN', 2, 'second-test-fixture');
    return Response.json({ message: 'Expired' }, { status: 401 });
  };
  await assert.rejects(fetchDocumentContent('7', '9'));
  assert.equal(useAuthStore.getState().accessToken, 'second-test-fixture');
  globalThis.fetch = async () => {
    authenticate('ADMIN', 3, 'third-test-fixture');
    return new Response('%PDF-1.4', { headers: { 'content-type': 'application/pdf' } });
  };
  await assert.rejects(
    fetchDocumentContent('7', '9'),
    (e: unknown) => e instanceof ApiError && e.status === 401
  );
});
test('rejects unsupported, corrupt, empty and oversized bodies', async () => {
  authenticate();
  for (const [body, mime] of [
    ['<html>unsafe</html>', 'text/html'],
    ['<html>spoofed</html>', 'application/pdf'],
    ['', 'application/pdf'],
    ['%PDF-' + 'x'.repeat(5 * 1024 * 1024), 'application/pdf']
  ]) {
    globalThis.fetch = async () => new Response(body, { headers: { 'content-type': mime } });
    await assert.rejects(fetchDocumentContent('7', '9'));
  }
});
