import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ApiError as IApiError } from '../../src/lib/api-client.ts';

// Configure isolated test runtime directory to prevent mutating working mock data
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-client-test-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { apiClient, ApiError, setAuthHeaderProvider } = await import('../../src/lib/api-client.ts');

const TEST_PORT = 4098;

async function runClientTests() {
  console.log('🧪 Starting NexSpace Frontend apiClient Integration Tests...\n');

  let server: http.Server | null = null;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ''}`);
      failed++;
    }
  }

  // Set internal API URL for SSR/Node test environment
  process.env.INTERNAL_API_URL = `http://localhost:${TEST_PORT}/api/v1`;

  try {
    server = await startServer(TEST_PORT);
    assert(server !== null, 'Server started on test port 4098');

    // 1. apiClient.get on health
    console.log('\n--- Client Test 1: GET /health via apiClient ---');
    const health = await apiClient.get<any>('/health');
    assert(health?.status === 'UP', 'apiClient unwraps envelope and returns health status UP');

    // 2. apiClient.get on demo users with query parameters
    console.log('\n--- Client Test 2: GET /demo/users with Query Params ---');
    const usersPage = await apiClient.get<any>('/demo/users', {
      params: { search: 'Alex', role: 'Customer' }
    });
    assert(usersPage?.content !== undefined, 'apiClient successfully queries with search and role params');
    assert(usersPage?.content?.length >= 1, 'Found matching customer user');
    assert(usersPage?.content[0]?.name.includes('Alex'), 'User name matches query');

    // 3. apiClient.post creating user
    console.log('\n--- Client Test 3: POST /demo/users via apiClient ---');
    const newUser = await apiClient.post<any>('/demo/users', {
      name: 'Client Test Engineer',
      email: 'client.test@nexspace.vn',
      role: 'Organizer',
      status: 'Active',
      company: 'Frontend Platform'
    });
    assert(newUser?.id !== undefined, `Created user through apiClient: ${newUser?.id}`);
    assert(newUser?.company === 'Frontend Platform', 'Company matches');

    // 4. apiClient.patch updating user
    console.log('\n--- Client Test 4: PATCH /demo/users/:id via apiClient ---');
    const updatedUser = await apiClient.patch<any>(`/demo/users/${newUser.id}`, {
      status: 'Locked',
      company: 'Frontend Platform Core'
    });
    assert(updatedUser?.status === 'Locked', 'Updated status to Locked via apiClient');
    assert(updatedUser?.company === 'Frontend Platform Core', 'Updated company via apiClient');

    // 5. apiClient error handling with typed ApiError
    console.log('\n--- Client Test 5: Error Handling with ApiError ---');
    let caughtError: IApiError | null = null;
    try {
      await apiClient.post('/demo/users', { name: '', email: 'invalid' });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        caughtError = err;
      }
    }
    assert(caughtError !== null, 'apiClient throws ApiError on 400 Bad Request');
    assert(caughtError?.status === 400, 'ApiError status is 400');
    assert(caughtError?.validationErrors?.name !== undefined, 'ApiError contains validationErrors.name');
    assert(caughtError?.validationErrors?.email !== undefined, 'ApiError contains validationErrors.email');

    // 6. Admin Users List via apiClient
    console.log('\n--- Client Test 6: GET /admin/users via apiClient ---');
    const adminPage = await apiClient.get<any>('/admin/users', {
      params: { role: 'Customer' }
    });
    assert(Array.isArray(adminPage?.content), 'Returns content array for admin users query');
    assert(adminPage?.content?.every((u: any) => u.role === 'Customer'), 'Filtered to Customer role');

    // 7. Admin User Status Patch via apiClient
    console.log('\n--- Client Test 7: PATCH /admin/users/:id/status via apiClient ---');
    const lockedAdminUser = await apiClient.patch<any>('/admin/users/USR-8821/status', {
      status: 'Locked',
      reason: 'Automated apiClient verification'
    });
    assert(lockedAdminUser?.status === 'Locked', 'apiClient successfully patched status to Locked');
    assert(lockedAdminUser?.activityLogs?.[0]?.title === 'Account Locked by Administrator', 'Audit log reflected in response');

    // 8. Auth header provider integration
    console.log('\n--- Client Test 8: Auth Header Injection Integration ---');
    setAuthHeaderProvider(() => 'Bearer mock_session_jwt_token_xyz');
    const healthWithAuth = await apiClient.get<any>('/health');
    assert(healthWithAuth?.status === 'UP', 'Auth header provider injects token without breaking transport');
    setAuthHeaderProvider(null);

    // 9. Admin Role Permissions via apiClient
    console.log('\n--- Client Test 9: GET /admin/roles/permissions via apiClient ---');
    const rolesPermissions = await apiClient.get<any[]>('/admin/roles/permissions');
    assert(Array.isArray(rolesPermissions), 'apiClient unwraps envelope and returns permissions array');
    assert(rolesPermissions.length === 11, `Found 11 permissions via apiClient (got ${rolesPermissions.length})`);

    // 10. Admin Role KPIs via apiClient (Dynamically calculated reflecting user creation in Test 3)
    console.log('\n--- Client Test 10: GET /admin/roles/kpis via apiClient ---');
    const roleKpis = await apiClient.get<any[]>('/admin/roles/kpis');
    assert(Array.isArray(roleKpis) && roleKpis.length === 4, 'apiClient successfully queries role KPIs');
    const totalKpi = roleKpis.find((k: any) => k.id === 'total-accounts');
    assert(totalKpi?.value === '11', 'apiClient dynamically reflects updated Total Accounts (11 after Test 3 user creation)');
    const orgKpi = roleKpis.find((k: any) => k.id === 'space-organizers');
    assert(orgKpi?.value === '4', 'apiClient dynamically reflects updated Organizers (4 after Test 3 organizer creation)');
    const custKpi = roleKpis.find((k: any) => k.id === 'customers');
    assert(custKpi?.value === '6', 'apiClient receives dynamically calculated Customers (6)');

    // 11. Admin Role Permissions PUT via apiClient
    console.log('\n--- Client Test 11: PUT /admin/roles/permissions via apiClient ---');
    const updatedPerms = await apiClient.put<any[]>('/admin/roles/permissions', {
      permissions: [{ key: 'booking:cancel', customer: false }]
    });
    const cancelPerm = updatedPerms.find((p: any) => p.key === 'booking:cancel');
    assert(cancelPerm?.customer === false, 'booking:cancel customer updated to false via apiClient');

    // 12. Admin Role Permissions Error Handling with ApiError
    console.log('\n--- Client Test 12: ApiError on invalid role property ---');
    let roleError: IApiError | null = null;
    try {
      await apiClient.put('/admin/roles/permissions', {
        permissions: [{ key: 'workspace:publish', invalidRole: true }]
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        roleError = err;
      }
    }
    assert(roleError !== null, 'Throws ApiError on invalid role property');
    assert(roleError?.status === 400, 'Status is 400 Bad Request');

    // 13. Governance validation via apiClient (Customer create_draft invariant)
    console.log('\n--- Client Test 13: ApiError on tenant role invariant violation ---');
    let governanceError: IApiError | null = null;
    try {
      await apiClient.put('/admin/roles/permissions', {
        permissions: [{ key: 'workspace:create_draft', customer: true }]
      });
    } catch (err: unknown) {
      if (err instanceof ApiError) {
        governanceError = err;
      }
    }
    assert(governanceError !== null, 'Throws ApiError when granting Customer workspace:create_draft');
    assert(governanceError?.status === 400, 'Governance violation status is 400 Bad Request');
    assert(
      Boolean(governanceError?.validationErrors?.['permissions[0].customer']?.includes('tenant role segregation')),
      'Validation message includes tenant role segregation rationale'
    );

    // 14. Cleanup reset
    console.log('\n--- Client Test 14: Reset via apiClient ---');
    const resetResult = await apiClient.post<any>('/dev/reset');
    assert(resetResult?.restoredFiles?.length > 0, 'Reset succeeded via apiClient');

    console.log('\n=========================================================');
    console.log(`📊 Client Integration Results: ${passed} Passed, ${failed} Failed`);
    console.log('=========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error('💥 Client integration tests failed:', err);
    process.exit(1);
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    try {
      if (fs.existsSync(ISOLATED_TEST_RUNTIME)) {
        await fs.promises.rm(ISOLATED_TEST_RUNTIME, { recursive: true, force: true });
      }
    } catch {
      // ignore
    }
  }
}

runClientTests();
