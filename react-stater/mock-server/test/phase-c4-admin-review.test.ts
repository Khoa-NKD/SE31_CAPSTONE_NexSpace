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
console.log(`[PhaseC4Test] Initial Developer Runtime SHA256: ${initialDevRuntimeSha}`);

// 2. Configure isolated temporary directory for test mutations
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-c4-test-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { JsonStorageEngine } = await import('../storage.ts');

const TEST_PORT = 4104;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

async function runPhaseC4TestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 NexSpace Phase C4: Administrator Review & Moderation Tests');
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
    console.log(`  ✓ Mock Server running on port ${TEST_PORT} with isolated runtime ${ISOLATED_TEST_RUNTIME}\n`);

    // Helper for requests
    async function apiRequest(
      pathName: string,
      options: {
        method?: string;
        headers?: Record<string, string>;
        body?: unknown;
      } = {}
    ) {
      const { method = 'GET', headers = {}, body } = options;
      const res = await fetch(`${BASE_URL}${pathName}`, {
        method,
        headers: {
          'Content-Type': 'application/json',
          ...headers
        },
        body: body !== undefined ? JSON.stringify(body) : undefined
      });
      let json: any = null;
      try {
        json = await res.json();
      } catch {
        // Not JSON
      }
      return {
        status: res.status,
        headers: res.headers,
        raw: json,
        data: json?.data,
        json
      };
    }

    // =========================================================================
    // SECTION 1: Cross-Tenant Admin Visibility & Filtering
    // =========================================================================
    console.log('--- SECTION 1: Admin Workspace Directory Cross-Tenant Visibility ---');

    // 1.1 Non-admin caller with x-mock-user-id should only see their own workspaces
    const orgUserRes = await apiRequest('/workspaces', {
      headers: { 'x-mock-user-id': 'USR-NON-EXISTENT' }
    });
    assert(
      orgUserRes.status === 200 && orgUserRes.data.content.length === 0,
      '1.1 Non-admin user is tenant-scoped and sees 0 workspaces for unused ID',
      `Got count: ${orgUserRes.data?.content?.length}`
    );

    // 1.2 Admin caller sees platform workspaces across all organizers
    const adminAllRes = await apiRequest('/workspaces?limit=100', {
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      }
    });
    assert(
      adminAllRes.status === 200 && adminAllRes.data.content.length > 0,
      '1.2 Administrator caller bypasses tenant scoping and retrieves all platform workspaces',
      `Found ${adminAllRes.data?.content?.length} workspaces`
    );

    // 1.3 Admin filter by reviewStatus=Pending
    const adminPendingRes = await apiRequest('/workspaces?reviewStatus=Pending&limit=100', {
      headers: { 'x-mock-role': 'Administrator' }
    });
    assert(
      adminPendingRes.status === 200 &&
        adminPendingRes.data.content.every((w: any) => w.reviewStatus === 'Pending'),
      '1.3 Administrator can filter workspaces by reviewStatus=Pending'
    );

    // 1.4 Admin filter by moderationStatus=Suspended
    const adminSuspendedRes = await apiRequest('/workspaces?moderationStatus=Suspended&limit=100', {
      headers: { 'x-mock-role': 'Administrator' }
    });
    assert(
      adminSuspendedRes.status === 200 &&
        adminSuspendedRes.data.content.every((w: any) => w.moderationStatus === 'Suspended'),
      '1.4 Administrator can filter workspaces by moderationStatus=Suspended'
    );

    // =========================================================================
    // SECTION 2: Role-Based Access Control (RBAC)
    // =========================================================================
    console.log('\n--- SECTION 2: Role-Based Access Control (RBAC) Enforcement ---');

    // Pick a test workspace from the seed
    const seedWorkspaceId = adminAllRes.data.content[0].id;

    // 2.1 Non-admin attempting admin review returns 403 Forbidden
    const unauthReviewRes = await apiRequest(`/admin/workspaces/${seedWorkspaceId}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Organizer',
        'x-mock-user-id': 'USR-ORG-99'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-ORG-99'
      }
    });
    assert(
      unauthReviewRes.status === 403,
      '2.1 Review endpoint rejects non-Administrator caller with 403 Forbidden'
    );

    // 2.2 Customer caller attempting review returns 403 Forbidden
    const customerReviewRes = await apiRequest(`/admin/workspaces/${seedWorkspaceId}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Customer',
        'x-mock-user-id': 'USR-8821'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-8821'
      }
    });
    assert(
      customerReviewRes.status === 403,
      '2.2 Review endpoint rejects Customer role with 403 Forbidden'
    );

    // 2.3 Non-admin attempting moderation returns 403 Forbidden
    const unauthModRes = await apiRequest(`/admin/workspaces/${seedWorkspaceId}/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Organizer',
        'x-mock-user-id': 'USR-ORG-99'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendReason: 'Unauthorized attempt to suspend space'
      }
    });
    assert(
      unauthModRes.status === 403,
      '2.3 Moderation endpoint rejects non-Administrator caller with 403 Forbidden'
    );

    // =========================================================================
    // SECTION 3: Draft Review Prevention
    // =========================================================================
    console.log('\n--- SECTION 3: Draft Review Prevention ---');

    // Helper to generate valid draft workspace payload ready for submission
    function makeValidDraftPayload(name: string) {
      return {
        name,
        category: 'coworking_hub',
        streetAddress: '123 Nguyen Hue',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        latitude: 10.7719,
        longitude: 106.7044,
        capacityDesks: 40,
        amenities: ['high_speed_wifi', 'specialty_coffee'],
        coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        images: [
          {
            id: 'img-test-1',
            url: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
            isCover: true,
            displayOrder: 1,
            mediaType: 'image'
          }
        ],
        operatingHours: [
          {
            dayOfWeek: 1,
            openTime: '08:00',
            closeTime: '20:00',
            isClosed: false,
            is24Hours: false
          }
        ]
      };
    }

    // Create a new draft workspace
    const createDraftRes = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: makeValidDraftPayload('C4 Draft Workspace For Testing')
    });
    const draftWorkspace = createDraftRes.data;
    assert(
      createDraftRes.status === 201 && draftWorkspace.reviewStatus === 'Draft',
      '3.1 Workspace created successfully in Draft reviewStatus'
    );

    // 3.2 Attempting to approve draft workspace returns 400 Bad Request
    const reviewDraftApproveRes = await apiRequest(`/admin/workspaces/${draftWorkspace.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: draftWorkspace.version
      }
    });
    assert(
      reviewDraftApproveRes.status === 400,
      '3.2 Administrator cannot approve a workspace while still in Draft (400 Bad Request)'
    );

    // 3.3 Attempting to reject draft workspace returns 400 Bad Request
    const reviewDraftRejectRes = await apiRequest(`/admin/workspaces/${draftWorkspace.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Rejected',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Incomplete application documents',
        expectedVersion: draftWorkspace.version
      }
    });
    assert(
      reviewDraftRejectRes.status === 400,
      '3.3 Administrator cannot reject a workspace while still in Draft (400 Bad Request)'
    );

    // =========================================================================
    // SECTION 4: Submission & Valid Admin Approval Flow
    // =========================================================================
    console.log('\n--- SECTION 4: Submission & Valid Admin Approval Flow ---');

    // 4.1 Organizer submits workspace
    const submitRes = await apiRequest(`/workspaces/${draftWorkspace.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: { agreementConfirmed: true }
    });
    const submittedWorkspace = submitRes.data;
    assert(
      submitRes.status === 200 && submittedWorkspace.reviewStatus === 'Pending',
      '4.1 Organizer submits workspace; reviewStatus transitions to Pending',
      `Status: ${submittedWorkspace?.reviewStatus}, Version: ${submittedWorkspace?.version}`
    );

    const versionBeforeApproval = submittedWorkspace.version;
    const initialIsLive = submittedWorkspace.isLive;
    const initialIsListingVisible = submittedWorkspace.isListingVisible;

    // 4.2 Administrator approves submitted workspace
    const approveRes = await apiRequest(`/admin/workspaces/${draftWorkspace.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Facility electrical safety and lease title verified.',
        expectedVersion: versionBeforeApproval
      }
    });
    const approvedWorkspace = approveRes.data;

    assert(
      approveRes.status === 200 && approvedWorkspace.reviewStatus === 'Approved',
      '4.2 Admin successfully approves pending workspace (reviewStatus: Approved)'
    );
    assert(
      approvedWorkspace.reviewedBy === 'USR-1882' && Boolean(approvedWorkspace.reviewedAt),
      '4.3 Admin approval records reviewer identity and reviewedAt timestamp',
      `reviewedAt: ${approvedWorkspace.reviewedAt}`
    );
    assert(
      approvedWorkspace.version === versionBeforeApproval + 1,
      '4.4 Approval increments workspace version monotonically',
      `Expected ${versionBeforeApproval + 1}, got ${approvedWorkspace.version}`
    );
    assert(
      approvedWorkspace.isLive === initialIsLive &&
        approvedWorkspace.isListingVisible === initialIsListingVisible,
      '4.5 Approval decouples from marketplace publication: does not force isLive or isListingVisible to true',
      `isLive: ${approvedWorkspace.isLive}, isListingVisible: ${approvedWorkspace.isListingVisible}`
    );

    // =========================================================================
    // SECTION 5: Rejection Validation & Mandatory Reason
    // =========================================================================
    console.log('\n--- SECTION 5: Rejection Validation & Mandatory Reason ---');

    // Create another workspace and submit it for rejection testing
    const createDraft2 = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: makeValidDraftPayload('C4 Workspace For Rejection Testing')
    });
    await apiRequest(`/workspaces/${createDraft2.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: { agreementConfirmed: true }
    });

    const pendingWorkspace2Res = await apiRequest(`/workspaces/${createDraft2.data.id}`, {
      headers: { 'x-mock-role': 'Administrator' }
    });
    const pendingWorkspace2 = pendingWorkspace2Res.data;

    // 5.1 Rejection without reason returns 400 Bad Request
    const rejectNoReasonRes = await apiRequest(`/admin/workspaces/${pendingWorkspace2.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Rejected',
        reviewedBy: 'USR-1882',
        expectedVersion: pendingWorkspace2.version
      }
    });
    assert(
      rejectNoReasonRes.status === 400,
      '5.1 Rejection with missing feedback returns 400 Bad Request'
    );

    // 5.2 Rejection with too short reason (< 5 chars) returns 400 Bad Request
    const rejectShortReasonRes = await apiRequest(`/admin/workspaces/${pendingWorkspace2.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Rejected',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'bad',
        expectedVersion: pendingWorkspace2.version
      }
    });
    assert(
      rejectShortReasonRes.status === 400,
      '5.2 Rejection with < 5 character feedback returns 400 Bad Request'
    );

    // 5.3 Valid rejection with explanatory feedback
    const validRejectFeedback = 'Floor plan acoustic certificate is missing required seal.';
    const validRejectRes = await apiRequest(`/admin/workspaces/${pendingWorkspace2.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Rejected',
        reviewedBy: 'USR-1882',
        reviewFeedback: validRejectFeedback,
        expectedVersion: pendingWorkspace2.version
      }
    });
    const rejectedWorkspace = validRejectRes.data;
    assert(
      validRejectRes.status === 200 && rejectedWorkspace.reviewStatus === 'Rejected',
      '5.3 Valid rejection succeeds with reviewStatus: Rejected'
    );
    assert(
      rejectedWorkspace.reviewFeedback === validRejectFeedback,
      '5.4 Rejection feedback is preserved in workspace record',
      `Feedback: ${rejectedWorkspace.reviewFeedback}`
    );
    assert(
      rejectedWorkspace.version === pendingWorkspace2.version + 1,
      '5.5 Rejection increments version monotonically'
    );

    // =========================================================================
    // SECTION 6: Optimistic Concurrency Control (OCC)
    // =========================================================================
    console.log('\n--- SECTION 6: Optimistic Concurrency Control (OCC) ---');

    // 6.1 Review with stale expectedVersion returns 409 Conflict
    const staleReviewRes = await apiRequest(`/admin/workspaces/${rejectedWorkspace.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: 1 // Actual version is 3
      }
    });
    assert(
      staleReviewRes.status === 409,
      '6.1 Admin review rejects stale expectedVersion with 409 Conflict'
    );

    // 6.2 Moderation with stale expectedVersion returns 409 Conflict
    const staleModRes = await apiRequest(`/admin/workspaces/${approvedWorkspace.id}/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Safety violation reported',
        expectedVersion: 1 // Actual version is 3
      }
    });
    assert(
      staleModRes.status === 409,
      '6.2 Admin moderation rejects stale expectedVersion with 409 Conflict'
    );

    // 6.3 Review with missing expectedVersion returns 400 Bad Request
    const missingVerReviewRes = await apiRequest(`/admin/workspaces/${rejectedWorkspace.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882'
        // expectedVersion omitted
      }
    });
    assert(
      missingVerReviewRes.status === 400,
      '6.3 Admin review rejects missing expectedVersion with 400 Bad Request'
    );

    // 6.4 Review with invalid expectedVersion (non-positive / not integer) returns 400 Bad Request
    const invalidVerReviewRes = await apiRequest(`/admin/workspaces/${rejectedWorkspace.id}/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: 0
      }
    });
    assert(
      invalidVerReviewRes.status === 400,
      '6.4 Admin review rejects invalid expectedVersion (<= 0) with 400 Bad Request'
    );

    // 6.5 Moderation with missing expectedVersion returns 400 Bad Request
    const missingVerModRes = await apiRequest(`/admin/workspaces/${approvedWorkspace.id}/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Safety check needed'
        // expectedVersion omitted
      }
    });
    assert(
      missingVerModRes.status === 400,
      '6.5 Admin moderation rejects missing expectedVersion with 400 Bad Request'
    );

    // 6.6 Moderation with invalid expectedVersion returns 400 Bad Request
    const invalidVerModRes = await apiRequest(`/admin/workspaces/${approvedWorkspace.id}/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Safety check needed',
        expectedVersion: -1
      }
    });
    assert(
      invalidVerModRes.status === 400,
      '6.6 Admin moderation rejects invalid expectedVersion (negative) with 400 Bad Request'
    );

    // 6.7 Generic Organizer PATCH cannot modify review or moderation fields (400 Bad Request)
    const orgBypassReviewRes = await apiRequest(`/workspaces/${draftWorkspace.id}`, {
      method: 'PATCH',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: {
        reviewStatus: 'Approved',
        expectedVersion: draftWorkspace.version
      }
    });
    assert(
      orgBypassReviewRes.status === 400,
      '6.7 Generic Organizer PATCH rejects attempt to modify reviewStatus (400 Bad Request)'
    );

    const orgBypassModRes = await apiRequest(`/workspaces/${draftWorkspace.id}`, {
      method: 'PATCH',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: {
        moderationStatus: 'Suspended',
        expectedVersion: draftWorkspace.version
      }
    });
    assert(
      orgBypassModRes.status === 400,
      '6.8 Generic Organizer PATCH rejects attempt to modify moderationStatus (400 Bad Request)'
    );

    // =========================================================================
    // SECTION 7: Race Condition / Concurrent Admin Decisions
    // =========================================================================
    console.log('\n--- SECTION 7: Concurrent Admin Decisions ---');

    // Setup another pending workspace
    const createDraft3 = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: makeValidDraftPayload('C4 Workspace For Concurrent Review')
    });
    const submitted3Res = await apiRequest(`/workspaces/${createDraft3.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-ORG-C4' },
      body: { agreementConfirmed: true }
    });
    const targetVersion = submitted3Res.data.version;

    // Send two concurrent review requests with same expectedVersion
    const [raceRes1, raceRes2] = await Promise.all([
      apiRequest(`/admin/workspaces/${createDraft3.data.id}/review`, {
        method: 'PATCH',
        headers: {
          'x-mock-role': 'Administrator',
          'x-mock-user-id': 'USR-1882'
        },
        body: {
          reviewStatus: 'Approved',
          reviewedBy: 'USR-1882',
          expectedVersion: targetVersion
        }
      }),
      apiRequest(`/admin/workspaces/${createDraft3.data.id}/review`, {
        method: 'PATCH',
        headers: {
          'x-mock-role': 'Administrator',
          'x-mock-user-id': 'USR-1882'
        },
        body: {
          reviewStatus: 'Rejected',
          reviewedBy: 'USR-1882',
          reviewFeedback: 'Rejecting due to lighting safety',
          expectedVersion: targetVersion
        }
      })
    ]);

    const statuses = [raceRes1.status, raceRes2.status].sort();
    assert(
      statuses[0] === 200 && statuses[1] === 409,
      '7.1 Exactly one concurrent review decision succeeds (200) and the other fails with 409 Conflict',
      `Got statuses: ${statuses.join(', ')}`
    );

    // Verify final state
    const afterRaceRes = await apiRequest(`/workspaces/${createDraft3.data.id}`, {
      headers: { 'x-mock-role': 'Administrator' }
    });
    assert(
      afterRaceRes.data.version === targetVersion + 1,
      '7.2 Workspace version incremented by exactly 1 after concurrent decisions',
      `Version: ${afterRaceRes.data.version}`
    );

    // =========================================================================
    // SECTION 8: Admin Moderation (Suspend & Restore)
    // =========================================================================
    console.log('\n--- SECTION 8: Admin Moderation (Suspend & Restore) ---');

    // 8.1 Suspend without reason returns 400 Bad Request
    const suspendNoReasonRes = await apiRequest(`/admin/workspaces/${approvedWorkspace.id}/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        expectedVersion: approvedWorkspace.version
      }
    });
    assert(
      suspendNoReasonRes.status === 400,
      '8.1 Moderation suspension without reason returns 400 Bad Request'
    );

    // 8.2 Valid suspension with reason >= 5 characters
    const suspendReason = 'Excessive noise complaints from adjacent tenant suites';
    const suspendRes = await apiRequest(`/admin/workspaces/${approvedWorkspace.id}/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason,
        expectedVersion: approvedWorkspace.version
      }
    });
    const suspendedWorkspace = suspendRes.data;
    assert(
      suspendRes.status === 200 && suspendedWorkspace.moderationStatus === 'Suspended',
      '8.2 Administrator successfully suspends workspace (moderationStatus: Suspended)'
    );
    assert(
      suspendedWorkspace.suspendedBy === 'USR-1882' &&
        suspendedWorkspace.suspendReason === suspendReason &&
        Boolean(suspendedWorkspace.suspendedAt),
      '8.3 Suspension records moderator identity, reason, and suspendedAt timestamp'
    );
    assert(
      suspendedWorkspace.version === approvedWorkspace.version + 1,
      '8.4 Suspension increments workspace version'
    );

    // 8.3 Restore suspended workspace back to Normal
    const restoreRes = await apiRequest(`/admin/workspaces/${approvedWorkspace.id}/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Normal',
        expectedVersion: suspendedWorkspace.version
      }
    });
    const restoredWorkspace = restoreRes.data;
    assert(
      restoreRes.status === 200 && restoredWorkspace.moderationStatus === 'Normal',
      '8.5 Administrator successfully restores workspace (moderationStatus: Normal)'
    );
    assert(
      restoredWorkspace.suspendedBy === null &&
        restoredWorkspace.suspendedAt === null &&
        restoredWorkspace.suspendReason === null,
      '8.6 Restoration clears suspendedBy, suspendedAt, and suspendReason'
    );
    assert(
      restoredWorkspace.version === suspendedWorkspace.version + 1,
      '8.7 Restoration increments workspace version'
    );

    // =========================================================================
    // SECTION 9: Atomic Persistence & Simulated Server Restart
    // =========================================================================
    console.log('\n--- SECTION 9: Atomic JSON Persistence & Restart Simulation ---');

    // 9.1 Verify file exists in isolated directory
    const testRuntimeFilePath = path.join(ISOLATED_TEST_RUNTIME, 'workspaces.json');
    assert(
      fs.existsSync(testRuntimeFilePath),
      '9.1 JSON persistence file exists in isolated runtime directory'
    );

    // 9.2 Re-instantiate storage from disk and verify state
    const storage2 = new JsonStorageEngine(ISOLATED_TEST_RUNTIME);
    const reloadedWorkspaces = await storage2.getAll<any>('workspaces');
    const persistedRestoredWorkspace = reloadedWorkspaces.find((w: any) => w.id === approvedWorkspace.id);

    assert(
      Boolean(persistedRestoredWorkspace),
      '9.2 Simulated re-instantiated storage successfully loads persisted records'
    );
    assert(
      persistedRestoredWorkspace?.moderationStatus === 'Normal' &&
        persistedRestoredWorkspace?.reviewStatus === 'Approved' &&
        persistedRestoredWorkspace?.version === restoredWorkspace.version,
      '9.3 Persisted records retain full lifecycle status, review metadata, and version',
      `Version: ${persistedRestoredWorkspace?.version}, Status: ${persistedRestoredWorkspace?.reviewStatus}`
    );

    // =========================================================================
    // SECTION 10: Complete Cross-Role Submission-To-Review Lifecycle
    // =========================================================================
    console.log('\n--- SECTION 10: Complete Cross-Role Lifecycle Integration ---');

    // Step A: Organizer creates draft (v1)
    const lifecycleDraft = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: makeValidDraftPayload('Full Lifecycle E2E Space')
    });
    assert(lifecycleDraft.data.version === 1 && lifecycleDraft.data.reviewStatus === 'Draft', '10.1 Step A: Created draft v1');

    // Step B: Organizer updates draft (v2)
    const lifecycleUpdate = await apiRequest(`/workspaces/${lifecycleDraft.data.id}`, {
      method: 'PATCH',
      headers: { 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: {
        usableAreaSqm: 500,
        expectedVersion: 1
      }
    });
    assert(lifecycleUpdate.data.version === 2, '10.2 Step B: Organizer updated draft to v2');

    // Step C: Organizer submits for review (v3)
    const lifecycleSubmit = await apiRequest(`/workspaces/${lifecycleDraft.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: { expectedVersion: 2, agreementConfirmed: true }
    });
    assert(
      lifecycleSubmit.data.version === 3 && lifecycleSubmit.data.reviewStatus === 'Pending',
      '10.3 Step C: Organizer submitted to Pending v3'
    );

    // Step D: Administrator reviews and rejects due to incomplete info (v4)
    const lifecycleReject = await apiRequest(`/admin/workspaces/${lifecycleDraft.data.id}/review`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        reviewStatus: 'Rejected',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Please provide high-resolution photos and operating hours.',
        expectedVersion: 3
      }
    });
    assert(
      lifecycleReject.data.version === 4 && lifecycleReject.data.reviewStatus === 'Rejected',
      '10.4 Step D: Admin rejected with feedback to v4'
    );

    // Step E: Organizer updates photos and resubmits
    const lifecycleFix = await apiRequest(`/workspaces/${lifecycleDraft.data.id}`, {
      method: 'PATCH',
      headers: { 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: {
        description: 'Updated with all requested safety documentation and HD photos',
        expectedVersion: 4
      }
    });
    assert(lifecycleFix.data.version === 5, '10.5 Step E: Organizer edited workspace to v5');

    // Step F: Organizer resubmits (v6)
    const lifecycleResubmit = await apiRequest(`/workspaces/${lifecycleDraft.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: { expectedVersion: 5, agreementConfirmed: true }
    });
    assert(
      lifecycleResubmit.data.version === 6 && lifecycleResubmit.data.reviewStatus === 'Pending',
      '10.6 Step F: Organizer resubmitted to Pending v6'
    );

    // Step G: Administrator reviews and approves (v7)
    const lifecycleApprove = await apiRequest(`/admin/workspaces/${lifecycleDraft.data.id}/review`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'All photos and floor plans verified.',
        expectedVersion: 6
      }
    });
    assert(
      lifecycleApprove.data.version === 7 && lifecycleApprove.data.reviewStatus === 'Approved',
      '10.7 Step G: Administrator approved to v7'
    );

    // Step H: Administrator moderates / suspends due to noise (v8)
    const lifecycleSuspend = await apiRequest(`/admin/workspaces/${lifecycleDraft.data.id}/moderation`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Safety inspection requested by local authority',
        expectedVersion: 7
      }
    });
    assert(
      lifecycleSuspend.data.version === 8 && lifecycleSuspend.data.moderationStatus === 'Suspended',
      '10.8 Step H: Administrator suspended to v8'
    );

    // Step I: Administrator restores workspace (v9)
    const lifecycleRestore = await apiRequest(`/admin/workspaces/${lifecycleDraft.data.id}/moderation`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        moderationStatus: 'Normal',
        expectedVersion: 8
      }
    });
    assert(
      lifecycleRestore.data.version === 9 && lifecycleRestore.data.moderationStatus === 'Normal',
      '10.9 Step I: Administrator restored to v9'
    );

    // =========================================================================
    // SECTION 11: A06 Published KPI Semantics & Public Eligibility Verification
    // =========================================================================
    console.log('\n--- SECTION 11: A06 Published KPI Semantics & Public Eligibility Verification ---');

    const { isWorkspacePubliclyEligible } = await import('../../src/features/workspaces/api/types.ts');

    // Fixtures representing the 6 permutations:
    const p1 = {
      id: 'WS-KPI-PERM-1',
      name: 'KPI Space 1: Approved Active Normal Visible',
      reviewStatus: 'Approved' as const,
      operatingStatus: 'Active' as const,
      moderationStatus: 'Normal' as const,
      isListingVisible: true,
      organizerId: 'USR-ORG-C4',
      organizerLegalName: 'NexSpace Hub',
      organizerTaxId: '0109988776',
      organizerVerified: true,
      category: 'coworking_hub',
      streetAddress: '1 Nguyen Hue',
      city: 'Ho Chi Minh City',
      district: 'District 1',
      capacityDesks: 50,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const p2 = {
      ...p1,
      id: 'WS-KPI-PERM-2',
      name: 'KPI Space 2: Approved Inactive Normal Visible',
      operatingStatus: 'Inactive' as const
    };

    const p3 = {
      ...p1,
      id: 'WS-KPI-PERM-3',
      name: 'KPI Space 3: Approved Active Suspended Visible',
      moderationStatus: 'Suspended' as const
    };

    const p4 = {
      ...p1,
      id: 'WS-KPI-PERM-4',
      name: 'KPI Space 4: Approved Active Normal Invisible',
      isListingVisible: false
    };

    const p5 = {
      ...p1,
      id: 'WS-KPI-PERM-5',
      name: 'KPI Space 5: Pending Active Normal Visible',
      reviewStatus: 'Pending' as const
    };

    const p6 = {
      ...p1,
      id: 'WS-KPI-PERM-6',
      name: 'KPI Space 6: Rejected Active Normal Visible',
      reviewStatus: 'Rejected' as const
    };

    // 11.1 - 11.6 Verify pure predicate evaluation
    assert(isWorkspacePubliclyEligible(p1) === true, '11.1 Approved + Active + Normal + Visible => Published (true)');
    assert(isWorkspacePubliclyEligible(p2) === false, '11.2 Approved + Inactive => Not Published (false)');
    assert(isWorkspacePubliclyEligible(p3) === false, '11.3 Approved + Suspended => Not Published (false)');
    assert(isWorkspacePubliclyEligible(p4) === false, '11.4 Approved + Invisible => Not Published (false)');
    assert(isWorkspacePubliclyEligible(p5) === false, '11.5 Pending => Not Published (false)');
    assert(isWorkspacePubliclyEligible(p6) === false, '11.6 Rejected => Not Published (false)');

    // Persist all 6 permutations to isolated test runtime storage
    for (const permItem of [p1, p2, p3, p4, p5, p6]) {
      await storage2.create('workspaces', permItem);
    }

    // Query public API to verify exact agreement
    const publicWorkspacesRes = await apiRequest('/public/workspaces?limit=100');
    assert(publicWorkspacesRes.status === 200, '11.7 Public workspaces API returns 200 OK');
    const publicItems = publicWorkspacesRes.data.content || [];

    const hasP1 = publicItems.some((w: any) => w.id === p1.id);
    const hasP2 = publicItems.some((w: any) => w.id === p2.id);
    const hasP3 = publicItems.some((w: any) => w.id === p3.id);
    const hasP4 = publicItems.some((w: any) => w.id === p4.id);
    const hasP5 = publicItems.some((w: any) => w.id === p5.id);
    const hasP6 = publicItems.some((w: any) => w.id === p6.id);

    assert(hasP1 === true, '11.8 Public API includes eligible workspace (P1: Approved + Active + Normal + Visible)');
    assert(hasP2 === false, '11.9 Public API excludes inactive workspace (P2: Approved + Inactive)');
    assert(hasP3 === false, '11.10 Public API excludes suspended workspace (P3: Approved + Suspended)');
    assert(hasP4 === false, '11.11 Public API excludes invisible workspace (P4: Approved + Invisible)');
    assert(hasP5 === false, '11.12 Public API excludes pending workspace (P5: Pending)');
    assert(hasP6 === false, '11.13 Public API excludes rejected workspace (P6: Rejected)');

    // 11.14 Verify A06 Published KPI count agrees with Public API total
    const allSpacesForKpi = await storage2.getAll<any>('workspaces');
    const kpiPublishedCount = allSpacesForKpi.filter(isWorkspacePubliclyEligible).length;
    const publicApiTotal = publicWorkspacesRes.data.pagination.totalElements;
    assert(
      kpiPublishedCount === publicApiTotal,
      '11.14 A06 Published KPI count agrees with public Workspace API total count',
      `KPI Count: ${kpiPublishedCount}, Public API Count: ${publicApiTotal}`
    );

  } catch (err) {
    console.error('💥 Test suite encountered fatal error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      console.log('\n  ✓ Mock server stopped');
    }

    // Verify developer runtime JSON was never touched
    const finalDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
    if (finalDevRuntimeSha === initialDevRuntimeSha) {
      console.log(`  🛡️ DEV RUNTIME JSON INTACT: ${finalDevRuntimeSha}`);
    } else {
      console.error(`  🚨 CRITICAL ERROR: DEV RUNTIME JSON WAS MODIFIED!`);
      console.error(`  Expected: ${initialDevRuntimeSha}`);
      console.error(`  Actual:   ${finalDevRuntimeSha}`);
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
  console.log(`Phase C4 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhaseC4TestSuite();
