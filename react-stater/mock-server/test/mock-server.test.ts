import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configure isolated test runtime directory to prevent mutating working mock data
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-mock-test-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { storage } = await import('../storage.ts');

const TEST_PORT = 4099;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

async function httpFetch(url: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}): Promise<{ status: number; data: any; headers: Headers }> {
  const fetchOptions = { ...options };
  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    fetchOptions.headers = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers
    };
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }
  const res = await fetch(url, fetchOptions);
  let data: any = null;
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }
  return { status: res.status, data, headers: res.headers };
}

async function runTestSuite() {
  console.log('🧪 Starting NexSpace Mock Server Automated Verification Suite...\n');

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

  try {
    // 1. Start Mock Server
    console.log('--- Test 1: Start Mock Server on Test Port ---');
    server = await startServer(TEST_PORT);
    assert(server !== null, 'Server started successfully on test port');

    // 2. Health Check
    console.log('\n--- Test 2: Health Check Endpoint ---');
    const healthRes = await httpFetch(`${BASE_URL}/health`);
    assert(healthRes.status === 200, 'Health check returns 200 OK');
    assert(healthRes.data?.data?.status === 'UP', 'Health check reports status UP');
    assert(typeof healthRes.data?.data?.uptimeSeconds === 'number', 'Uptime is reported');

    // 3. Initial Reset to clean state
    console.log('\n--- Test 3: Reset to Seed Fixtures ---');
    const resetRes = await httpFetch(`${BASE_URL}/dev/reset`, { method: 'POST' });
    assert(resetRes.status === 200, 'Reset returns 200 OK');
    assert(resetRes.data?.success === true, 'Reset succeeds');

    // 4. GET Initial Users
    console.log('\n--- Test 4: GET Initial Demo Users ---');
    const listRes = await httpFetch(`${BASE_URL}/demo/users`);
    assert(listRes.status === 200, 'GET /demo/users returns 200');
    assert(Array.isArray(listRes.data?.data?.content), 'Returns content array');
    const initialCount = listRes.data?.data?.content?.length;
    assert(initialCount === 10, `Initial seed contains 10 users (got ${initialCount})`);
    assert(listRes.data?.data?.content[0]?.id === 'USR-8821', 'Preserves stable ID USR-8821');

    // 5. Validation Failure on POST
    console.log('\n--- Test 5: Validation Handling on Invalid POST ---');
    const invalidPostRes = await httpFetch(`${BASE_URL}/demo/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: '', email: 'not-an-email', role: 'SuperUser' })
    });
    assert(invalidPostRes.status === 400, 'Invalid user creation returns 400 Bad Request');
    assert(invalidPostRes.data?.validationErrors?.name !== undefined, 'Reports name validation error');
    assert(invalidPostRes.data?.validationErrors?.email !== undefined, 'Reports email validation error');
    assert(invalidPostRes.data?.validationErrors?.role !== undefined, 'Reports role validation error');

    // 6. Valid POST New Record
    console.log('\n--- Test 6: POST New Valid Record & Persistence Check ---');
    const validUserPayload = {
      name: 'Verification Bot Alpha',
      email: 'bot.alpha@nexspace.vn',
      role: 'Administrator',
      status: 'Active',
      company: 'NexSpace Security Lab',
      phone: '+84 901 999 888'
    };
    const createRes = await httpFetch(`${BASE_URL}/demo/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validUserPayload)
    });
    assert(createRes.status === 201, 'POST /demo/users returns 201 Created');
    const createdUser = createRes.data?.data;
    assert(createdUser?.id !== undefined, `Created user assigned stable ID: ${createdUser?.id}`);
    assert(createdUser?.name === 'Verification Bot Alpha', 'Created user name matches');

    // Verify runtime JSON file on disk immediately changed
    const runtimeUsers = await storage.getAll<any>('users');
    const diskUser = runtimeUsers.find((u: any) => u.id === createdUser.id);
    assert(diskUser !== undefined, 'Created user immediately present in runtime JSON file on disk');
    assert(diskUser?.email === 'bot.alpha@nexspace.vn', 'Disk user email matches payload');

    // 7. PATCH Existing Record
    console.log('\n--- Test 7: PATCH Record & Verify Update ---');
    const patchRes = await httpFetch(`${BASE_URL}/demo/users/${createdUser.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'Locked', company: 'SecOps Audit Team' })
    });
    assert(patchRes.status === 200, 'PATCH returns 200 OK');
    assert(patchRes.data?.data?.status === 'Locked', 'User status updated to Locked');
    assert(patchRes.data?.data?.company === 'SecOps Audit Team', 'User company updated');

    // Verify GET reflects update
    const getUpdatedRes = await httpFetch(`${BASE_URL}/demo/users/${createdUser.id}`);
    assert(getUpdatedRes.status === 200, 'GET /demo/users/:id returns 200');
    assert(getUpdatedRes.data?.data?.status === 'Locked', 'GET verifies status is Locked');

    // 8. Concurrent Mutations Test
    console.log('\n--- Test 8: Concurrent Mutex / Lock Serialization ---');
    const concurrentUpdates = ['Active', 'Locked', 'Active', 'Locked', 'Active'].map((status, index) =>
      httpFetch(`${BASE_URL}/demo/users/${createdUser.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          company: `Concurrent Update Stage ${index + 1}`
        })
      })
    );
    const concurrentResults = await Promise.all(concurrentUpdates);
    const allSuccessful = concurrentResults.every((r) => r.status === 200);
    assert(allSuccessful, 'All 5 concurrent updates completed successfully without deadlock or lost update');

    // 9. Server Restart Persistence Verification
    console.log('\n--- Test 9: Server Restart & Persistence Across Process Boundary ---');
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    console.log('  💤 Server stopped.');

    // Restart server on same test port
    server = await startServer(TEST_PORT);
    console.log('  ⚡ Server restarted.');

    const postRestartRes = await httpFetch(`${BASE_URL}/demo/users/${createdUser.id}`);
    assert(postRestartRes.status === 200, 'Record retrieved after full server restart');
    assert(postRestartRes.data?.data?.id === createdUser.id, 'Record ID survived server restart');
    assert(postRestartRes.data?.data?.email === 'bot.alpha@nexspace.vn', 'Record data intact after restart');

    // 10. Explicit Reset-to-Seed Restores Baseline
    console.log('\n--- Test 10: Explicit Reset-to-Seed Restores Baseline ---');
    const finalResetRes = await httpFetch(`${BASE_URL}/dev/reset`, { method: 'POST' });
    assert(finalResetRes.status === 200, 'Reset-to-seed executed');

    // Verify created user is now gone and original count restored
    const afterResetList = await httpFetch(`${BASE_URL}/demo/users`);
    assert(afterResetList.data?.data?.content?.length === 10, 'User list returned to exact baseline count of 10');
    const wipedUser = await httpFetch(`${BASE_URL}/demo/users/${createdUser.id}`);
    assert(wipedUser.status === 404, 'Created test user no longer exists after reset');

    // 11. Admin Users List (A03): GET /api/v1/admin/users
    console.log('\n--- Test 11: GET /admin/users with Filters ---');
    const adminListRes = await httpFetch(`${BASE_URL}/admin/users`);
    assert(adminListRes.status === 200, 'GET /admin/users returns 200');
    assert(adminListRes.data?.data?.content?.length === 10, 'Initial admin user count is 10');

    // Filter by role=Organizer
    const organizerListRes = await httpFetch(`${BASE_URL}/admin/users?role=Organizer`);
    assert(organizerListRes.status === 200, 'Filter by role returns 200');
    assert(
      organizerListRes.data?.data?.content?.every((u: any) => u.role === 'Organizer'),
      'All returned users have role Organizer'
    );

    // Filter by search=Alex
    const searchRes = await httpFetch(`${BASE_URL}/admin/users?search=Alex`);
    assert(searchRes.status === 200, 'Search by name returns 200');
    assert(searchRes.data?.data?.content?.length >= 1, 'Found at least 1 record for Alex');
    assert(searchRes.data?.data?.content[0]?.id === 'USR-8821', 'Found USR-8821 for Alex');

    // 12. Admin User Details: GET /api/v1/admin/users/:id
    console.log('\n--- Test 12: GET /admin/users/:id ---');
    const adminUserRes = await httpFetch(`${BASE_URL}/admin/users/USR-8821`);
    assert(adminUserRes.status === 200, 'GET /admin/users/USR-8821 returns 200');
    assert(adminUserRes.data?.data?.name === 'Alex Nguyen', 'User name is Alex Nguyen');
    assert(adminUserRes.data?.data?.status === 'Active', 'Initial status is Active');

    // Unknown ID returns 404
    const notFoundRes = await httpFetch(`${BASE_URL}/admin/users/USR-UNKNOWN-9999`);
    assert(notFoundRes.status === 404, 'Non-existent ID returns 404 Not Found');

    // 13. Admin Lock User: PATCH /api/v1/admin/users/:id/status
    console.log('\n--- Test 13: PATCH /admin/users/:id/status (Lock User) ---');
    const lockRes = await httpFetch(`${BASE_URL}/admin/users/USR-8821/status`, {
      method: 'PATCH',
      body: { status: 'Locked', reason: 'Audit investigation required' }
    });
    assert(lockRes.status === 200, 'Lock user status returns 200 OK');
    assert(lockRes.data?.data?.status === 'Locked', 'Response reflects updated status Locked');
    assert(
      lockRes.data?.data?.activityLogs?.[0]?.title === 'Account Locked by Administrator',
      'Audit log recorded Account Locked by Administrator'
    );

    // Verify on disk in runtime JSON
    const diskUsers = await storage.getAll<any>('users');
    const diskLockedUser = diskUsers.find((u: any) => u.id === 'USR-8821');
    assert(diskLockedUser?.status === 'Locked', 'Disk runtime JSON contains updated Locked status');

    // 14. Validation Rejection on Invalid Status
    console.log('\n--- Test 14: Validation Handling on Invalid Status ---');
    const invalidStatusRes = await httpFetch(`${BASE_URL}/admin/users/USR-8821/status`, {
      method: 'PATCH',
      body: { status: 'BannedInvalid' }
    });
    assert(invalidStatusRes.status === 400, 'Invalid status returns 400 Bad Request');
    assert(invalidStatusRes.data?.validationErrors?.status !== undefined, 'Returns status validation error');

    // 15. Admin Unlock User: PATCH /api/v1/admin/users/:id/status
    console.log('\n--- Test 15: PATCH /admin/users/:id/status (Unlock User) ---');
    const unlockRes = await httpFetch(`${BASE_URL}/admin/users/USR-8821/status`, {
      method: 'PATCH',
      body: { status: 'Active', reason: 'Investigation cleared' }
    });
    assert(unlockRes.status === 200, 'Unlock user returns 200 OK');
    assert(unlockRes.data?.data?.status === 'Active', 'Status returned to Active');

    // 16. Admin Role Permissions: GET /admin/roles/permissions
    console.log('\n--- Test 16: GET /admin/roles/permissions ---');
    const permRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`);
    assert(permRes.status === 200, 'GET /admin/roles/permissions returns 200');
    assert(Array.isArray(permRes.data?.data), 'Returns permissions array');
    assert(permRes.data?.data?.length === 11, `Contains exactly 11 permissions (got ${permRes.data?.data?.length})`);
    const createDraftInitial = permRes.data?.data?.find((p: any) => p.key === 'workspace:create_draft');
    assert(createDraftInitial?.customer === false, 'workspace:create_draft initially customer=false');
    assert(createDraftInitial?.administrator === true, 'workspace:create_draft administrator=true');

    // 17. Admin Role KPIs: GET /admin/roles/kpis (Dynamically calculated from users.json)
    console.log('\n--- Test 17: GET /admin/roles/kpis (Dynamic Calculation from users.json) ---');
    const kpiRes = await httpFetch(`${BASE_URL}/admin/roles/kpis`);
    assert(kpiRes.status === 200, 'GET /admin/roles/kpis returns 200');
    assert(Array.isArray(kpiRes.data?.data), 'Returns KPIs array');
    assert(kpiRes.data?.data?.length === 4, 'Returns 4 role KPI items');

    const totalAccountsKpi = kpiRes.data?.data?.find((k: any) => k.id === 'total-accounts');
    assert(totalAccountsKpi?.value === '10', 'Total Accounts KPI matches 10 users in seed users.json');
    const customersKpi = kpiRes.data?.data?.find((k: any) => k.id === 'customers');
    assert(customersKpi?.value === '6', 'Customers KPI matches 6 customer users in seed users.json');
    assert(customersKpi?.badge === '60.0%', 'Customers badge is 60.0%');
    const organizersKpi = kpiRes.data?.data?.find((k: any) => k.id === 'space-organizers');
    assert(organizersKpi?.value === '3', 'Organizers KPI matches 3 organizer users in seed users.json');
    const adminsKpi = kpiRes.data?.data?.find((k: any) => k.id === 'administrators');
    assert(adminsKpi?.value === '1', 'Administrators KPI matches 1 administrator in seed users.json');
    assert(adminsKpi?.badge === 'MFA 100%', 'Administrators badge is MFA 100%');

    // 18. Admin Role Permissions: PUT /admin/roles/permissions (Valid Update)
    console.log('\n--- Test 18: PUT /admin/roles/permissions (Valid Update & Disk Verification) ---');
    const updatePermRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`, {
      method: 'PUT',
      body: {
        permissions: [
          {
            key: 'booking:cancel',
            customer: false,
            organizer: true
          },
          {
            key: 'workspace:publish',
            organizer: false
          }
        ]
      }
    });
    assert(updatePermRes.status === 200, 'PUT /admin/roles/permissions returns 200 OK');
    assert(updatePermRes.data?.success === true, 'Returns success=true');
    const updatedCancel = updatePermRes.data?.data?.find((p: { key: string; customer?: boolean; administrator?: boolean }) => p.key === 'booking:cancel');
    assert(updatedCancel?.customer === false, 'Updated permission reflects customer=false');
    assert(updatedCancel?.administrator === true, 'Administrator permission remains locked to true');

    // Verify disk runtime JSON reflects changes
    const diskRolesPath = storage.getRuntimeFilePath('roles');
    const diskRoles = JSON.parse(await fs.promises.readFile(diskRolesPath, 'utf8'));
    const diskCancel = diskRoles.find((p: { key: string; customer?: boolean }) => p.key === 'booking:cancel');
    assert(diskCancel?.customer === false, 'Disk runtime JSON contains updated customer=false');

    // Verify unrelated permissions are preserved
    const diskDraft = diskRoles.find((p: { key: string; customer?: boolean; organizer?: boolean }) => p.key === 'workspace:create_draft');
    assert(diskDraft?.customer === false, 'Unrelated workspace:create_draft customer=false preserved');
    assert(diskDraft?.organizer === true, 'Unrelated workspace:create_draft organizer=true preserved');

    // 19. Reject Unknown Permission Key
    console.log('\n--- Test 19: Reject Unknown Permission Key ---');
    const unknownPermRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`, {
      method: 'PUT',
      body: {
        permissions: [
          {
            key: 'unknown:invalid_permission',
            customer: true
          }
        ]
      }
    });
    assert(unknownPermRes.status === 400, 'Unknown permission key returns 400 Bad Request');
    assert(unknownPermRes.data?.validationErrors?.['permissions[0].key'] !== undefined, 'Reports validation error for unknown key');

    // 20. Reject Unknown Role Property
    console.log('\n--- Test 20: Reject Unknown Role Property ---');
    const unknownRoleRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`, {
      method: 'PUT',
      body: {
        permissions: [
          {
            key: 'booking:cancel',
            superadmin: true
          }
        ]
      }
    });
    assert(unknownRoleRes.status === 400, 'Unknown role property returns 400 Bad Request');
    assert(unknownRoleRes.data?.validationErrors?.['permissions[0].superadmin'] !== undefined, 'Reports validation error for unknown role');

    // 21. Root Policy Restriction: Reject Revoking Administrator Role
    console.log('\n--- Test 21: Root Policy Restriction (Administrator Locked) ---');
    const revokeAdminRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`, {
      method: 'PUT',
      body: {
        permissions: [
          {
            key: 'booking:cancel',
            administrator: false
          }
        ]
      }
    });
    assert(revokeAdminRes.status === 400, 'Revoking administrator permission returns 400 Bad Request');
    assert(
      revokeAdminRes.data?.validationErrors?.['permissions[0].administrator']?.includes('platform root policy'),
      'Error message mentions platform root policy enforcement'
    );

    // 22. PATCH Single Role Permission by Key
    console.log('\n--- Test 22: PATCH /admin/roles/permissions/:key ---');
    const patchKeyRes = await httpFetch(`${BASE_URL}/admin/roles/permissions/review:dispute_flag`, {
      method: 'PATCH',
      body: { customer: false }
    });
    assert(patchKeyRes.status === 200, 'PATCH single permission returns 200 OK');
    const patchedReview = patchKeyRes.data?.data?.find((p: { key: string; customer?: boolean }) => p.key === 'review:dispute_flag');
    assert(patchedReview?.customer === false, 'review:dispute_flag customer updated to false');

    // 23. Server Restart Persistence Verification for Role Permissions
    console.log('\n--- Test 23: Role Permission Persistence Across Server Restart ---');
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = await startServer(TEST_PORT);
    const postRestartPermRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`);
    assert(postRestartPermRes.status === 200, 'GET /admin/roles/permissions returns 200 after restart');
    const postRestartCancel = postRestartPermRes.data?.data?.find((p: { key: string; customer?: boolean }) => p.key === 'booking:cancel');
    assert(postRestartCancel?.customer === false, 'booking:cancel customer=false persisted across server restart');
    const postRestartReview = postRestartPermRes.data?.data?.find((p: { key: string; customer?: boolean }) => p.key === 'review:dispute_flag');
    assert(postRestartReview?.customer === false, 'review:dispute_flag customer=false persisted across server restart');

    // 24. Governance Invariant Rejection: Customer Role Boundaries
    console.log('\n--- Test 24: Permission Governance - Reject Customer Invariant Violations ---');
    const customerDraftViolationRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`, {
      method: 'PUT',
      body: {
        permissions: [{ key: 'workspace:create_draft', customer: true }]
      }
    });
    assert(customerDraftViolationRes.status === 400, 'Attempting to grant Customer workspace:create_draft returns 400 Bad Request');
    assert(
      customerDraftViolationRes.data?.validationErrors?.['permissions[0].customer']?.includes('tenant role segregation'),
      'Validation error explains tenant role segregation forbids customers from creating draft workspaces'
    );

    const customerPayoutViolationRes = await httpFetch(`${BASE_URL}/admin/roles/permissions`, {
      method: 'PUT',
      body: {
        permissions: [{ key: 'financial:payout_request', customer: true }]
      }
    });
    assert(customerPayoutViolationRes.status === 400, 'Attempting to grant Customer financial:payout_request returns 400 Bad Request');
    assert(
      customerPayoutViolationRes.data?.validationErrors?.['permissions[0].customer']?.includes('PayOS bank payouts'),
      'Validation error explains PayOS payouts are restricted to verified space organizers'
    );

    // 25. Governance Invariant Rejection: Organizer Role Boundaries
    console.log('\n--- Test 25: Permission Governance - Reject Organizer Invariant Violations ---');
    const organizerBookingViolationRes = await httpFetch(`${BASE_URL}/admin/roles/permissions/booking:create`, {
      method: 'PATCH',
      body: { organizer: true }
    });
    assert(organizerBookingViolationRes.status === 400, 'Attempting to grant Organizer booking:create returns 400 Bad Request');
    assert(
      organizerBookingViolationRes.data?.validationErrors?.['permissions[0].organizer']?.includes('organizers operate venues'),
      'Validation error explains organizers do not initiate client reservations'
    );

    const organizerBanViolationRes = await httpFetch(`${BASE_URL}/admin/roles/permissions/moderation:ban_user`, {
      method: 'PATCH',
      body: { organizer: true }
    });
    assert(organizerBanViolationRes.status === 400, 'Attempting to grant Organizer moderation:ban_user returns 400 Bad Request');
    assert(
      organizerBanViolationRes.data?.validationErrors?.['permissions[0].organizer']?.includes('SecOps administrators'),
      'Validation error explains user suspension is restricted to root SecOps administrators'
    );

    // 26. Production Security Boundary Guards (NODE_ENV=production)
    console.log('\n--- Test 26: Production Security Boundary Guards ---');
    const previousNodeEnv = process.env.NODE_ENV;
    try {
      process.env.NODE_ENV = 'production';

      const prodResetRes = await httpFetch(`${BASE_URL}/dev/reset`, { method: 'POST' });
      assert(prodResetRes.status === 403, 'POST /dev/reset returns 403 Forbidden in production');
      assert(prodResetRes.data?.error === 'Forbidden', 'Error code is Forbidden');

      const prodDemoUsersRes = await httpFetch(`${BASE_URL}/demo/users`);
      assert(prodDemoUsersRes.status === 403, 'GET /demo/users returns 403 Forbidden in production');
      assert(prodDemoUsersRes.data?.error === 'Forbidden', 'Demo endpoints are blocked in production');
    } finally {
      process.env.NODE_ENV = previousNodeEnv;
    }

    // Reset back to clean seed state
    await httpFetch(`${BASE_URL}/dev/reset`, { method: 'POST' });

    console.log('\n=========================================================');
    console.log(`📊 Test Results: ${passed} Passed, ${failed} Failed`);
    console.log('=========================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err: unknown) {
    console.error('💥 Test suite encountered fatal error:', err);
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

runTestSuite();
