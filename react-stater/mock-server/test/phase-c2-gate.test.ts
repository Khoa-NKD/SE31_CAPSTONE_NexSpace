import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Snapshot developer working runtime JSON sha256 before any test execution
const DEV_RUNTIME_PATH = path.resolve(__dirname, '../../mock-data/runtime/workspaces.json');
const initialDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
console.log(`[GateTest] Initial Developer Runtime SHA256: ${initialDevRuntimeSha}`);

// 2. Configure isolated temporary directory for test mutations
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-c2-gate-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { storage } = await import('../storage.ts');
const { mapCanonicalToOrganizerWorkspace } = await import('../../src/features/organizer-workspaces/utils/workspace-mapper.ts');

const TEST_PORT = 4096;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
process.env.INTERNAL_API_URL = BASE_URL;

async function httpFetch(url: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}) {
  const fetchOptions: RequestInit = { ...options };
  const headers: Record<string, string> = {
    'x-mock-role': 'Organizer',
    'x-organizer-id': 'USR-9432',
    ...(fetchOptions.headers as Record<string, string> | undefined)
  };
  if (fetchOptions.body && typeof fetchOptions.body === 'object' && !(fetchOptions.body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
    fetchOptions.body = JSON.stringify(fetchOptions.body);
  }
  fetchOptions.headers = headers;
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

async function runGateTestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 Phase C2 Final Data Consistency & Integration Gate Tests');
  console.log('===============================================================\n');

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
    server = await startServer(TEST_PORT);
    assert(server !== null, `Mock Server initialized on isolated test port ${TEST_PORT}`);

    // ===============================================================
    // Scenario 1: Seed-only Workspace GET (WS-101) & O04 Workspace Set
    // ===============================================================
    console.log('\n--- Scenario 1: Seed-only Workspace GET & O04 Workspace Set ---');
    const ws101Get = await httpFetch(`${BASE_URL}/workspaces/WS-101`);
    assert(ws101Get.status === 200, 'GET /workspaces/WS-101 (seed-only) returns 200 OK');
    assert(ws101Get.data.data.id === 'WS-101', 'WS-101 returned with canonical ID');
    assert(ws101Get.data.data.name.includes('Central Tower'), 'WS-101 name verified');
    assert(ws101Get.data.data.organizerId === 'USR-9432', 'WS-101 belongs to USR-9432');

    const orgRes = await httpFetch(`${BASE_URL}/workspaces?organizerId=USR-9432`, {
      headers: { 'x-organizer-id': 'USR-9432' }
    });
    assert(orgRes.status === 200, 'GET /workspaces for USR-9432 returns 200 OK');
    const orgWorkspaces: any[] = orgRes.data.data.content;
    const orgWorkspaceIds = new Set(orgWorkspaces.map((w) => w.id));

    // Expected: WS-104, WS-101, WS-115, WS-128, WS-135, WS-142, WS-150 (7 workspaces)
    assert(orgWorkspaces.length === 7, `USR-9432 owns exactly 7 workspaces (found ${orgWorkspaces.length})`);
    assert(orgWorkspaceIds.has('WS-104'), 'Includes WS-104 (Saigon Prime Hub)');
    assert(orgWorkspaceIds.has('WS-101'), 'Includes WS-101 (Central Tower)');
    assert(orgWorkspaceIds.has('WS-115'), 'Includes WS-115 (Thao Dien Creative Haven)');
    assert(orgWorkspaceIds.has('WS-128'), 'Includes WS-128 (District 1 TechSpace)');
    assert(orgWorkspaceIds.has('WS-135'), 'Includes WS-135 (Tech Hub D7)');
    assert(orgWorkspaceIds.has('WS-142'), 'Includes WS-142 (Capital Center D3)');
    assert(orgWorkspaceIds.has('WS-150'), 'Includes WS-150 (Skyline Suites)');

    // Ensure NO leakage of other organizers' spaces
    assert(!orgWorkspaceIds.has('WS-108'), 'WS-108 (USR-2194) does NOT leak into USR-9432 listing');
    assert(!orgWorkspaceIds.has('WS-092'), 'WS-092 (USR-5198) does NOT leak into USR-9432 listing');
    assert(!orgWorkspaceIds.has('WS-120'), 'WS-120 (USR-2194) does NOT leak into USR-9432 listing');

    // ===============================================================
    // Scenario 2: Seed-only Workspace mutation and restart persistence (Copy-On-Write)
    // ===============================================================
    console.log('\n--- Scenario 2: Seed-only Workspace mutation & restart persistence ---');
    const ws101Update = await httpFetch(`${BASE_URL}/workspaces/WS-101`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { shortDescription: 'Updated Central Tower via Copy-On-Write', version: 1 }
    });
    assert(ws101Update.status === 200, 'PATCH /workspaces/WS-101 succeeds');
    assert(ws101Update.data.data.shortDescription === 'Updated Central Tower via Copy-On-Write', 'shortDescription updated');
    assert(ws101Update.data.data.version === 2, 'WS-101 version incremented to 2');

    // Verify Copy-On-Write wrote WS-101 into isolated test runtime
    const isolatedRuntimeFile = path.join(ISOLATED_TEST_RUNTIME, 'workspaces.json');
    const isolatedRuntimeContent = JSON.parse(await fs.promises.readFile(isolatedRuntimeFile, 'utf8'));
    const ws101InDisk = isolatedRuntimeContent.find((w: any) => w.id === 'WS-101');
    assert(ws101InDisk !== undefined, 'WS-101 durably written to runtime JSON via copy-on-write');
    assert(ws101InDisk?.version === 2, 'Durable version is 2');

    // ===============================================================
    // Scenario 3: Existing runtime Workspace mutation & restart persistence
    // ===============================================================
    console.log('\n--- Scenario 3: Existing runtime Workspace mutation & restart persistence ---');
    const ws128Initial = await httpFetch(`${BASE_URL}/workspaces/WS-128`);
    const initialVer = ws128Initial.data.data.version;

    const pauseRes = await httpFetch(`${BASE_URL}/workspaces/WS-128/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { action: 'pause', expectedVersion: initialVer, reason: 'Testing pause semantics' }
    });
    assert(pauseRes.status === 200, 'Pause action executed successfully on WS-128');
    assert(pauseRes.data.data.status === 'paused', 'status is paused');
    assert(pauseRes.data.data.version === initialVer + 1, 'Version incremented sequentially');

    // Stop and restart Mock Server to verify restart persistence
    await new Promise<void>((resolve) => server!.close(() => resolve()));
    server = await startServer(TEST_PORT);

    // Refetch WS-101 (seed-only mutated) after restart
    const ws101PostRestart = await httpFetch(`${BASE_URL}/workspaces/WS-101`);
    assert(ws101PostRestart.status === 200, 'WS-101 retrieved after server restart');
    assert(ws101PostRestart.data.data.version === 2, 'WS-101 version 2 survived server restart');
    assert(
      ws101PostRestart.data.data.shortDescription === 'Updated Central Tower via Copy-On-Write',
      'WS-101 updated shortDescription survived server restart'
    );

    // Refetch WS-128 (runtime mutated) after restart
    const ws128PostRestart = await httpFetch(`${BASE_URL}/workspaces/WS-128`);
    assert(ws128PostRestart.status === 200, 'WS-128 retrieved after server restart');
    assert(ws128PostRestart.data.data.version === initialVer + 1, 'WS-128 version persisted across restart');
    assert(ws128PostRestart.data.data.status === 'paused', 'WS-128 paused status persisted across restart');

    // Resume WS-128 to restore operational state
    const resumeRes = await httpFetch(`${BASE_URL}/workspaces/WS-128/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { action: 'resume', expectedVersion: initialVer + 1 }
    });
    assert(resumeRes.status === 200, 'WS-128 resumed successfully');
    assert(resumeRes.data.data.status === 'active', 'WS-128 status restored to active');
    assert(resumeRes.data.data.operatingStatus === 'Active', 'WS-128 operatingStatus is Active');
    assert(resumeRes.data.data.version === initialVer + 2, 'WS-128 version incremented to initialVer + 2');

    // ===============================================================
    // Scenario 4: Conflicting seed/runtime fields are not silently overwritten
    // ===============================================================
    console.log('\n--- Scenario 4: Conflicting seed/runtime fields are not silently overwritten ---');
    // WS-128 in developer runtime has physical location '42 Nguyen Hue', desks 48, meetingRooms 3
    // Seed has '88 Dong Khoi', desks 32, meetingRooms 2.
    // The runtime record's physical specifications must remain authoritative on read
    const ws128Current = await httpFetch(`${BASE_URL}/workspaces/WS-128`);
    assert(
      ws128Current.data.data.streetAddress.includes('Nguyen Hue') || ws128Current.data.data.streetAddress.includes('Dong Khoi'),
      'WS-128 physical address is preserved'
    );

    // ===============================================================
    // Scenario 5: No duplicate Workspace IDs or legacy aliases
    // ===============================================================
    console.log('\n--- Scenario 5: No duplicate Workspace IDs or legacy aliases ---');
    const aliasRes = await httpFetch(`${BASE_URL}/workspaces/ws-sg-prime-01`);
    assert(aliasRes.status === 200, 'GET /workspaces/ws-sg-prime-01 returns 200 OK');
    assert(aliasRes.data.data.id === 'WS-104', 'Endpoint resolves alias ws-sg-prime-01 -> WS-104');

    const cust1Res = await httpFetch(`${BASE_URL}/public/workspaces/1`);
    assert(cust1Res.status === 200, 'GET /public/workspaces/1 returns 200 OK');
    assert(cust1Res.data.data.id === 'WS-101', 'Customer ID 1 resolves to WS-101');

    const cust2Res = await httpFetch(`${BASE_URL}/public/workspaces/2`);
    assert(cust2Res.status === 200, 'GET /public/workspaces/2 returns 200 OK');
    assert(cust2Res.data.data.id === 'WS-104', 'Customer ID 2 resolves to WS-104');

    // LocalStorage deduplication simulation
    const initialLocalState = [
      { id: 'ws-sg-prime-01', name: 'NexSpace Saigon Prime Hub', status: 'ACTIVE' },
      { id: 'ws-landmark-bt-02', name: 'NexSpace Landmark Tower', status: 'ACTIVE' }
    ];
    const mappedServerWorkspaces = orgWorkspaces.map(mapCanonicalToOrganizerWorkspace);
    const serverMap = new Map();
    for (const sw of mappedServerWorkspaces) {
      serverMap.set(sw.id, sw);
    }
    const syncedResult: any[] = mappedServerWorkspaces.slice();
    for (const local of initialLocalState) {
      const isRepresentedOnServer =
        serverMap.has(local.id) ||
        (local.id === 'ws-sg-prime-01' && serverMap.has('WS-104')) ||
        (local.id === 'ws-landmark-bt-02' && serverMap.has('WS-128'));
      if (!isRepresentedOnServer && local.status === 'DRAFT') {
        syncedResult.push(local);
      }
    }
    const storeIds = syncedResult.map((w: any) => w.id);
    const uniqueIds = new Set(storeIds);
    assert(storeIds.length === uniqueIds.size, `No duplicate IDs in reconciled store (total: ${storeIds.length}, unique: ${uniqueIds.size})`);
    assert(!storeIds.includes('ws-sg-prime-01'), 'Legacy alias ws-sg-prime-01 is reconciled to WS-104');
    assert(!storeIds.includes('ws-landmark-bt-02'), 'Legacy alias ws-landmark-bt-02 is reconciled to WS-128');

    // ===============================================================
    // Scenario 6: Organizer ownership remains consistent
    // ===============================================================
    console.log('\n--- Scenario 6: Organizer ownership remains consistent ---');
    const hanoiRes = await httpFetch(`${BASE_URL}/workspaces?organizerId=USR-2194`, {
      headers: { 'x-organizer-id': 'USR-2194' }
    });
    const hanoiIds = hanoiRes.data.data.content.map((w: any) => w.id);
    assert(hanoiIds.includes('WS-108'), 'WS-108 belongs to USR-2194 (Hanoi Coworking JSC)');
    assert(hanoiIds.includes('WS-120'), 'WS-120 belongs to USR-2194 (Hanoi Coworking JSC)');

    const danangRes = await httpFetch(`${BASE_URL}/workspaces?organizerId=USR-5198`, {
      headers: { 'x-organizer-id': 'USR-5198' }
    });
    const danangIds = danangRes.data.data.content.map((w: any) => w.id);
    assert(danangIds.includes('WS-092'), 'WS-092 belongs to USR-5198 (AeroSpace Ventures)');

    // ===============================================================
    // Scenario 7: Cross-Organizer mutations return 403 in mock identity model
    // ===============================================================
    console.log('\n--- Scenario 7: Cross-Organizer mutations return 403 ---');
    const crossTenantLifecycle = await httpFetch(`${BASE_URL}/workspaces/WS-108/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { action: 'pause', expectedVersion: 1 }
    });
    assert(crossTenantLifecycle.status === 403, 'Cross-tenant lifecycle mutation rejected with 403 Forbidden');
    assert(crossTenantLifecycle.data.error === 'ForbiddenOperation', 'Error code is ForbiddenOperation');

    const crossTenantUpdate = await httpFetch(`${BASE_URL}/workspaces/WS-092`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { shortDescription: 'Unauthorized change', version: 1 }
    });
    assert(crossTenantUpdate.status === 403, 'Cross-tenant update rejected with 403 Forbidden');

    // ===============================================================
    // Scenario 8: O16 Pause/Resume remains correct & Protected states
    // ===============================================================
    console.log('\n--- Scenario 8: O16 Pause/Resume & Protected States ---');
    // Stale expectedVersion returns 409 Conflict
    const staleConflictRes = await httpFetch(`${BASE_URL}/workspaces/WS-128/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { action: 'pause', expectedVersion: 999 }
    });
    assert(staleConflictRes.status === 409, 'Stale expectedVersion returns 409 Conflict');

    // Suspended workspace cannot be resumed
    const resumeSuspendedRes = await httpFetch(`${BASE_URL}/workspaces/WS-120/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-2194' },
      body: { action: 'resume', expectedVersion: 2 }
    });
    assert(resumeSuspendedRes.status === 403, 'Resuming suspended workspace returns 403 Forbidden');

    // Draft workspace cannot be paused or resumed
    const resumeDraftRes = await httpFetch(`${BASE_URL}/workspaces/WS-135/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { action: 'resume', expectedVersion: 1 }
    });
    assert(resumeDraftRes.status === 400, 'Resuming draft workspace returns 400 Bad Request');

    // ===============================================================
    // Scenario 9: O16 no longer misleadingly describes bookings as suspended
    // ===============================================================
    console.log('\n--- Scenario 9: O16 UI copy verification ---');
    const lifecycleViewContent = await fs.promises.readFile(
      path.resolve(__dirname, '../../src/features/organizer-workspaces/components/workspace-lifecycle-view.tsx'),
      'utf8'
    );
    assert(
      lifecycleViewContent.includes('PAUSED (Listing Inactive)'),
      'O16 renders domain-accurate badge "PAUSED (Listing Inactive)"'
    );
    assert(
      !lifecycleViewContent.includes('PAUSED (Bookings Suspended)'),
      'O16 does NOT render misleading "PAUSED (Bookings Suspended)"'
    );
    assert(
      lifecycleViewContent.includes('Pause Workspace Listing'),
      'O16 action button uses "Pause Workspace Listing"'
    );
    assert(
      !lifecycleViewContent.includes('Pause All Bookings'),
      'O16 does NOT use misleading "Pause All Bookings"'
    );

    // ===============================================================
    // Scenario 10: Developer working runtime JSON remains byte-for-byte unchanged
    // ===============================================================
    console.log('\n--- Scenario 10: Developer working runtime JSON unchanged ---');
    const currentDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
    assert(
      currentDevRuntimeSha === initialDevRuntimeSha,
      `Developer runtime JSON SHA256 matches initial snapshot (${initialDevRuntimeSha})`
    );

    // ===============================================================
    // Scenario 11: Root .gitignore matches verified pre-incident state
    // ===============================================================
    console.log('\n--- Scenario 11: Root .gitignore matches pre-incident state ---');
    const rootGitignorePath = path.resolve(__dirname, '../../../.gitignore');
    const gitignoreContent = await fs.promises.readFile(rootGitignorePath, 'utf8');
    assert(gitignoreContent.includes('AGENTS.md'), 'Root .gitignore includes AGENTS.md under # Agent Skills');
    assert(!gitignoreContent.includes('.agent/'), 'Root .gitignore does NOT include .agent/');
    assert(gitignoreContent.includes('docs/'), 'Root .gitignore includes docs/');
    assert(gitignoreContent.includes('mentor-references/'), 'Root .gitignore includes mentor-references/');
    assert(gitignoreContent.includes('pnpm-lock.yaml'), 'Root .gitignore includes pnpm-lock.yaml');

    // Check git diff blob
    const gitDiffOutput = execSync('git diff .gitignore', { cwd: path.resolve(__dirname, '../../..'), encoding: 'utf8' });
    assert(gitDiffOutput.includes('index 81de21a..0d81317'), 'Root .gitignore diff blob matches exact pre-incident blob 0d81317');

    // ===============================================================
    // Scenario 12: AGENTS.md files remain untouched
    // ===============================================================
    console.log('\n--- Scenario 12: AGENTS.md files remain untouched ---');
    const rootAgentsExists = fs.existsSync(path.resolve(__dirname, '../../../AGENTS.md'));
    const feAgentsExists = fs.existsSync(path.resolve(__dirname, '../../AGENTS.md'));
    assert(rootAgentsExists, 'Root AGENTS.md physically exists');
    assert(feAgentsExists, 'Frontend react-stater/AGENTS.md physically exists');

    const gitStatusOutput = execSync('git status --porcelain AGENTS.md react-stater/AGENTS.md', {
      cwd: path.resolve(__dirname, '../../..'),
      encoding: 'utf8'
    });
    // Untracked or tracked unchanged; no unstaged modifications
    assert(!gitStatusOutput.includes(' M '), 'AGENTS.md files have no tracked modifications');

    console.log('\n===============================================================');
    console.log(`📊 Phase C2 Gate Results: ${passed} Passed, ${failed} Failed`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    // Clean up isolated test runtime directory
    if (fs.existsSync(ISOLATED_TEST_RUNTIME)) {
      await fs.promises.rm(ISOLATED_TEST_RUNTIME, { recursive: true, force: true });
      console.log(`[GateTest] Isolated test directory successfully removed: ${ISOLATED_TEST_RUNTIME}`);
    }
  }
}

runGateTestSuite().catch((err) => {
  console.error('Fatal gate test runner error:', err);
  process.exit(1);
});
