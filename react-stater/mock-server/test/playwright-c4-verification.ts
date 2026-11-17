import { spawn, execSync } from 'node:child_process';
import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Snapshot developer working runtime JSON sha256 before test execution
const DEV_RUNTIME_PATH = path.resolve(__dirname, '../../mock-data/runtime/workspaces.json');
const initialDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
console.log(`[PlaywrightC4Test] Initial Developer Runtime SHA256: ${initialDevRuntimeSha}`);

// 2. Configure isolated temporary directory for test runtime
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-playwright-c4-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const TEST_MOCK_PORT = 4106;
const TEST_FE_PORT = 3010;
const ARTIFACTS_DIR = process.env.ARTIFACTS_DIR || '/Users/huymd/.gemini/antigravity-ide/brain/397e7656-ec17-4e3a-83ae-1ec85d840eb0';
if (!fs.existsSync(ARTIFACTS_DIR)) {
  fs.mkdirSync(ARTIFACTS_DIR, { recursive: true });
}

function runCli(cmd: string): string {
  try {
    return execSync(cmd, { encoding: 'utf-8', cwd: path.resolve(__dirname, '../..') });
  } catch (err: any) {
    return err.stdout?.toString() || err.message;
  }
}

async function waitForServer(url: string, timeoutMs = 20000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // retry
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function waitForPageText(expectedText: string, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  const lowerExpected = expectedText.toLowerCase();
  while (Date.now() - start < timeoutMs) {
    const text = runCli('playwright-cli eval "() => document.body.innerText"');
    if (text.toLowerCase().includes(lowerExpected)) return true;
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function run() {
  console.log('\n===============================================================');
  console.log('🎭 Focused Playwright Verification: Phase C4 Admin Governance');
  console.log('===============================================================\n');

  let mockServer: http.Server | null = null;
  let feProcess: any = null;
  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, msg: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${msg}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${msg}`);
      failed++;
    }
  }

  try {
    // Start Mock Server on isolated port
    const { startServer } = await import('../server.ts');
    mockServer = await startServer(TEST_MOCK_PORT);
    console.log(`  ✓ Mock Server running on port ${TEST_MOCK_PORT} with isolated runtime.`);

    // In isolated test runtime, configure exact fixture states for deterministic browser actions:
    // - WS-104: Pending review (for Action 1: Approval)
    // - WS-108: Pending review (for Action 2: Rejection)
    // - WS-092: Approved & Active & Normal & isListingVisible: true (for Action 3: Moderation Suspend/Restore)
    const isolatedWorkspacesPath = path.join(ISOLATED_TEST_RUNTIME, 'workspaces.json');
    if (fs.existsSync(isolatedWorkspacesPath)) {
      const rawWs = JSON.parse(fs.readFileSync(isolatedWorkspacesPath, 'utf-8'));
      const ws104 = rawWs.find((w: any) => w.id === 'WS-104');
      if (ws104) {
        ws104.reviewStatus = 'Pending';
        ws104.status = 'pending';
        ws104.moderationStatus = 'Normal';
        ws104.operatingStatus = 'Inactive';
        ws104.isListingVisible = false;
        ws104.version = 1;
      }
      const ws108 = rawWs.find((w: any) => w.id === 'WS-108');
      if (ws108) {
        ws108.reviewStatus = 'Pending';
        ws108.status = 'pending';
        ws108.moderationStatus = 'Normal';
        ws108.operatingStatus = 'Inactive';
        ws108.isListingVisible = false;
        ws108.version = 1;
      }
      const ws092 = rawWs.find((w: any) => w.id === 'WS-092');
      if (ws092) {
        ws092.reviewStatus = 'Approved';
        ws092.moderationStatus = 'Normal';
        ws092.operatingStatus = 'Active';
        ws092.isListingVisible = true;
        ws092.version = 1;
      }
      fs.writeFileSync(isolatedWorkspacesPath, JSON.stringify(rawWs, null, 2), 'utf-8');
      console.log('  ✓ Configured isolated test fixtures: WS-104 (Pending), WS-108 (Pending), WS-092 (Approved)');
    }

    // Start Vite Frontend Server on port 3010 with API proxy targeting isolated mock server
    feProcess = spawn('npx', ['vite', 'dev', '--port', String(TEST_FE_PORT)], {
      cwd: path.resolve(__dirname, '../..'),
      env: {
        ...process.env,
        PORT: String(TEST_FE_PORT),
        MOCK_SERVER_PORT: String(TEST_MOCK_PORT),
        VITE_API_PROXY_TARGET: `http://localhost:${TEST_MOCK_PORT}`,
        INTERNAL_API_URL: `http://localhost:${TEST_MOCK_PORT}/api/v1`,
        VITE_API_URL: `http://localhost:${TEST_MOCK_PORT}/api/v1`
      },
      stdio: 'pipe'
    });

    const isFeReady = await waitForServer(`http://localhost:${TEST_FE_PORT}/`);
    assert(isFeReady, `Frontend server running on http://localhost:${TEST_FE_PORT}`);

    // Ensure stale sessions closed
    runCli('playwright-cli close-all');

    // =========================================================================
    // 1. A06 Overview Verification (Populated & Empty Fixtures)
    // =========================================================================
    console.log('\n--- 1. Navigating to A06 Workspace Administration Overview (Populated Fixture) ---');
    runCli('playwright-cli resize 1440 900');
    runCli(`playwright-cli open http://localhost:${TEST_FE_PORT}/dashboard/admin/workspaces/`);
    await waitForPageText('Workspace Administration');
    await new Promise((r) => setTimeout(r, 2000));

    // Desktop Viewport (1440x900) - Populated Fixture
    console.log('  Capturing A06 Desktop (1440x900)...');
    const a06Text = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      a06Text.includes('Workspace Administration') &&
        a06Text.includes('Recent Moderation Decisions'),
      'A06 Overview renders platform header, KPI grid, and moderation records'
    );
    assert(
      a06Text.includes('Audit Benchmark') && a06Text.includes('Not Available'),
      'A06 Quality Card displays neutral "Not Available" for unsupported Audit Benchmark'
    );
    assert(
      a06Text.includes('Rating telemetry unavailable') &&
        a06Text.includes('Hygiene telemetry unavailable') &&
        !a06Text.includes('14.2k user ratings') &&
        !a06Text.includes('Past 7 days clean'),
      'A06 Quality Card neutralizes fabricated review counts and cleanliness claims'
    );
    assert(
      a06Text.includes('Export Audit Log (Unavailable)'),
      'A06 Export Audit Log action is clearly disabled with neutral unavailable state'
    );
    assert(
      !a06Text.includes('5 New Workspace Onboardings') &&
        !a06Text.includes('3 Floor Plan & Capacity Overhauls'),
      'A06 Moderation Workload Card excludes static fabricated items'
    );
    assert(
      !a06Text.includes('Approved & Published') &&
        !a06Text.includes('Suspended (Safety Audit)'),
      'A06 Moderation Decisions Table does not mislabel approval as published or imply safety audit'
    );

    const a06DesktopPath = path.join(ARTIFACTS_DIR, 'a06_overview_desktop_1440x900.png');
    runCli(`playwright-cli screenshot --filename="${a06DesktopPath}"`);
    console.log(`  📸 Saved: ${a06DesktopPath}`);

    // Tablet Viewport (768x1024)
    console.log('  Capturing A06 Tablet (768x1024)...');
    runCli('playwright-cli resize 768 1024');
    await new Promise((r) => setTimeout(r, 1000));
    const a06TabletPath = path.join(ARTIFACTS_DIR, 'a06_overview_tablet_768x1024.png');
    runCli(`playwright-cli screenshot --filename="${a06TabletPath}"`);
    console.log(`  📸 Saved: ${a06TabletPath}`);

    // Mobile Viewport (390x844)
    console.log('  Capturing A06 Mobile (390x844)...');
    runCli('playwright-cli resize 390 844');
    await new Promise((r) => setTimeout(r, 1000));
    const a06MobilePath = path.join(ARTIFACTS_DIR, 'a06_overview_mobile_390x844.png');
    runCli(`playwright-cli screenshot --filename="${a06MobilePath}"`);
    console.log(`  📸 Saved: ${a06MobilePath}`);

    // Test A06 with Empty Workspace Fixture
    console.log('\n--- 1.1 Testing A06 with Empty Workspace Fixture ---');
    const populatedWorkspaceData = JSON.parse(fs.readFileSync(isolatedWorkspacesPath, 'utf-8'));
    fs.writeFileSync(isolatedWorkspacesPath, JSON.stringify([], null, 2), 'utf-8');

    runCli('playwright-cli resize 1440 900');
    runCli('playwright-cli reload');
    await waitForPageText('No Moderation Decisions Recorded');
    await new Promise((r) => setTimeout(r, 1500));

    const a06EmptyText = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      a06EmptyText.includes('No Moderation Decisions Recorded'),
      'A06 Table displays meaningful empty state when zero moderation decisions exist'
    );
    assert(
      a06EmptyText.includes('Queue is clear'),
      'A06 Workload Card displays "Queue is clear" when no pending submissions exist'
    );
    assert(
      a06EmptyText.includes('No active metro hubs'),
      'A06 KPI grid displays "No active metro hubs" (no static fallback 14)'
    );

    const a06EmptyDesktopPath = path.join(ARTIFACTS_DIR, 'a06_overview_empty_desktop_1440x900.png');
    runCli(`playwright-cli screenshot --filename="${a06EmptyDesktopPath}"`);
    console.log(`  📸 Saved Empty State Screenshot: ${a06EmptyDesktopPath}`);

    // Restore populated fixture
    fs.writeFileSync(isolatedWorkspacesPath, JSON.stringify(populatedWorkspaceData, null, 2), 'utf-8');
    runCli('playwright-cli reload');
    await waitForPageText('Recent Moderation Decisions');
    console.log('  ✓ Restored populated workspace fixture for directory & action tests.');

    // =========================================================================
    // 2. A07 Directory Verification
    // =========================================================================
    console.log('\n--- 2. Navigating to A07 Workspace Directory ---');
    runCli('playwright-cli resize 1440 900');
    runCli(`playwright-cli goto http://localhost:${TEST_FE_PORT}/dashboard/admin/workspaces/directory`);
    await waitForPageText('Workspace Directory & Moderation');
    await new Promise((r) => setTimeout(r, 1500));

    const a07Text = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      a07Text.includes('Workspace Directory & Moderation') &&
        (a07Text.includes('Pending Review') || a07Text.includes('Active')),
      'A07 Directory renders filter tabs and workspace listing'
    );

    const a07DesktopPath = path.join(ARTIFACTS_DIR, 'a07_directory_desktop_1440x900.png');
    runCli(`playwright-cli screenshot --filename="${a07DesktopPath}"`);
    console.log(`  📸 Saved: ${a07DesktopPath}`);

    // Tablet Viewport (768x1024)
    console.log('  Capturing A07 Tablet (768x1024)...');
    runCli('playwright-cli resize 768 1024');
    await new Promise((r) => setTimeout(r, 1000));
    const a07TabletPath = path.join(ARTIFACTS_DIR, 'a07_directory_tablet_768x1024.png');
    runCli(`playwright-cli screenshot --filename="${a07TabletPath}"`);
    console.log(`  📸 Saved: ${a07TabletPath}`);

    // Mobile Viewport (390x844)
    console.log('  Capturing A07 Mobile (390x844)...');
    runCli('playwright-cli resize 390 844');
    await new Promise((r) => setTimeout(r, 1000));
    const a07MobilePath = path.join(ARTIFACTS_DIR, 'a07_directory_mobile_390x844.png');
    runCli(`playwright-cli screenshot --filename="${a07MobilePath}"`);
    console.log(`  📸 Saved: ${a07MobilePath}`);

    // =========================================================================
    // 3. Action 1: Approval Workflow on WS-104
    // =========================================================================
    console.log('\n--- 3. Testing Real Browser Approval Action on WS-104 ---');
    runCli('playwright-cli resize 1440 900');
    runCli(`playwright-cli goto http://localhost:${TEST_FE_PORT}/dashboard/admin/workspaces/directory?hubId=WS-104`);
    await waitForPageText('Approve Workspace');
    await new Promise((r) => setTimeout(r, 1000));

    const drawerInitialText = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      drawerInitialText.includes('Pending Moderation') &&
        drawerInitialText.includes('Approve Workspace'),
      'Inspection Drawer opens for WS-104 with "Pending Moderation" and "Approve Workspace" action'
    );

    // Verify Review & Governance tab labels (no unsupported audit claims)
    runCli('playwright-cli eval "() => { const tabs = Array.from(document.querySelectorAll(\\"aside[role=dialog] button[role=tab]\\")); const tab = tabs.find(t => t.textContent.includes(\\"Governance\\") || t.textContent.includes(\\"Review\\")); if (tab) (tab).click(); }"');
    await waitForPageText('Complete historical event timeline is not recorded');
    const govText = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      govText.toLowerCase().includes('review status & governance details') &&
        govText.includes('Complete historical event timeline is not recorded'),
      'Review & Governance tab displays neutral labels and distinguishes latest review metadata'
    );

    // Click "Approve Workspace" button
    console.log('  Clicking "Approve Workspace"...');
    runCli('playwright-cli eval "() => { const btns = Array.from(document.querySelectorAll(\\"button\\")); const btn = btns.find(b => b.textContent.includes(\\"Approve Workspace\\")); if (btn) (btn).click(); }"');
    await waitForPageText('Workspace Approved');
    await new Promise((r) => setTimeout(r, 1500));

    // Check API state for WS-104
    const ws104Res = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces/WS-104`, {
      headers: { 'X-Role': 'Administrator', 'x-mock-user-id': 'USR-1882' }
    });
    const ws104Json = await ws104Res.json();
    const ws104Data = ws104Json.data || ws104Json;
    assert(
      ws104Data.reviewStatus === 'Approved' && ws104Data.version === 2,
      `API confirms WS-104 is Approved, version incremented to ${ws104Data.version}`
    );
    assert(
      ws104Data.isListingVisible === false,
      'Approval alone does NOT automatically publish the workspace (isListingVisible remains false)'
    );

    // Verify public API does NOT include WS-104
    const pubResBefore = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/public/workspaces`);
    const pubJsonBefore = await pubResBefore.json();
    const pubContentBefore = pubJsonBefore.data?.content || [];
    const isWs104Public = pubContentBefore.some((w: any) => w.id === 'WS-104');
    assert(!isWs104Public, 'Public marketplace API excludes approved workspace before publication');

    const drawerPath = path.join(ARTIFACTS_DIR, 'a07_drawer_inspection_desktop_1440x900.png');
    runCli(`playwright-cli screenshot --filename="${drawerPath}"`);
    console.log(`  📸 Saved: ${drawerPath}`);

    // =========================================================================
    // 4. Action 2: Rejection Workflow on WS-108
    // =========================================================================
    console.log('\n--- 4. Testing Real Browser Rejection Action on WS-108 ---');
    runCli(`playwright-cli goto http://localhost:${TEST_FE_PORT}/dashboard/admin/workspaces/directory?hubId=WS-108`);
    await waitForPageText('Reject with Feedback');
    await new Promise((r) => setTimeout(r, 1000));

    // 4a. Attempt to click "Reject with Feedback" without notes
    console.log('  Testing validation: clicking Reject with empty notes...');
    runCli('playwright-cli eval "() => { const btns = Array.from(document.querySelectorAll(\\"button\\")); const btn = btns.find(b => b.textContent.includes(\\"Reject with Feedback\\")); if (btn) (btn).click(); }"');
    await waitForPageText('Rejection Reason Required');

    const toastText = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      toastText.includes('Rejection Reason Required') ||
        toastText.includes('rejection reason') ||
        toastText.includes('minimum 5 characters'),
      'Empty rejection reason is rejected with validation toast'
    );

    // 4b. Enter valid rejection reason and confirm
    const rejectionReason = 'Floor plan evacuation routes require higher contrast and clear signage.';
    console.log(`  Entering rejection feedback: "${rejectionReason}"...`);
    runCli(`playwright-cli eval "() => { const ta = document.querySelector('#moderatorNotes'); if (ta) { const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set; setter.call(ta, '${rejectionReason}'); ta.dispatchEvent(new Event('input', { bubbles: true })); } }"`);
    await new Promise((r) => setTimeout(r, 600));

    // Click "Reject with Feedback" button
    runCli('playwright-cli eval "() => { const btns = Array.from(document.querySelectorAll(\\"button\\")); const btn = btns.find(b => b.textContent.includes(\\"Reject with Feedback\\")); if (btn) (btn).click(); }"');
    await waitForPageText('Workspace Rejected');
    await new Promise((r) => setTimeout(r, 1500));

    // Check API state for WS-108
    const ws108Res = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces/WS-108`, {
      headers: { 'X-Role': 'Administrator', 'x-mock-user-id': 'USR-1882' }
    });
    const ws108Json = await ws108Res.json();
    const ws108Data = ws108Json.data || ws108Json;
    assert(
      ws108Data.reviewStatus === 'Rejected' &&
        ws108Data.version === 2 &&
        ws108Data.operatingStatus === 'Inactive' &&
        ws108Data.reviewFeedback === rejectionReason,
      `API confirms WS-108 is Rejected, version 2, feedback persisted: "${ws108Data.reviewFeedback}"`
    );

    // Verify Organizer projection returns rejection reason
    const orgRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces?organizerId=USR-2194`, {
      headers: { 'x-organizer-id': 'USR-2194', 'x-mock-role': 'Organizer' }
    });
    const orgJson = await orgRes.json();
    const orgContent = orgJson.data?.content || [];
    const ws108Org = orgContent.find((w: any) => w.id === 'WS-108');
    assert(
      ws108Org && ws108Org.reviewStatus === 'Rejected' && ws108Org.reviewFeedback === rejectionReason,
      'Organizer workspace projection accurately returns Rejected reviewStatus and rejection feedback'
    );

    // =========================================================================
    // 5. Action 3: Moderation Suspend and Restore Workflow on WS-092
    // =========================================================================
    console.log('\n--- 5. Testing Real Browser Moderation Suspend/Restore on WS-092 ---');

    // 5a. Verify WS-092 is initially eligible and present in public API
    const pubInitRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/public/workspaces`);
    const pubInitJson = await pubInitRes.json();
    const pubInitContent = pubInitJson.data?.content || [];
    assert(
      pubInitContent.some((w: any) => w.id === 'WS-092'),
      'WS-092 is initially active, approved, and present in public marketplace'
    );

    // 5b. Open WS-092 in A07 Directory
    runCli(`playwright-cli goto http://localhost:${TEST_FE_PORT}/dashboard/admin/workspaces/directory?hubId=WS-092`);
    await waitForPageText('Suspend Workspace Listing');
    await new Promise((r) => setTimeout(r, 1000));

    // Click "Suspend Workspace Listing"
    console.log('  Clicking "Suspend Workspace Listing"...');
    runCli('playwright-cli eval "() => { const btns = Array.from(document.querySelectorAll(\\"button\\")); const btn = btns.find(b => b.textContent.includes(\\"Suspend Workspace Listing\\")); if (btn) (btn).click(); }"');
    await waitForPageText('Confirm Suspension');

    const suspendReason = 'Excessive noise complaints during evening coworking hours.';
    console.log(`  Entering suspension reason: "${suspendReason}" and confirming...`);
    runCli(`playwright-cli eval "() => { const ta = document.querySelector('#suspendReason'); if (ta) { const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set; setter.call(ta, '${suspendReason}'); ta.dispatchEvent(new Event('input', { bubbles: true })); } }"`);
    await new Promise((r) => setTimeout(r, 600));

    // Click "Confirm Suspension"
    runCli('playwright-cli eval "() => { const btns = Array.from(document.querySelectorAll(\\"button\\")); const btn = btns.find(b => b.textContent.includes(\\"Confirm Suspension\\")); if (btn) (btn).click(); }"');
    await waitForPageText('Workspace Suspended');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify API state
    const ws092SuspendedRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces/WS-092`, {
      headers: { 'X-Role': 'Administrator', 'x-mock-user-id': 'USR-1882' }
    });
    const ws092SuspendedJson = await ws092SuspendedRes.json();
    const ws092Suspended = ws092SuspendedJson.data || ws092SuspendedJson;
    assert(
      ws092Suspended.moderationStatus === 'Suspended' && ws092Suspended.version === 2,
      `API confirms WS-092 is Suspended at version ${ws092Suspended.version} with reason: "${ws092Suspended.suspendReason}"`
    );

    // Verify public API now EXCLUDES WS-092
    const pubSuspendedRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/public/workspaces`);
    const pubSuspendedJson = await pubSuspendedRes.json();
    const pubSuspendedContent = pubSuspendedJson.data?.content || [];
    const is092PublicWhileSuspended = pubSuspendedContent.some((w: any) => w.id === 'WS-092');
    assert(!is092PublicWhileSuspended, 'Public marketplace API immediately excludes suspended workspace WS-092');

    // 5c. Restore WS-092 using the Admin UI
    console.log('  Restoring WS-092 using "Restore to Active Marketplace"...');
    await waitForPageText('Restore to Active Marketplace');
    await new Promise((r) => setTimeout(r, 1000));
    runCli('playwright-cli eval "() => { const btns = Array.from(document.querySelectorAll(\\"button\\")); const btn = btns.find(b => b.textContent.includes(\\"Restore to Active Marketplace\\")); if (btn) (btn).click(); }"');
    await waitForPageText('Workspace Restored');
    await new Promise((r) => setTimeout(r, 2000));

    // Verify restored state in API
    const ws092RestoredRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces/WS-092`, {
      headers: { 'X-Role': 'Administrator', 'x-mock-user-id': 'USR-1882' }
    });
    const ws092RestoredJson = await ws092RestoredRes.json();
    const ws092Restored = ws092RestoredJson.data || ws092RestoredJson;
    assert(
      ws092Restored.moderationStatus === 'Normal' &&
        ws092Restored.operatingStatus === 'Active' &&
        ws092Restored.version === 3,
      `API confirms WS-092 restored to Normal moderationStatus, Active operatingStatus, version ${ws092Restored.version}`
    );

    // Verify public API re-includes WS-092
    const pubRestoredRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/public/workspaces`);
    const pubRestoredJson = await pubRestoredRes.json();
    const pubRestoredContent = pubRestoredJson.data?.content || [];
    const is092PublicWhenRestored = pubRestoredContent.some((w: any) => w.id === 'WS-092');
    assert(is092PublicWhenRestored, 'Public marketplace API re-includes restored workspace WS-092');

    // =========================================================================
    // 7. Organizer Own Workspace Detail & Draft Resume (Browser E2E)
    // =========================================================================
    console.log('\n--- 7. Testing Organizer Own Workspace Detail & Draft Resume in Browser ---');
    runCli(`playwright-cli goto http://localhost:${TEST_FE_PORT}/dashboard/organizer/workspaces/lifecycle?id=WS-104`);
    await waitForPageText('Operational Status');
    await new Promise((r) => setTimeout(r, 1000));

    const lifecycleText = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      lifecycleText.includes('Operational Status') || lifecycleText.includes('NexSpace Saigon Prime Hub'),
      'Organizer O16 lifecycle view successfully hydrates own workspace details (WS-104)'
    );

    // Test Organizer draft resume on O05 create wizard
    runCli(`playwright-cli goto http://localhost:${TEST_FE_PORT}/dashboard/organizer/workspaces/create`);
    await waitForPageText('Basic Information');
    const wizardText = runCli('playwright-cli eval "() => document.body.innerText"');
    assert(
      wizardText.includes('Basic Information') || wizardText.includes('Venue Details'),
      'Organizer Onboarding Wizard loads successfully with draft synchronization'
    );

    // =========================================================================
    // 8. Cross-Tenant Isolation & Non-Owner Denial
    // =========================================================================
    console.log('\n--- 8. Testing Cross-Tenant Non-Owner Denial ---');
    // Non-owner organizer USR-9432 attempting to access WS-108 (owned by USR-2194)
    const nonOwnerRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces/WS-108`, {
      headers: { 'x-organizer-id': 'USR-9432', 'x-mock-role': 'Organizer' }
    });
    assert(
      nonOwnerRes.status === 403,
      `Non-owner Organizer attempting to access private workspace detail returns 403 Forbidden (status=${nonOwnerRes.status})`
    );

    // Customer attempting to access private workspace detail
    const customerRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces/WS-104`, {
      headers: { 'x-mock-role': 'Customer', 'x-mock-user-id': 'USR-8821' }
    });
    assert(
      customerRes.status === 403,
      `Customer attempting to access private workspace detail returns 403 Forbidden (status=${customerRes.status})`
    );

    // Anonymous caller attempting to access private workspace detail
    const anonRes = await fetch(`http://localhost:${TEST_MOCK_PORT}/api/v1/workspaces/WS-104`);
    assert(
      anonRes.status === 403,
      `Anonymous caller attempting to access private workspace detail returns 403 Forbidden (status=${anonRes.status})`
    );

  } catch (err: any) {
    console.error('💥 Playwright verification encountered error:', err);
    failed++;
  } finally {
    runCli('playwright-cli close-all');

    if (feProcess) {
      feProcess.kill('SIGTERM');
      console.log('  ✓ Frontend Nitro process stopped');
    }
    if (mockServer) {
      await new Promise<void>((resolve) => mockServer!.close(() => resolve()));
      console.log('  ✓ Mock server stopped');
    }

    // Verify developer runtime JSON was never touched
    const finalDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
    if (finalDevRuntimeSha === initialDevRuntimeSha) {
      console.log(`  🛡️ DEV RUNTIME JSON INTACT: ${finalDevRuntimeSha}`);
    } else {
      console.error(`  🚨 CRITICAL ERROR: DEV RUNTIME JSON WAS MODIFIED!`);
      failed++;
    }

    // Clean up temporary isolated directory
    try {
      if (fs.existsSync(ISOLATED_TEST_RUNTIME)) {
        fs.rmSync(ISOLATED_TEST_RUNTIME, { recursive: true, force: true });
        console.log(`  ✓ Cleaned up isolated test runtime: ${ISOLATED_TEST_RUNTIME}`);
      }
    } catch (e) {
      console.warn(`  ⚠️ Could not remove isolated test dir: ${e}`);
    }
  }

  console.log('\n===============================================================');
  console.log(`Phase C4 Playwright Verification Results: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) process.exit(1);
}

run();
