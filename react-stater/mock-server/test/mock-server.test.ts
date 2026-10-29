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

    // 27. Workspaces List & Pagination
    console.log('\n--- Test 27: GET /workspaces (List & Pagination) ---');
    const wsListRes = await httpFetch(`${BASE_URL}/workspaces?page=1&limit=5`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(wsListRes.status === 200, 'GET /workspaces returns 200 OK');
    assert(Array.isArray(wsListRes.data?.data?.content), 'Returns content array');
    assert(wsListRes.data?.data?.content.length === 5, 'Page limit of 5 respected');
    assert(wsListRes.data?.data?.pagination?.totalElements >= 8, 'Total elements matches seed count (at least 8)');
    assert(wsListRes.data?.data?.pagination?.totalPages >= 2, 'Total pages calculated correctly');

    // 28. Public Marketplace Visibility Rules (isPublic=true)
    console.log('\n--- Test 28: GET /workspaces?isPublic=true (Public Visibility Gate) ---');
    const publicWsRes = await httpFetch(`${BASE_URL}/workspaces?isPublic=true`);
    assert(publicWsRes.status === 200, 'GET /workspaces?isPublic=true returns 200 OK');
    const publicWorkspaces = publicWsRes.data?.data?.content || [];
    assert(publicWorkspaces.length > 0, 'Returns public workspaces');
    for (const ws of publicWorkspaces) {
      assert(ws.organizerTaxId === undefined, `Workspace ${ws.id} organizerTaxId must be stripped for public`);
      assert(ws.reviewedBy === undefined, `Workspace ${ws.id} reviewedBy must be stripped for public`);
      assert(ws.grossRevenueMtd === undefined, `Workspace ${ws.id} grossRevenueMtd must be stripped for public`);
    }
    const hasSuspended = publicWorkspaces.some((w: any) => w.id === 'WS-120');
    assert(!hasSuspended, 'Suspended workspace WS-120 is excluded from public discovery');
    const hasDraft = publicWorkspaces.some((w: any) => w.id === 'WS-135');
    assert(!hasDraft, 'Draft workspace WS-135 is excluded from public discovery');
    const hasPending = publicWorkspaces.some((w: any) => w.id === 'WS-108');
    assert(!hasPending, 'Pending workspace WS-108 is excluded from public discovery');

    // 29. Workspace Filtering & Search (city, search query)
    console.log('\n--- Test 29: GET /workspaces Filtering & Search ---');
    const hanoiWsRes = await httpFetch(`${BASE_URL}/workspaces?city=Hanoi`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(hanoiWsRes.status === 200, 'Filter by city=Hanoi returns 200 OK');
    const hanoiWorkspaces = hanoiWsRes.data?.data?.content || [];
    assert(hanoiWorkspaces.length >= 2, 'Returns at least 2 Hanoi workspaces');
    assert(hanoiWorkspaces.every((w: any) => w.city === 'Hanoi'), 'All returned workspaces have city=Hanoi');

    const wsSearchRes = await httpFetch(`${BASE_URL}/workspaces?search=Saigon`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(wsSearchRes.status === 200, 'Search by keyword Saigon returns 200 OK');
    const searchWorkspaces = wsSearchRes.data?.data?.content || [];
    assert(searchWorkspaces.some((w: any) => w.id === 'WS-104'), 'Search results include WS-104 (NexSpace Saigon Prime Hub)');

    // 30. GET /workspaces/:id by Canonical ID
    console.log('\n--- Test 30: GET /workspaces/:id (Canonical ID) ---');
    const ws104Res = await httpFetch(`${BASE_URL}/workspaces/WS-104`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(ws104Res.status === 200, 'GET /workspaces/WS-104 returns 200 OK');
    assert(ws104Res.data?.data?.name === 'NexSpace Saigon Prime Hub', 'Name matches canonical seed');
    assert(ws104Res.data?.data?.organizerId === 'USR-9432', 'Organizer ID matches seeded Sarah Jenkins');
    assert(ws104Res.data?.data?.usableAreaSqm === 540, 'Usable area matches 540 sqm');

    // 31. Legacy ID & Alias Compatibility Resolution
    console.log('\n--- Test 31: Legacy ID & Alias Compatibility Resolution ---');
    const alias1Res = await httpFetch(`${BASE_URL}/workspaces/1`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(alias1Res.status === 200, 'GET /workspaces/1 resolves customer sample ID to 200 OK');
    assert(alias1Res.data?.data?.id === 'WS-101', 'Resolves ID 1 to 72 Le Thanh Ton (WS-101)');

    const alias2Res = await httpFetch(`${BASE_URL}/workspaces/2`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(alias2Res.status === 200, 'GET /workspaces/2 resolves customer sample ID to 200 OK');
    assert(alias2Res.data?.data?.id === 'WS-104', 'Resolves ID 2 to Bitexco Saigon Prime (WS-104)');

    const aliasSgPrimeRes = await httpFetch(`${BASE_URL}/workspaces/ws-sg-prime-01`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(aliasSgPrimeRes.status === 200, 'GET /workspaces/ws-sg-prime-01 resolves to 200 OK');
    assert(aliasSgPrimeRes.data?.data?.id === 'WS-104', 'Resolves ws-sg-prime-01 to Bitexco Saigon Prime (WS-104)');
    assert(aliasSgPrimeRes.data?.data?.name === 'NexSpace Saigon Prime Hub', 'Saigon Prime Hub name verified');

    const alias3Res = await httpFetch(`${BASE_URL}/workspaces/hive-central-hcm`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(alias3Res.status === 200, 'GET /workspaces/hive-central-hcm resolves landing ID to 200 OK');
    assert(alias3Res.data?.data?.id === 'WS-104', 'Resolves hive-central-hcm to canonical ID WS-104');

    const alias4Res = await httpFetch(`${BASE_URL}/workspaces/westlake-loft-hanoi`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(alias4Res.status === 200, 'GET /workspaces/westlake-loft-hanoi resolves landing ID to 200 OK');
    assert(alias4Res.data?.data?.id === 'WS-108', 'Resolves westlake-loft-hanoi to Tay Ho lab (WS-108)');

    const alias5Res = await httpFetch(`${BASE_URL}/workspaces/ba-dinh-boardroom-hanoi`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(alias5Res.status === 200, 'GET /workspaces/ba-dinh-boardroom-hanoi resolves landing ID to 200 OK');
    assert(alias5Res.data?.data?.id === 'WS-120', 'Resolves ba-dinh-boardroom-hanoi to Ba Dinh suites (WS-120)');

    // 32. Unknown Identifier Rejection
    console.log('\n--- Test 32: Unknown Workspace Identifier Rejection ---');
    const unknownWsRes = await httpFetch(`${BASE_URL}/workspaces/NON-EXISTENT-WS-9999`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    assert(unknownWsRes.status === 404, 'Unknown ID returns 404 Not Found');
    assert(unknownWsRes.data?.error === 'NotFound', 'Error type is NotFound');

    // 33. POST /workspaces Validation & Foreign Key Rejection
    console.log('\n--- Test 33: POST /workspaces Validation & Foreign Key Integrity ---');
    const invalidFkRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        name: 'Workspace With Invalid Organizer',
        category: 'coworking_hub',
        streetAddress: '123 Fake St',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        organizerId: 'USR-9999' // Non-existent user
      }
    });
    assert(invalidFkRes.status === 400 || invalidFkRes.status === 403, 'Rejects non-existent organizerId with 400 or 403');
    assert(Boolean(invalidFkRes.data?.validationErrors?.organizerId) || invalidFkRes.status === 403, 'Reports organizerId validation error or authorization rejection');

    const nonOrgFkRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        name: 'Workspace With Customer Owner',
        category: 'coworking_hub',
        streetAddress: '123 Fake St',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        organizerId: 'USR-8821' // Customer role, not Organizer
      }
    });
    assert(nonOrgFkRes.status === 400 || nonOrgFkRes.status === 403, 'Rejects customer role organizerId with 400 Bad Request or 403 Forbidden');

    // 34. POST /workspaces Valid Creation & Runtime JSON Persistence
    console.log('\n--- Test 34: POST /workspaces Valid Creation ---');
    const validCreateRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        name: 'Alpha Creative Lab Saigon',
        category: 'creative_studio',
        streetAddress: '15 Le Thanh Ton, District 1',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        organizerId: 'USR-9432',
        usableAreaSqm: 280,
        pricePerHour: 3.5,
        pricePerDay: 25.0
      }
    });
    assert(validCreateRes.status === 201, 'POST /workspaces returns 201 Created');
    const createdWs = validCreateRes.data?.data;
    assert(Boolean(createdWs?.id), 'Generated stable ID exists');
    assert(createdWs.reviewStatus === 'Draft', 'Default reviewStatus is Draft');
    assert(createdWs.operatingStatus === 'Inactive', 'Default operatingStatus is Inactive');
    assert(createdWs.isListingVisible === false, 'Default isListingVisible is false');
    assert(createdWs.version === 1, 'Initial version is 1');

    // Verify record in disk runtime JSON
    const runtimeWsData = await storage.getAll<any>('workspaces');
    const foundOnDisk = runtimeWsData.find((w: any) => w.id === createdWs.id);
    assert(Boolean(foundOnDisk), 'New workspace verified in disk runtime JSON store');
    assert(foundOnDisk.name === 'Alpha Creative Lab Saigon', 'Persisted name matches created name');

    // 35. PATCH /workspaces/:id Partial Update & Omitted Fields Preservation
    console.log('\n--- Test 35: PATCH /workspaces/:id Partial Update ---');
    const wsPatchRes = await httpFetch(`${BASE_URL}/workspaces/${createdWs.id}`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        shortDescription: 'Updated short description for Alpha Lab',
        usableAreaSqm: 320,
        pricePerHour: 4.0
      }
    });
    assert(wsPatchRes.status === 200, 'PATCH /workspaces/:id returns 200 OK');
    const patchedWs = wsPatchRes.data?.data;
    assert(patchedWs.shortDescription === 'Updated short description for Alpha Lab', 'Updated field applied');
    assert(patchedWs.usableAreaSqm === 320, 'Updated usableAreaSqm applied');
    assert(patchedWs.name === 'Alpha Creative Lab Saigon', 'Unspecified name remained unchanged');
    assert(patchedWs.streetAddress === '15 Le Thanh Ton, District 1', 'Unspecified streetAddress preserved');
    assert(patchedWs.version === 2, 'Version incremented to 2');

    // 36. Generic PATCH Allowlist Rejection of Privileged Fields
    console.log('\n--- Test 36: Generic PATCH Field Allowlist Rejection ---');
    const privPatchRes = await httpFetch(`${BASE_URL}/workspaces/${createdWs.id}`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        reviewStatus: 'Approved',
        organizerId: 'USR-2194',
        grossRevenueMtd: 50000,
        operatingStatus: 'Active',
        isLive: true,
        featuredPosition: 1,
        occupancyRate: 95
      }
    });
    assert(privPatchRes.status === 400, 'Rejects privileged fields in generic PATCH with 400 Bad Request');
    assert(Boolean(privPatchRes.data?.validationErrors?.reviewStatus), 'Rejects reviewStatus modification');
    assert(Boolean(privPatchRes.data?.validationErrors?.organizerId), 'Rejects organizerId modification');
    assert(Boolean(privPatchRes.data?.validationErrors?.grossRevenueMtd), 'Rejects grossRevenueMtd modification');
    assert(Boolean(privPatchRes.data?.validationErrors?.operatingStatus), 'Rejects operatingStatus modification');
    assert(Boolean(privPatchRes.data?.validationErrors?.isLive), 'Rejects isLive modification');
    assert(Boolean(privPatchRes.data?.validationErrors?.featuredPosition), 'Rejects featuredPosition modification');
    assert(Boolean(privPatchRes.data?.validationErrors?.occupancyRate), 'Rejects occupancyRate modification');

    // 37. Status Invariants Enforcement on Generic PATCH
    console.log('\n--- Test 37: Status Invariants Enforcement ---');
    const visibleDraftRes = await httpFetch(`${BASE_URL}/workspaces/${createdWs.id}`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        isListingVisible: true
      }
    });
    assert(visibleDraftRes.status === 400, 'Rejects making unapproved Draft workspace visible with 400 Bad Request');
    assert(visibleDraftRes.data?.error === 'IllegalStateTransition', 'Error type is IllegalStateTransition');

    const visibleSuspendedRes = await httpFetch(`${BASE_URL}/workspaces/WS-120`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-2194' },
      body: {
        isListingVisible: true
      }
    });
    assert(visibleSuspendedRes.status === 400, 'Rejects making suspended workspace visible with 400 Bad Request');

    // 37b. Dedicated Organizer Lifecycle Commands
    console.log('\n--- Test 37b: Dedicated Organizer Lifecycle Commands ---');
    // Test resume on Draft workspace WS-135 rejected
    const resumeDraftRes = await httpFetch(`${BASE_URL}/workspaces/WS-135/lifecycle`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: { action: 'resume' }
    });
    assert(resumeDraftRes.status === 400, 'Rejects resuming Draft workspace with 400 Bad Request');
    assert(resumeDraftRes.data?.error === 'IllegalStateTransition', 'Error is IllegalStateTransition');

    // Test lifecycle on Suspended workspace WS-120 rejected with 403 Forbidden
    const suspendedLifecycleRes = await httpFetch(`${BASE_URL}/workspaces/WS-120/lifecycle`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-2194' },
      body: { action: 'resume' }
    });
    assert(suspendedLifecycleRes.status === 403, 'Rejects resuming Suspended workspace with 403 Forbidden');
    assert(suspendedLifecycleRes.data?.error === 'ForbiddenOperation', 'Error is ForbiddenOperation');

    // Test pausing active workspace WS-104
    const getWs104Before = await httpFetch(`${BASE_URL}/workspaces/WS-104`, {
      headers: {
        'X-Mock-Role': 'Organizer',
        'X-Organizer-Id': 'USR-9432'
      }
    });
    const initialVersion = getWs104Before.data?.data?.version;
    const pauseWsRes = await httpFetch(`${BASE_URL}/workspaces/WS-104/lifecycle`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        action: 'pause',
        expectedVersion: initialVersion,
        reason: 'Scheduled holiday recess'
      }
    });
    assert(pauseWsRes.status === 200, 'PATCH /workspaces/WS-104/lifecycle (pause) returns 200 OK');
    assert(pauseWsRes.data?.data?.operatingStatus === 'Inactive', 'operatingStatus is Inactive');
    assert(pauseWsRes.data?.data?.isLive === false, 'isLive is false');
    assert(pauseWsRes.data?.data?.isListingVisible === false, 'isListingVisible is false');
    assert(pauseWsRes.data?.data?.version === initialVersion + 1, 'Version incremented sequentially');

    // Test stale version concurrency conflict on lifecycle endpoint
    const staleLifecycleRes = await httpFetch(`${BASE_URL}/workspaces/WS-104/lifecycle`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        action: 'resume',
        expectedVersion: initialVersion // Stale
      }
    });
    assert(staleLifecycleRes.status === 409, 'Outdated expectedVersion returns 409 Conflict');

    // Test resuming WS-104 with correct expectedVersion
    const resumeWsRes = await httpFetch(`${BASE_URL}/workspaces/WS-104/lifecycle`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        action: 'resume',
        expectedVersion: initialVersion + 1
      }
    });
    assert(resumeWsRes.status === 200, 'PATCH /workspaces/WS-104/lifecycle (resume) returns 200 OK');
    assert(resumeWsRes.data?.data?.operatingStatus === 'Active', 'operatingStatus is Active');
    assert(resumeWsRes.data?.data?.isLive === true, 'isLive is true');
    assert(resumeWsRes.data?.data?.isListingVisible === true, 'isListingVisible is true');
    assert(resumeWsRes.data?.data?.version === initialVersion + 2, 'Version incremented again');

    // 38. Dedicated Administrator Review Endpoint
    console.log('\n--- Test 38: PATCH /admin/workspaces/:id/review Endpoint ---');
    const invalidReviewerRes = await httpFetch(`${BASE_URL}/admin/workspaces/WS-108/review`, {
      method: 'PATCH',
      headers: {
        'X-Mock-Role': 'Administrator',
        'X-Mock-User-Id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-8821' // Customer, not Administrator
      }
    });
    assert(invalidReviewerRes.status === 403, 'Rejects non-matching reviewer with 403 Forbidden');

    const ws108Res = await httpFetch(`${BASE_URL}/workspaces/WS-108`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    const ws108Version = ws108Res.data?.data?.version || 1;

    const validReviewRes = await httpFetch(`${BASE_URL}/admin/workspaces/WS-108/review`, {
      method: 'PATCH',
      headers: {
        'X-Mock-Role': 'Administrator',
        'X-Mock-User-Id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Complies with all safety and facility standards.',
        expectedVersion: ws108Version
      }
    });
    assert(validReviewRes.status === 200, 'Approves workspace via admin review endpoint');
    assert(validReviewRes.data?.data?.reviewStatus === 'Approved', 'reviewStatus updated to Approved');
    assert(validReviewRes.data?.data?.reviewedBy === 'USR-1882', 'reviewedBy assigned to Rachel Adams');
    assert(Boolean(validReviewRes.data?.data?.reviewedAt), 'reviewedAt timestamp generated');

    // 39. Dedicated Administrator Moderation Endpoint
    console.log('\n--- Test 39: PATCH /admin/workspaces/:id/moderation Endpoint ---');
    const ws104ModRes = await httpFetch(`${BASE_URL}/workspaces/WS-104`, {
      headers: { 'X-Mock-Role': 'Administrator', 'X-Mock-User-Id': 'USR-1882' }
    });
    const ws104Version = ws104ModRes.data?.data?.version || 1;

    const missingReasonRes = await httpFetch(`${BASE_URL}/admin/workspaces/WS-104/moderation`, {
      method: 'PATCH',
      headers: {
        'X-Mock-Role': 'Administrator',
        'X-Mock-User-Id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        expectedVersion: ws104Version
        // Missing suspendReason
      }
    });
    assert(missingReasonRes.status === 400, 'Rejects suspension without suspendReason with 400 Bad Request');

    const validSuspendRes = await httpFetch(`${BASE_URL}/admin/workspaces/WS-104/moderation`, {
      method: 'PATCH',
      headers: {
        'X-Mock-Role': 'Administrator',
        'X-Mock-User-Id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Temporary security audit and inspection in progress.',
        expectedVersion: ws104Version
      }
    });
    assert(validSuspendRes.status === 200, 'Suspends workspace via dedicated admin endpoint');
    assert(validSuspendRes.data?.data?.moderationStatus === 'Suspended', 'moderationStatus updated to Suspended');
    assert(validSuspendRes.data?.data?.operatingStatus === 'Inactive', 'operatingStatus forced to Inactive');
    assert(validSuspendRes.data?.data?.isListingVisible === false, 'isListingVisible forced to false');
    assert(validSuspendRes.data?.data?.status === 'suspended', 'Display status updated to suspended');

    // Restore WS-104 to Normal moderation
    const suspendedVersion = validSuspendRes.data?.data?.version || (ws104Version + 1);
    await httpFetch(`${BASE_URL}/admin/workspaces/WS-104/moderation`, {
      method: 'PATCH',
      headers: {
        'X-Mock-Role': 'Administrator',
        'X-Mock-User-Id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Normal',
        expectedVersion: suspendedVersion
      }
    });

    // 40. Public Marketplace Endpoints & Data Sanitization
    console.log('\n--- Test 40: Public Marketplace Endpoints & Sanitization ---');
    const publicListRes = await httpFetch(`${BASE_URL}/public/workspaces`);
    assert(publicListRes.status === 200, 'GET /public/workspaces returns 200 OK');
    const publicItems = publicListRes.data?.data?.content || [];
    assert(publicItems.length > 0, 'Public listing returns approved workspaces');

    for (const item of publicItems) {
      assert(item.organizerTaxId === undefined, 'Public workspace summary does NOT leak organizerTaxId');
      assert(item.reviewedBy === undefined, 'Public workspace summary does NOT leak reviewedBy');
      assert(item.suspendedBy === undefined, 'Public workspace summary does NOT leak suspendedBy');
      assert(item.grossRevenueMtd === undefined, 'Public workspace summary does NOT leak grossRevenueMtd');
      assert(item.totalBookingsMtd === undefined, 'Public workspace summary does NOT leak totalBookingsMtd');
    }

    const publicDetailRes = await httpFetch(`${BASE_URL}/public/workspaces/WS-101`);
    assert(publicDetailRes.status === 200, 'GET /public/workspaces/WS-101 returns 200 OK');
    assert(publicDetailRes.data?.data?.name === 'NexSpace Central Tower — District 1', 'Detail returns name');
    assert(publicDetailRes.data?.data?.organizerTaxId === undefined, 'Detail DTO does NOT leak organizerTaxId');
    assert(publicDetailRes.data?.data?.reviewedBy === undefined, 'Detail DTO does NOT leak reviewedBy');

    // Direct detail request to Suspended workspace returns 404
    const publicSuspendedDetail = await httpFetch(`${BASE_URL}/public/workspaces/WS-120`);
    assert(publicSuspendedDetail.status === 404, 'GET /public/workspaces/WS-120 (Suspended) returns 404 Not Found');

    // Direct detail request to Draft workspace returns 404
    const publicDraftDetail = await httpFetch(`${BASE_URL}/public/workspaces/WS-135`);
    assert(publicDraftDetail.status === 404, 'GET /public/workspaces/WS-135 (Draft) returns 404 Not Found');

    // 41. Optimistic Concurrency Conflict
    console.log('\n--- Test 41: Optimistic Concurrency Conflict ---');
    const conflictRes = await httpFetch(`${BASE_URL}/workspaces/${createdWs.id}`, {
      method: 'PATCH',
      headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
      body: {
        shortDescription: 'Conflict test update',
        version: 1 // Current version is 2
      }
    });
    assert(conflictRes.status === 409, 'Supplying outdated version returns 409 Conflict');
    assert(conflictRes.data?.error === 'Conflict', 'Error type is Conflict');

    // 42. Server Restart Persistence
    console.log('\n--- Test 42: Concurrency & Server Restart Persistence ---');
    await Promise.all([
      httpFetch(`${BASE_URL}/workspaces/WS-104`, {
        method: 'PATCH',
        headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
        body: { receptionHours: '06:30 – 22:30 Daily' }
      }),
      httpFetch(`${BASE_URL}/workspaces/WS-104`, {
        method: 'PATCH',
        headers: { 'X-Mock-Role': 'Organizer', 'X-Organizer-Id': 'USR-9432' },
        body: { shortDescription: 'Updated concurrently via test suite' }
      })
    ]);

    // Restart server
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = await startServer(TEST_PORT, '127.0.0.1');

    const ws104AfterRestart = await httpFetch(`${BASE_URL}/workspaces/WS-104`, {
      headers: {
        'X-Mock-Role': 'Organizer',
        'X-Organizer-Id': 'USR-9432'
      }
    });
    assert(ws104AfterRestart.status === 200, 'Workspace retrieved after server restart');
    assert(
      ws104AfterRestart.data?.data?.receptionHours === '06:30 – 22:30 Daily' ||
      ws104AfterRestart.data?.data?.shortDescription === 'Updated concurrently via test suite',
      'Concurrent update persisted across server restart'
    );

    // 43. Migration Mechanics in Isolated Directory
    console.log('\n--- Test 43: Non-Destructive Startup & Migration Mechanics ---');
    const isolatedMigrateDir = path.join(os.tmpdir(), `nexspace-migration-test-${Date.now()}`);
    await fs.promises.mkdir(isolatedMigrateDir, { recursive: true });
    const legacyWsFile = path.join(isolatedMigrateDir, 'workspaces.json');

    // Write a mock legacy record lacking canonical schema fields
    const legacyRecords = [
      {
        id: 'WS-TEST-LEGACY',
        name: 'Legacy Workspace Test',
        category: 'coworking_hub',
        streetAddress: '99 Legacy Way',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        status: 'active'
        // Missing organizerId, reviewStatus, operatingStatus, moderationStatus
      }
    ];
    await fs.promises.writeFile(legacyWsFile, JSON.stringify(legacyRecords, null, 2), 'utf8');

    // Test diagnoseWorkspacesSchema
    const diag = await storage.diagnoseWorkspacesSchema(legacyWsFile);
    assert(diag.needsMigration === true, 'Diagnostics detect legacy records needing migration');
    assert(diag.legacyRecordsCount === 1, 'Accurately counts 1 legacy record');

    // Test Dry-Run: file must NOT be modified
    const dryRunRes = await storage.migrateWorkspacesExplicitly({
      dryRun: true,
      customRuntimePath: legacyWsFile
    });
    assert(dryRunRes.dryRun === true, 'Migration reports dryRun mode');
    assert(dryRunRes.migratedCount === 1, 'Dry-run reports 1 record eligible for migration');
    const contentAfterDryRun = await fs.promises.readFile(legacyWsFile, 'utf8');
    assert(contentAfterDryRun === JSON.stringify(legacyRecords, null, 2), 'Dry-run does NOT modify the file on disk');

    // Test Explicit Run: creates backup and modifies file
    const explicitRes = await storage.migrateWorkspacesExplicitly({
      dryRun: false,
      customRuntimePath: legacyWsFile
    });
    assert(explicitRes.migrated === true, 'Explicit migration succeeds');
    assert(Boolean(explicitRes.backupPath), 'Timestamped backup was created');
    assert(fs.existsSync(explicitRes.backupPath!), 'Backup file physically exists on disk');

    const migratedRaw = await fs.promises.readFile(legacyWsFile, 'utf8');
    const migratedData = JSON.parse(migratedRaw);
    assert(migratedData[0].organizerId === 'USR-9432', 'Decorates missing organizerId with default');
    assert(migratedData[0].reviewStatus === 'Approved', 'Decorates reviewStatus from legacy status');
    assert(migratedData[0].moderationStatus === 'Normal', 'Decorates moderationStatus as Normal');
    assert(migratedData[0].version === 1, 'Sets version to 1');

    // Test Idempotence: running again on migrated file does nothing
    const secondRun = await storage.migrateWorkspacesExplicitly({
      dryRun: false,
      customRuntimePath: legacyWsFile
    });
    assert(secondRun.migrated === false, 'Second migration run is idempotent (0 records migrated)');
    assert(secondRun.migratedCount === 0, 'No records modified on second run');

    // Cleanup isolated migration dir
    await fs.promises.rm(isolatedMigrateDir, { recursive: true, force: true });

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
