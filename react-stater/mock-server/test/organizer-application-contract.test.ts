import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { ApiError, request } from '../../src/lib/api-client.ts';
import {
  backendRequest,
  signIn,
  clearSession,
  currentUser
} from '../../src/features/auth/api/session.ts';
import {
  applicationPayload,
  submitApplication
} from '../../src/features/organizer-application/api/application.ts';
import { useAuthStore } from '../../src/features/auth/store/auth-store.ts';
import { authService } from '../../src/features/auth/api/auth-service.ts';

const originalFetch = globalThis.fetch;
const originalWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');

test('upstream login and logout share the token used by organizer submission', async () => {
  browser();
  const user = {
    id: 7,
    userName: 'applicant',
    email: 'applicant@example.test',
    role: 'USER',
    status: 'ACTIVE',
    verified: true
  };
  const paths: string[] = [];
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    paths.push(String(url));
    if (url === '/api/auth/login')
      return Response.json({
        success: true,
        data: { accessToken: 'upstream-token', tokenType: 'Bearer', user }
      });
    assert.equal(
      (options.headers as Record<string, string>).Authorization,
      'Bearer upstream-token'
    );
    if (url === '/api/auth/logout') return Response.json({ success: true });
    assert.equal(url, '/api/organizer/applications');
    assert.ok(options && options.body instanceof FormData);
    return Response.json(
      {
        success: true,
        data: { id: 42, status: 'PENDING_REVIEW', submittedAt: '2026-11-03T01:00:00' }
      },
      { status: 201 }
    );
  };
  const login = await authService.login({ username: 'applicant', password: 'test-password' });
  useAuthStore.getState().setAuth({ user: login.user, accessToken: login.accessToken });
  const receipt = await submitApplication(
    {
      legalName: 'Test Company',
      businessType: 'LIMITED_LIABILITY',
      taxId: 'TEST-123',
      representativeName: 'Representative',
      address: 'Test address',
      contactPhone: '+84901234567',
      contactEmail: 'contact@example.test'
    },
    new File(['%PDF-1.4'], 'license.pdf', { type: 'application/pdf' })
  );
  assert.equal(receipt.status, 'PENDING_REVIEW');
  await authService.logout();
  useAuthStore.getState().clearAuth();
  await assert.rejects(
    currentUser(),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
  assert.deepEqual(paths, ['/api/auth/login', '/api/organizer/applications', '/api/auth/logout']);
});

test('registration uses the Spring endpoint and explicit username/name DTO fields', async () => {
  browser();
  const input = {
    userName: 'new.applicant',
    firstName: 'Test',
    lastName: 'Applicant',
    email: 'new@example.test',
    password: 'test-password'
  };
  globalThis.fetch = async (url, options) => {
    assert.equal(url, '/api/auth/register');
    assert.equal(options?.method, 'POST');
    assert.deepEqual(JSON.parse(options?.body as string), input);
    assert.equal('fullName' in JSON.parse(options?.body as string), false);
    return Response.json(
      { success: true, data: { id: 8, userName: input.userName } },
      { status: 201 }
    );
  };
  assert.equal((await authService.register(input)).userName, input.userName);
});

function browser() {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    value: {
      sessionStorage: {
        getItem: (key: string) => values.get(key) ?? null,
        setItem: (key: string, value: string) => values.set(key, value),
        removeItem: (key: string) => values.delete(key)
      }
    }
  });
  return values;
}

afterEach(() => {
  clearSession();
  globalThis.fetch = originalFetch;
  if (originalWindow) Object.defineProperty(globalThis, 'window', originalWindow);
  else Reflect.deleteProperty(globalThis, 'window');
});

test('multipart contains the agreed JSON part and real file bytes without client actor identity', async () => {
  const file = new File(['%PDF-1.4'], 'license.pdf', { type: 'application/pdf' });
  const payload = applicationPayload(
    {
      legalName: 'Example',
      businessType: 'LIMITED_LIABILITY',
      taxId: 'TAX-123',
      representativeName: 'Representative',
      address: 'Address',
      contactPhone: '+84901234567',
      contactEmail: 'contact@example.com'
    },
    file
  );
  const details = payload.get('application') as Blob;
  assert.equal(details.type, 'application/json');
  const json = JSON.parse(await details.text());
  assert.equal(json.businessType, 'LIMITED_LIABILITY');
  assert.equal('userId' in json, false);
  assert.equal(await (payload.get('businessLicense') as File).text(), '%PDF-1.4');
});

test('Spring base URL overrides mock prefix and multipart boundary is left to fetch', async () => {
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    assert.equal(url, 'http://spring.test/api/organizer/applications');
    assert.equal(options?.method, 'POST');
    assert.equal((options.headers as Record<string, string>)['Content-Type'], undefined);
    assert.ok(options && options.body instanceof FormData);
    return Response.json(
      { success: true, statusCode: 201, data: { id: 7, status: 'PENDING_REVIEW' } },
      { status: 201 }
    );
  };
  const result = await request<{ id: number }>('/organizer/applications', 'POST', new FormData(), {
    baseUrl: 'http://spring.test/api'
  });
  assert.equal(result.id, 7);
});

test('Spring errors map to field errors with original HTTP status', async () => {
  globalThis.fetch = async () =>
    Response.json(
      {
        success: false,
        statusCode: 400,
        message: 'Invalid email',
        errors: { contactEmail: 'Invalid email' }
      },
      { status: 400 }
    );
  await assert.rejects(
    request('/organizer/applications', 'POST', {}, { baseUrl: 'http://spring.test/api' }),
    (error: unknown) => {
      assert.ok(error instanceof ApiError);
      assert.equal(error.status, 400);
      assert.deepEqual(error.validationErrors, { contactEmail: 'Invalid email' });
      return true;
    }
  );
});

test('login uses the shared upstream auth store and authenticates /me', async () => {
  browser();
  const user = {
    id: 7,
    fullName: 'Applicant',
    email: 'applicant@example.com',
    role: 'USER',
    status: 'ACTIVE',
    verified: true
  };
  globalThis.fetch = async (url, options) => {
    assert.ok(options);
    if (String(url).endsWith('/login')) {
      assert.deepEqual(JSON.parse(options?.body as string), {
        username: 'applicant@example.com',
        password: 'test-password'
      });
      return Response.json({
        success: true,
        data: {
          accessToken: 'test-token',
          tokenType: 'Bearer',
          expiresAt: '2999-01-01T00:00:00Z',
          user
        }
      });
    }
    assert.equal(url, '/api/auth/me');
    assert.equal((options.headers as Record<string, string>).Authorization, 'Bearer test-token');
    return Response.json({ success: true, data: user });
  };
  assert.equal((await signIn('applicant@example.com', 'test-password', true)).id, 7);
  assert.equal((await currentUser()).role, 'USER');
  assert.equal(useAuthStore.getState().accessToken, 'test-token');
  assert.equal(useAuthStore.getState().isAuthenticated, true);
  assert.equal(JSON.stringify(useAuthStore.getState()).includes('test-password'), false);
});

test('401 clears the session and subsequent authenticated calls do not reach the server', async () => {
  browser();
  globalThis.fetch = async () =>
    Response.json({
      success: true,
      data: { accessToken: 'test-token', expiresAt: '2999-01-01T00:00:00Z', user: {} }
    });
  await signIn('applicant', 'test-password', true);
  let calls = 0;
  globalThis.fetch = async () => {
    calls++;
    return Response.json({ message: 'Expired' }, { status: 401 });
  };
  await assert.rejects(
    currentUser(),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
  await assert.rejects(
    currentUser(),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
  assert.equal(calls, 1);
});

test('SSR cannot consume browser credentials or start a browser login', async () => {
  Reflect.deleteProperty(globalThis, 'window');
  globalThis.fetch = async () => {
    throw new Error('Unexpected network call');
  };
  await assert.rejects(
    backendRequest('/auth/me', 'GET'),
    (error: unknown) => error instanceof ApiError && error.status === 401
  );
  await assert.rejects(signIn('user', 'test-password', false), /browser session/);
});
