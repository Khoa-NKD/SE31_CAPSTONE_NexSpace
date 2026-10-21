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
      headers: {
        'x-mock-role': 'Organizer',
        'x-mock-user-id': 'USR-NON-EXISTENT'
      }
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
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      }
    });
    assert(
      adminPendingRes.status === 200 &&
        adminPendingRes.data.content.every((w: any) => w.reviewStatus === 'Pending'),
      '1.3 Administrator can filter workspaces by reviewStatus=Pending'
    );

    // 1.4 Admin filter by moderationStatus=Suspended
    const adminSuspendedRes = await apiRequest('/workspaces?moderationStatus=Suspended&limit=100', {
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      }
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
      body: makeValidDraftPayload('C4 Workspace For Rejection Testing')
    });
    await apiRequest(`/workspaces/${createDraft2.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
      body: { agreementConfirmed: true }
    });

    const pendingWorkspace2Res = await apiRequest(`/workspaces/${createDraft2.data.id}`, {
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      }
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
      body: makeValidDraftPayload('C4 Workspace For Concurrent Review')
    });
    const submitted3Res = await apiRequest(`/workspaces/${createDraft3.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-ORG-C4' },
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
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      }
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: makeValidDraftPayload('Full Lifecycle E2E Space')
    });
    assert(lifecycleDraft.data.version === 1 && lifecycleDraft.data.reviewStatus === 'Draft', '10.1 Step A: Created draft v1');

    // Step B: Organizer updates draft (v2)
    const lifecycleUpdate = await apiRequest(`/workspaces/${lifecycleDraft.data.id}`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: {
        usableAreaSqm: 500,
        expectedVersion: 1
      }
    });
    assert(lifecycleUpdate.data.version === 2, '10.2 Step B: Organizer updated draft to v2');

    // Step C: Organizer submits for review (v3)
    const lifecycleSubmit = await apiRequest(`/workspaces/${lifecycleDraft.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-LIFECYCLE' },
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
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-LIFECYCLE' },
      body: {
        description: 'Updated with all requested safety documentation and HD photos',
        expectedVersion: 4
      }
    });
    assert(lifecycleFix.data.version === 5, '10.5 Step E: Organizer edited workspace to v5');

    // Step F: Organizer resubmits (v6)
    const lifecycleResubmit = await apiRequest(`/workspaces/${lifecycleDraft.data.id}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-LIFECYCLE' },
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

    // =========================================================================
    // SECTION 12: A06 Admin Dashboard Data Integrity & De-fabrication Regressions
    // =========================================================================
    console.log('\n--- SECTION 12: A06 Admin Dashboard Data Integrity & De-fabrication Regressions ---');

    const {
      computeWorkspaceKpis,
      deriveModerationDecisionRecords,
      deriveModerationWorkloadItems,
      MOCK_QUALITY_HEALTH_METRICS,
      INITIAL_MODERATION_RECORDS
    } = await import('../../src/features/admin-workspaces/data/mock-workspaces.ts');

    // 12.1 Empty Workspace API response produces zero actual counts
    const emptyKpis = computeWorkspaceKpis([]);
    assert(
      emptyKpis.totalPublishedSpaces === 0 &&
        emptyKpis.metroHubsCount === 0 &&
        emptyKpis.pendingModerationCount === 0 &&
        emptyKpis.suspendedCount === 0 &&
        emptyKpis.partnerDraftsCount === 0 &&
        emptyKpis.publishedMonthlyGrowth === null &&
        emptyKpis.pendingOldestHours === 0,
      '12.1 Empty Workspace API response produces zero KPI counts without fabricated fallbacks'
    );

    const nullKpis = computeWorkspaceKpis(null);
    assert(
      nullKpis.totalPublishedSpaces === 0 && nullKpis.metroHubsCount === 0,
      '12.2 Null/loading workspace list produces zero KPI counts (no fake 618 published spaces)'
    );

    // 12.3 Approved but unpublished workspace is NOT counted as Published
    const approvedUnpublishedWs: any = {
      id: 'WS-REG-UNPUB',
      name: 'Approved Inactive Workspace',
      reviewStatus: 'Approved',
      operatingStatus: 'Inactive',
      moderationStatus: 'Normal',
      isListingVisible: false,
      city: 'HCMC'
    };
    const kpisWithUnpub = computeWorkspaceKpis([approvedUnpublishedWs]);
    assert(
      kpisWithUnpub.totalPublishedSpaces === 0,
      '12.3 Approved but unpublished workspace is excluded from totalPublishedSpaces'
    );
    assert(
      kpisWithUnpub.metroHubsCount === 1,
      '12.4 Metro hubs count reflects actual distinct cities without static fallback 14'
    );
    assert(
      kpisWithUnpub.publishedMonthlyGrowth === null,
      '12.5 Fixed monthly growth 12 is removed when no historical telemetry supports it'
    );

    // 12.6 Static mock decision records are strictly excluded
    const dynamicApprovedWs: any = {
      id: 'WS-REG-DYN-1',
      workspaceCode: 'WS-DYN-1',
      name: 'Dynamic Persisted Hub',
      streetAddress: '123 Nguyen Hue',
      city: 'HCMC',
      organizerLegalName: 'True Partner JSC',
      reviewStatus: 'Approved',
      operatingStatus: 'Active',
      moderationStatus: 'Normal',
      isListingVisible: true,
      reviewedBy: 'Auditor Jane',
      reviewedAt: '2026-10-21T08:00:00.000Z',
      reviewFeedback: 'Compliance inspection verified successfully.'
    };

    const decisions = deriveModerationDecisionRecords([dynamicApprovedWs]);
    const hasInitialMocks = decisions.some((d: any) =>
      INITIAL_MODERATION_RECORDS.some((mock: any) => mock.id === d.id || mock.workspaceId === d.workspaceId)
    );
    assert(
      hasInitialMocks === false && decisions.length === 1,
      '12.6 Static INITIAL_MODERATION_RECORDS are strictly excluded from live decisions'
    );

    // 12.7 Empty review history returns empty state without appending static mocks
    const draftOnlyWorkspaces: any[] = [
      { id: 'WS-DRAFT-1', name: 'Draft A', reviewStatus: 'Draft', moderationStatus: 'Normal' },
      { id: 'WS-PEND-1', name: 'Pending B', reviewStatus: 'Pending', moderationStatus: 'Normal' }
    ];
    const emptyDecisions = deriveModerationDecisionRecords(draftOnlyWorkspaces);
    assert(
      emptyDecisions.length === 0,
      '12.7 Empty review history returns empty array for meaningful UI empty state'
    );

    // 12.8 Approved event is labeled 'Approved' (not mislabeled 'Approved & Published')
    assert(
      decisions[0].action === 'Approved',
      `12.8 Approved event action is "Approved" (received: "${decisions[0].action}"), not mislabeled "Approved & Published"`
    );
    assert(
      decisions[0].actionStatus === 'approved',
      '12.9 Approved event actionStatus is "approved"'
    );

    // 12.10 Suspended event does NOT imply a completed safety audit
    const dynamicSuspendedWs: any = {
      id: 'WS-REG-DYN-2',
      workspaceCode: 'WS-DYN-2',
      name: 'Suspended Hub',
      streetAddress: '456 Le Loi',
      city: 'HCMC',
      organizerLegalName: 'Urban Hubs Ltd',
      reviewStatus: 'Approved',
      operatingStatus: 'Active',
      moderationStatus: 'Suspended',
      isListingVisible: true,
      suspendedBy: 'Compliance Lead David',
      suspendedAt: '2026-10-21T09:00:00.000Z',
      suspendReason: 'Repeated noise grievance violations reported by neighbors.'
    };
    const suspendedDecisions = deriveModerationDecisionRecords([dynamicSuspendedWs]);
    assert(
      suspendedDecisions[0].action === 'Suspended',
      `12.10 Suspended event action is strictly "Suspended" (received: "${suspendedDecisions[0].action}"), avoiding fabricated safety audit claim`
    );
    assert(
      suspendedDecisions[0].auditTrailNotes === dynamicSuspendedWs.suspendReason,
      '12.11 Suspended record auditTrailNotes reflects actual suspendReason without alteration'
    );

    // 12.12 Real persisted review metadata renders genuine administrator identity and timestamp
    assert(
      decisions[0].adminHandler.name === 'Auditor Jane',
      '12.12 Real reviewer name "Auditor Jane" is preserved (not fabricated as Marcus Vance)'
    );
    assert(
      decisions[0].adminHandler.initials === 'AJ',
      '12.13 Admin initials derived correctly from actual handler'
    );
    assert(
      decisions[0].auditTrailNotes === dynamicApprovedWs.reviewFeedback,
      '12.14 Review feedback note preserved accurately in audit trail'
    );

    // 12.15 Unsupported Quality & Compliance metrics display neutral unavailable states
    assert(
      MOCK_QUALITY_HEALTH_METRICS.nomadRating === '—',
      '12.15 Nomad rating displays neutral unavailable state "—" instead of fabricated 4.85'
    );
    assert(
      MOCK_QUALITY_HEALTH_METRICS.totalRatingsCount === 'Rating telemetry unavailable',
      '12.16 Total ratings count displays neutral unavailable state instead of fabricated 14.2k'
    );
    assert(
      MOCK_QUALITY_HEALTH_METRICS.hygieneFlags === '—' &&
        MOCK_QUALITY_HEALTH_METRICS.hygieneCleanPeriod === 'Hygiene telemetry unavailable',
      '12.17 Hygiene indicators display neutral unavailable states instead of fabricated cleanliness history'
    );
    assert(
      MOCK_QUALITY_HEALTH_METRICS.gradeBadge === 'Telemetry Pending',
      '12.18 Grade badge labeled "Telemetry Pending"'
    );
    assert(
      MOCK_QUALITY_HEALTH_METRICS.standardsEngineNote === 'Awaiting Audit Integration',
      '12.19 Standards engine note labeled "Awaiting Audit Integration"'
    );

    // 12.20 Moderation Workload Items are derived from actual pending workspaces
    const workloadWithPending = deriveModerationWorkloadItems([
      { id: 'WS-P1', name: 'Pending 1', reviewStatus: 'Pending', moderationStatus: 'Normal' },
      { id: 'WS-P2', name: 'Pending 2', reviewStatus: 'Pending', moderationStatus: 'Normal' }
    ] as any);
    assert(
      workloadWithPending.length === 1 &&
        workloadWithPending[0].title === '2 Pending Workspace Reviews' &&
        workloadWithPending[0].priorityLabel === 'Priority 1',
      '12.20 Moderation Workload items derived from canonical pending workspaces (no fabricated floor plan counts)'
    );

    const workloadEmpty = deriveModerationWorkloadItems([]);
    assert(
      workloadEmpty.length === 0,
      '12.21 Moderation Workload empty when no pending workspaces exist'
    );

    // =========================================================================
    // SECTION 13: Focused Security Regression Tests (Mock Authorization Final Gate)
    // =========================================================================
    console.log('\n--- SECTION 13: Focused Security Regression Tests (Mock Authorization Final Gate) ---');

    // 13.1 Admin review without role header => denied (403 Forbidden)
    const reviewNoRole = await apiRequest(`/admin/workspaces/WS-108/review`, {
      method: 'PATCH',
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: 1
      }
    });
    assert(
      reviewNoRole.status === 403,
      '13.1 Admin review without role header => 403 Forbidden'
    );

    // 13.2 Admin moderation without role header => denied (403 Forbidden)
    const modNoRole = await apiRequest(`/admin/workspaces/WS-108/moderation`, {
      method: 'PATCH',
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Security check',
        expectedVersion: 1
      }
    });
    assert(
      modNoRole.status === 403,
      '13.2 Admin moderation without role header => 403 Forbidden'
    );

    // 13.3 Administrator review with Administrator role but missing identity => 403 Forbidden
    const reviewNoId = await apiRequest(`/admin/workspaces/WS-108/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: 1
      }
    });
    assert(
      reviewNoId.status === 403,
      '13.3 Administrator review with Administrator role but missing identity => 403 Forbidden'
    );

    // 13.4 Administrator moderation with Administrator role but missing identity => 403 Forbidden
    const modNoId = await apiRequest(`/admin/workspaces/WS-108/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Security check',
        expectedVersion: 1
      }
    });
    assert(
      modNoId.status === 403,
      '13.4 Administrator moderation with Administrator role but missing identity => 403 Forbidden'
    );

    // 13.5 Administrator role paired with Organizer identity header => 403 Forbidden
    const adminWithOrgId = await apiRequest(`/admin/workspaces/WS-108/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-organizer-id': 'USR-9432'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: 1
      }
    });
    assert(
      adminWithOrgId.status === 403,
      '13.5 Administrator role paired with Organizer identity header => 403 Forbidden'
    );

    // 13.6 Administrator role with Organizer user ID => 403 Forbidden
    const adminWithOrgUserId = await apiRequest(`/admin/workspaces/WS-108/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-9432' // Sarah Jenkins is an Organizer in users.json
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: 1
      }
    });
    assert(
      adminWithOrgUserId.status === 403,
      '13.6 Administrator role with Organizer user ID => 403 Forbidden'
    );

    // 13.7 Organizer attempting review => denied (403 Forbidden)
    const orgReview = await apiRequest(`/admin/workspaces/WS-108/review`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-9432'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        expectedVersion: 1
      }
    });
    assert(
      orgReview.status === 403,
      '13.7 Organizer attempting review => 403 Forbidden'
    );

    // 13.8 Customer attempting moderation => denied (403 Forbidden)
    const custMod = await apiRequest(`/admin/workspaces/WS-108/moderation`, {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Customer',
        'x-mock-user-id': 'USR-8821'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Unauthorized moderation attempt',
        expectedVersion: 1
      }
    });
    assert(
      custMod.status === 403,
      '13.8 Customer attempting moderation => 403 Forbidden'
    );

    // 13.9 Reviewer mismatch between header and body => denied (403 Forbidden)
    const reviewerMismatch = await apiRequest('/admin/workspaces/WS-108/review', {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-ADMIN-OTHER',
        expectedVersion: 1
      }
    });
    assert(
      reviewerMismatch.status === 403,
      '13.9 Reviewer mismatch between header and body => 403 Forbidden'
    );

    // 13.10 Moderator mismatch between header and body => denied (403 Forbidden)
    const moderatorMismatch = await apiRequest('/admin/workspaces/WS-108/moderation', {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-ADMIN-OTHER',
        suspendReason: 'Mismatch test',
        expectedVersion: 1
      }
    });
    assert(
      moderatorMismatch.status === 403,
      '13.10 Moderator mismatch between header and body => 403 Forbidden'
    );

    // 13.11 Legitimate Administrator review => succeeds (200 OK) & persists validated caller
    const ws108PreReview = await apiRequest('/workspaces/WS-108', {
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      }
    });
    assert(ws108PreReview.status === 200, 'WS-108 detail fetched by Administrator');
    const legitReview = await apiRequest('/admin/workspaces/WS-108/review', {
      method: 'PATCH',
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Authorized review passed',
        expectedVersion: ws108PreReview.data.version
      }
    });
    assert(
      legitReview.status === 200 &&
        legitReview.data?.reviewStatus === 'Approved' &&
        legitReview.data?.reviewedBy === 'USR-1882',
      '13.11 Legitimate Administrator review => 200 OK & records validated caller'
    );

    // 13.12 GET private workspace list with no role but valid x-organizer-id => 403 Forbidden
    const listNoRole = await apiRequest('/workspaces', {
      headers: {
        'x-organizer-id': 'USR-9432'
      }
    });
    assert(
      listNoRole.status === 403,
      '13.12 GET private workspace list with no role but valid x-organizer-id => 403 Forbidden'
    );

    // 13.13 GET private workspace details with no role but valid x-organizer-id => 403 Forbidden
    const detailNoRole = await apiRequest('/workspaces/WS-104', {
      headers: {
        'x-organizer-id': 'USR-9432'
      }
    });
    assert(
      detailNoRole.status === 403,
      '13.13 GET private workspace details with no role but valid x-organizer-id => 403 Forbidden'
    );

    // 13.14 Invalid role with Organizer ID => 403 Forbidden
    const invalidRoleDetail = await apiRequest('/workspaces/WS-104', {
      headers: {
        'x-mock-role': 'InvalidGuestRole',
        'x-organizer-id': 'USR-9432'
      }
    });
    assert(
      invalidRoleDetail.status === 403,
      '13.14 Invalid role with Organizer ID => 403 Forbidden'
    );

    // 13.15 Customer role with Organizer ID => 403 Forbidden
    const custWithOrgId = await apiRequest('/workspaces/WS-104', {
      headers: {
        'x-mock-role': 'Customer',
        'x-organizer-id': 'USR-9432'
      }
    });
    assert(
      custWithOrgId.status === 403,
      '13.15 Customer role with Organizer ID => 403 Forbidden'
    );

    // 13.16 Conflicting identity headers => fail closed (403 Forbidden)
    const conflictingHeaders = await apiRequest('/workspaces/WS-104', {
      headers: {
        'x-mock-role': 'Organizer',
        'x-mock-user-id': 'USR-8821', // Customer ID
        'x-organizer-id': 'USR-9432'  // Organizer ID
      }
    });
    assert(
      conflictingHeaders.status === 403,
      '13.16 Conflicting identity headers => fail closed (403 Forbidden)'
    );

    // 13.17 Conflicting role headers => fail closed (403 Forbidden)
    const conflictingRoleHeaders = await apiRequest('/workspaces/WS-104', {
      headers: {
        'x-mock-role': 'Administrator',
        'x-role': 'Customer',
        'x-mock-user-id': 'USR-1882'
      }
    });
    assert(
      conflictingRoleHeaders.status === 403,
      '13.17 Conflicting role headers => fail closed (403 Forbidden)'
    );

    // 13.18 Owner Organizer GET workspace detail with role and own ID => 200 OK
    const ownerDetail = await apiRequest('/workspaces/WS-108', {
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-2194'
      }
    });
    assert(
      ownerDetail.status === 200 && ownerDetail.data?.id === 'WS-108',
      '13.18 Owner Organizer GET workspace detail => 200 OK'
    );

    // 13.19 Non-owner Organizer GET workspace detail => denied (403 Forbidden)
    const nonOwnerDetail = await apiRequest('/workspaces/WS-108', {
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-OTHER-ORG'
      }
    });
    assert(
      nonOwnerDetail.status === 403,
      '13.19 Non-owner Organizer GET workspace detail => 403 Forbidden'
    );

    // 13.20 Customer GET private workspace detail => denied (403 Forbidden)
    const custDetail = await apiRequest('/workspaces/WS-108', {
      headers: {
        'x-mock-role': 'Customer',
        'x-mock-user-id': 'USR-8821'
      }
    });
    assert(
      custDetail.status === 403,
      '13.20 Customer GET private workspace detail => 403 Forbidden'
    );

    // 13.21 Anonymous GET workspace detail => denied (403 Forbidden)
    const anonDetail = await apiRequest('/workspaces/WS-108');
    assert(
      anonDetail.status === 403,
      '13.21 Anonymous GET private workspace detail => 403 Forbidden'
    );

    // 13.22 Anonymous GET workspaces list => denied (403 Forbidden)
    const anonList = await apiRequest('/workspaces');
    assert(
      anonList.status === 403,
      '13.22 Anonymous GET private workspaces list => 403 Forbidden'
    );

    // 13.23 Public Workspace detail => returns safe projection only (no taxId, no reviewer, no revenue)
    const publicDetail = await apiRequest('/public/workspaces/WS-104');
    assert(
      publicDetail.status === 200 &&
        publicDetail.data?.id === 'WS-104' &&
        publicDetail.data?.organizerTaxId === undefined &&
        publicDetail.data?.reviewedBy === undefined &&
        publicDetail.data?.grossRevenueMtd === undefined,
      '13.23 Public Workspace detail => 200 OK safe projection only'
    );

    // 13.24 Public Workspace list => returns safe projections only
    const publicList = await apiRequest('/public/workspaces');
    assert(
      publicList.status === 200 &&
        Array.isArray(publicList.data?.content) &&
        publicList.data.content.length > 0 &&
        publicList.data.content.every((w: any) => w.organizerTaxId === undefined && w.reviewedBy === undefined),
      '13.24 Public Workspace list => 200 OK safe projections only'
    );

    // 13.25 Organizer listing another organizerId => denied cross-tenant (403 Forbidden)
    const crossTenantList = await apiRequest('/workspaces?organizerId=USR-OTHER', {
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-9432'
      }
    });
    assert(
      crossTenantList.status === 403,
      '13.25 Organizer listing another organizerId => 403 Forbidden cross-tenant isolation'
    );

    // 13.26 Organizer listing own workspaces without query => 200 OK scoped strictly to caller
    const ownList = await apiRequest('/workspaces', {
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-9432'
      }
    });
    assert(
      ownList.status === 200 &&
        Array.isArray(ownList.data?.content) &&
        ownList.data.content.every((w: any) => w.organizerId === 'USR-9432'),
      '13.26 Organizer listing own workspaces without query => 200 OK scoped to caller'
    );

    // 13.27 Admin platform-wide listing => succeeds (200 OK)
    const adminList = await apiRequest('/workspaces', {
      headers: {
        'x-mock-role': 'Administrator',
        'x-mock-user-id': 'USR-1882'
      }
    });
    assert(
      adminList.status === 200 && Array.isArray(adminList.data?.content) && adminList.data.content.length > 0,
      '13.27 Admin platform-wide listing => 200 OK'
    );

    // 13.28 Legacy alias does not bypass detail authorization
    const aliasUnauth = await apiRequest('/workspaces/westlake-loft-hanoi', {
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-UNAUTHORIZED'
      }
    });
    assert(
      aliasUnauth.status === 403,
      '13.28a Legacy alias does not bypass detail authorization (unauthorized organizer => 403)'
    );

    const aliasAuth = await apiRequest('/workspaces/westlake-loft-hanoi', {
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-2194'
      }
    });
    assert(
      aliasAuth.status === 200 && aliasAuth.data?.id === 'WS-108',
      '13.28b Legacy alias resolves authorized detail for owner organizer (200 OK)'
    );

    // =========================================================================
    // SECTION 13 (Cont.): Organizer Mutation Authorization Consistency Gate
    // =========================================================================
    console.log('\n--- SECTION 13 (Cont.): Workspace Mutation Authorization Gate ---');

    function getIsolatedWorkspace(id: string) {
      const data = JSON.parse(fs.readFileSync(path.join(ISOLATED_TEST_RUNTIME, 'workspaces.json'), 'utf8'));
      return data.find((w: any) => w.id === id);
    }

    // --- 1. POST /workspaces (Create Authorization) ---
    // 13.29 Missing role => 403
    const createNoRole = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { name: 'Unauthorized Create', category: 'coworking_hub', streetAddress: '123 St', city: 'HCMC', district: 'D1' }
    });
    assert(createNoRole.status === 403, '13.29 POST /workspaces without role returns 403 Forbidden');

    // 13.30 Missing identity => 403
    const createNoId = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer' },
      body: { name: 'Unauthorized Create', category: 'coworking_hub', streetAddress: '123 St', city: 'HCMC', district: 'D1' }
    });
    assert(createNoId.status === 403, '13.30 POST /workspaces without identity returns 403 Forbidden');

    // 13.31 Customer role => 403
    const createCustomer = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'Customer', 'x-mock-user-id': 'USR-9432' },
      body: { name: 'Unauthorized Create', category: 'coworking_hub', streetAddress: '123 St', city: 'HCMC', district: 'D1' }
    });
    assert(createCustomer.status === 403, '13.31 POST /workspaces with Customer role returns 403 Forbidden');

    // 13.32 Invalid role => 403
    const createInvalidRole = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'SuperAdmin', 'x-mock-user-id': 'USR-9432' },
      body: { name: 'Unauthorized Create', category: 'coworking_hub', streetAddress: '123 St', city: 'HCMC', district: 'D1' }
    });
    assert(createInvalidRole.status === 403, '13.32 POST /workspaces with invalid role returns 403 Forbidden');

    // 13.33 Administrator role cannot create organizer workspaces => 403
    const createAdmin = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: { name: 'Admin Attempt Create', category: 'coworking_hub', streetAddress: '123 St', city: 'HCMC', district: 'D1' }
    });
    assert(createAdmin.status === 403, '13.33 POST /workspaces with Administrator role returns 403 Forbidden');

    // 13.34 Conflicting role/identity headers => 403
    const createConflict = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-9432', 'x-admin-id': 'USR-1882' },
      body: { name: 'Conflicting Headers Create', category: 'coworking_hub', streetAddress: '123 St', city: 'HCMC', district: 'D1' }
    });
    assert(createConflict.status === 403, '13.34 POST /workspaces with conflicting identity headers returns 403 Forbidden');

    // 13.35 Create payload organizerId mismatch with caller identity => 403
    const createMismatch = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: {
        name: 'Spoofed Organizer Create',
        category: 'coworking_hub',
        streetAddress: '123 St',
        city: 'HCMC',
        district: 'D1',
        organizerId: 'USR-2194'
      }
    });
    assert(createMismatch.status === 403, '13.35 POST /workspaces with mismatched body organizerId returns 403 Forbidden');

    // 13.36 Valid Organizer creates Draft successfully (201 Created)
    const validCreateKey = `draft-key-${Date.now()}`;
    const validDraftPayload = {
      ...makeValidDraftPayload('Gate Authorized Draft Space'),
      organizerId: 'USR-9432',
      clientDraftKey: validCreateKey
    };
    const validCreateRes = await apiRequest('/workspaces', {
      method: 'POST',
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-9432',
        'x-client-draft-key': validCreateKey
      },
      body: validDraftPayload
    });
    assert(
      validCreateRes.status === 201 && validCreateRes.data?.organizerId === 'USR-9432',
      '13.36 Valid Organizer creates Draft workspace (201 Created)'
    );
    const gateCreatedId = validCreateRes.data?.id;

    // 13.37 Concurrent create idempotency with clientDraftKey returns existing
    const duplicateCreateRes = await apiRequest('/workspaces', {
      method: 'POST',
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'USR-9432',
        'x-client-draft-key': validCreateKey
      },
      body: validDraftPayload
    });
    assert(
      duplicateCreateRes.status === 200 && duplicateCreateRes.data?.id === gateCreatedId,
      '13.37 Idempotent create with matching clientDraftKey returns 200 and existing workspace'
    );

    // --- 2. PATCH /workspaces/:id (Update Authorization) ---
    // Target workspace: WS-108 (owned by USR-2194)
    const ws108Before = getIsolatedWorkspace('WS-108');
    const ws108InitialVersion = ws108Before.version;
    const ws108InitialName = ws108Before.name;

    // 13.38 Update without role => 403, no change persisted
    const updateNoRole = await apiRequest('/workspaces/WS-108', {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-2194' },
      body: { name: 'Hacked Name No Role' }
    });
    assert(updateNoRole.status === 403, '13.38 PATCH /workspaces/:id without role returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-108').name === ws108InitialName, '13.38b WS-108 remains unmutated after 403 denial');

    // 13.39 Update without identity => 403, no change persisted
    const updateNoId = await apiRequest('/workspaces/WS-108', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer' },
      body: { name: 'Hacked Name No Id' }
    });
    assert(updateNoId.status === 403, '13.39 PATCH /workspaces/:id without identity returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-108').name === ws108InitialName, '13.39b WS-108 remains unmutated after 403 denial');

    // 13.40 Update with Customer role => 403, no change persisted
    const updateCustomer = await apiRequest('/workspaces/WS-108', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Customer', 'x-mock-user-id': 'USR-2194' },
      body: { name: 'Hacked Name Customer' }
    });
    assert(updateCustomer.status === 403, '13.40 PATCH /workspaces/:id with Customer role returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-108').name === ws108InitialName, '13.40b WS-108 remains unmutated after 403 denial');

    // 13.41 Update with Administrator role attempting Organizer PATCH => 403, no change persisted
    const updateAdmin = await apiRequest('/workspaces/WS-108', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: { name: 'Hacked Name Admin' }
    });
    assert(updateAdmin.status === 403, '13.41 PATCH /workspaces/:id with Administrator role returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-108').name === ws108InitialName, '13.41b WS-108 remains unmutated after 403 denial');

    // 13.42 Update by Wrong Organizer tenant => 403, no change persisted
    const updateWrongOrg = await apiRequest('/workspaces/WS-108', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { name: 'Hacked Name Wrong Org' }
    });
    assert(updateWrongOrg.status === 403, '13.42 PATCH /workspaces/:id by wrong Organizer tenant returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-108').name === ws108InitialName, '13.42b WS-108 remains unmutated after cross-tenant 403 denial');

    // 13.43 Update with Conflicting role/identity headers => 403
    const updateConflict = await apiRequest('/workspaces/WS-108', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-2194', 'x-role': 'Customer' },
      body: { name: 'Hacked Name Conflict' }
    });
    assert(updateConflict.status === 403, '13.43 PATCH /workspaces/:id with conflicting role headers returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-108').name === ws108InitialName, '13.43b WS-108 remains unmutated after conflicting 403 denial');

    // 13.44 Update legacy alias by Wrong Organizer tenant => 403
    const updateAliasWrongOrg = await apiRequest('/workspaces/westlake-loft-hanoi', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { name: 'Hacked Name Alias Wrong Org' }
    });
    assert(updateAliasWrongOrg.status === 403, '13.44 PATCH legacy alias by wrong Organizer tenant returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-108').name === ws108InitialName, '13.44b WS-108 remains unmutated after alias cross-tenant 403');

    // 13.45 Update by Valid Owning Organizer => 200 OK, persisted with incremented version
    const updateValid = await apiRequest('/workspaces/WS-108', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-2194' },
      body: {
        shortDescription: 'Authorized description update by USR-2194',
        expectedVersion: ws108InitialVersion
      }
    });
    assert(
      updateValid.status === 200 && updateValid.data?.shortDescription === 'Authorized description update by USR-2194',
      '13.45 Valid Owning Organizer updates workspace successfully (200 OK)'
    );
    const ws108After = getIsolatedWorkspace('WS-108');
    assert(
      ws108After.shortDescription === 'Authorized description update by USR-2194' && ws108After.version === ws108InitialVersion + 1,
      '13.45b WS-108 data persisted to storage with version increment'
    );

    // --- 3. PATCH /workspaces/:id/lifecycle (Lifecycle Authorization) ---
    // Target workspace: WS-104 (owned by USR-9432, Active, Normal)
    const ws104Before = getIsolatedWorkspace('WS-104');
    const ws104InitialStatus = ws104Before.operatingStatus;
    const ws104InitialVersion = ws104Before.version;

    // 13.46 Lifecycle without role => 403, no change persisted
    const lifecycleNoRole = await apiRequest('/workspaces/WS-104/lifecycle', {
      method: 'PATCH',
      headers: { 'x-organizer-id': 'USR-9432' },
      body: { action: 'pause' }
    });
    assert(lifecycleNoRole.status === 403, '13.46 PATCH /lifecycle without role returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-104').operatingStatus === ws104InitialStatus, '13.46b WS-104 operatingStatus intact after 403');

    // 13.47 Lifecycle without identity => 403
    const lifecycleNoId = await apiRequest('/workspaces/WS-104/lifecycle', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer' },
      body: { action: 'pause' }
    });
    assert(lifecycleNoId.status === 403, '13.47 PATCH /lifecycle without identity returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-104').operatingStatus === ws104InitialStatus, '13.47b WS-104 operatingStatus intact after 403');

    // 13.48 Lifecycle with Customer role => 403
    const lifecycleCustomer = await apiRequest('/workspaces/WS-104/lifecycle', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Customer', 'x-mock-user-id': 'USR-9432' },
      body: { action: 'pause' }
    });
    assert(lifecycleCustomer.status === 403, '13.48 PATCH /lifecycle with Customer role returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-104').operatingStatus === ws104InitialStatus, '13.48b WS-104 operatingStatus intact after 403');

    // 13.49 Lifecycle with Administrator role attempting organizer lifecycle => 403
    const lifecycleAdmin = await apiRequest('/workspaces/WS-104/lifecycle', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: { action: 'pause' }
    });
    assert(lifecycleAdmin.status === 403, '13.49 PATCH /lifecycle with Administrator role returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-104').operatingStatus === ws104InitialStatus, '13.49b WS-104 operatingStatus intact after 403');

    // 13.50 Lifecycle by Wrong Organizer tenant => 403
    const lifecycleWrongOrg = await apiRequest('/workspaces/WS-104/lifecycle', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-2194' },
      body: { action: 'pause' }
    });
    assert(lifecycleWrongOrg.status === 403, '13.50 PATCH /lifecycle by wrong Organizer tenant returns 403 Forbidden');
    assert(getIsolatedWorkspace('WS-104').operatingStatus === ws104InitialStatus, '13.50b WS-104 operatingStatus intact after cross-tenant 403');

    // 13.51 Lifecycle legacy alias by Wrong Organizer tenant => 403
    const lifecycleAliasWrongOrg = await apiRequest('/workspaces/ba-dinh-boardroom-hanoi/lifecycle', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { action: 'pause' }
    });
    assert(lifecycleAliasWrongOrg.status === 403, '13.51 PATCH legacy alias lifecycle by wrong Organizer tenant returns 403 Forbidden');

    // 13.52 Valid Owning Organizer updates lifecycle (pause) => 200 OK
    const lifecycleValid = await apiRequest('/workspaces/WS-104/lifecycle', {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { action: 'pause', expectedVersion: ws104InitialVersion, reason: 'Temporary maintenance pause' }
    });
    assert(
      lifecycleValid.status === 200 && lifecycleValid.data?.operatingStatus === 'Inactive',
      '13.52 Valid Owning Organizer pauses workspace lifecycle (200 OK)'
    );
    const ws104Paused = getIsolatedWorkspace('WS-104');
    assert(
      ws104Paused.operatingStatus === 'Inactive' && ws104Paused.version === ws104InitialVersion + 1,
      '13.52b WS-104 persisted as Inactive with version increment'
    );

    // --- 4. POST /workspaces/:id/submit (Submit for Review Authorization) ---
    // Target workspace: gateCreatedId (owned by USR-9432, reviewStatus = 'Draft')
    const draftBefore = getIsolatedWorkspace(gateCreatedId);
    const draftInitialReviewStatus = draftBefore.reviewStatus;

    // 13.53 Submit without role => 403, no change persisted
    const submitNoRole = await apiRequest(`/workspaces/${gateCreatedId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': 'USR-9432' }
    });
    assert(submitNoRole.status === 403, '13.53 POST /submit without role returns 403 Forbidden');
    assert(getIsolatedWorkspace(gateCreatedId).reviewStatus === draftInitialReviewStatus, '13.53b Draft reviewStatus intact after 403');

    // 13.54 Submit without identity => 403
    const submitNoId = await apiRequest(`/workspaces/${gateCreatedId}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer' }
    });
    assert(submitNoId.status === 403, '13.54 POST /submit without identity returns 403 Forbidden');
    assert(getIsolatedWorkspace(gateCreatedId).reviewStatus === draftInitialReviewStatus, '13.54b Draft reviewStatus intact after 403');

    // 13.55 Submit with Customer role => 403
    const submitCustomer = await apiRequest(`/workspaces/${gateCreatedId}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Customer', 'x-mock-user-id': 'USR-9432' }
    });
    assert(submitCustomer.status === 403, '13.55 POST /submit with Customer role returns 403 Forbidden');
    assert(getIsolatedWorkspace(gateCreatedId).reviewStatus === draftInitialReviewStatus, '13.55b Draft reviewStatus intact after 403');

    // 13.56 Submit with Administrator role attempting submit => 403
    const submitAdmin = await apiRequest(`/workspaces/${gateCreatedId}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' }
    });
    assert(submitAdmin.status === 403, '13.56 POST /submit with Administrator role returns 403 Forbidden');
    assert(getIsolatedWorkspace(gateCreatedId).reviewStatus === draftInitialReviewStatus, '13.56b Draft reviewStatus intact after 403');

    // 13.57 Submit by Wrong Organizer tenant => 403
    const submitWrongOrg = await apiRequest(`/workspaces/${gateCreatedId}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-2194' }
    });
    assert(submitWrongOrg.status === 403, '13.57 POST /submit by wrong Organizer tenant returns 403 Forbidden');
    assert(getIsolatedWorkspace(gateCreatedId).reviewStatus === draftInitialReviewStatus, '13.57b Draft reviewStatus intact after cross-tenant 403');

    // 13.58 Submit by Valid Owning Organizer => 200 OK, status transitions to Pending
    const submitValid = await apiRequest(`/workspaces/${gateCreatedId}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { agreementConfirmed: true }
    });
    assert(
      submitValid.status === 200 && submitValid.data?.reviewStatus === 'Pending',
      '13.58 Valid Owning Organizer submits workspace for review (200 OK, reviewStatus: Pending)'
    );
    const draftAfterSubmit = getIsolatedWorkspace(gateCreatedId);
    assert(
      draftAfterSubmit.reviewStatus === 'Pending',
      '13.58b Submitted workspace persisted as Pending in storage'
    );

    // =========================================================================
    // SECTION 14: End-to-End Complete Lifecycle Acceptance
    // =========================================================================
    console.log('\n--- SECTION 14: End-to-End Lifecycle & Authorization Acceptance ---');

    // Flow: Organizer creates Draft -> edits -> saves -> reloads -> submits -> Admin approves ->
    //       Organizer publishes -> Admin suspends -> Organizer cannot resume while suspended -> Admin restores.
    const e2eOrgHeaders = { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' };
    const e2eAdminHeaders = { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' };

    // Step 1: Organizer creates Draft
    const e2eCreateRes = await apiRequest('/workspaces', {
      method: 'POST',
      headers: e2eOrgHeaders,
      body: makeValidDraftPayload('E2E Lifecycle Verification Hub')
    });
    assert(e2eCreateRes.status === 201 && e2eCreateRes.data?.reviewStatus === 'Draft', 'E2E-1 Organizer creates Draft workspace');
    const e2eId = e2eCreateRes.data?.id;
    let currentVer = e2eCreateRes.data?.version;

    // Step 2: Organizer edits / saves workspace
    const e2eEditRes = await apiRequest(`/workspaces/${e2eId}`, {
      method: 'PATCH',
      headers: e2eOrgHeaders,
      body: {
        shortDescription: 'Refined description during drafting',
        expectedVersion: currentVer
      }
    });
    assert(e2eEditRes.status === 200 && e2eEditRes.data?.shortDescription === 'Refined description during drafting', 'E2E-2 Organizer edits & saves draft');
    currentVer = e2eEditRes.data?.version;

    // Step 3: Organizer reloads draft
    const e2eReloadRes = await apiRequest(`/workspaces/${e2eId}`, {
      method: 'GET',
      headers: e2eOrgHeaders
    });
    assert(e2eReloadRes.status === 200 && e2eReloadRes.data?.id === e2eId, 'E2E-3 Organizer reloads saved draft');

    // Step 4: Organizer submits for review
    const e2eSubmitRes = await apiRequest(`/workspaces/${e2eId}/submit`, {
      method: 'POST',
      headers: e2eOrgHeaders,
      body: { agreementConfirmed: true }
    });
    assert(e2eSubmitRes.status === 200 && e2eSubmitRes.data?.reviewStatus === 'Pending', 'E2E-4 Organizer submits workspace for review');
    currentVer = e2eSubmitRes.data?.version;

    // Step 5: Admin approves workspace
    const e2eApproveRes = await apiRequest(`/admin/workspaces/${e2eId}/review`, {
      method: 'PATCH',
      headers: e2eAdminHeaders,
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Meets all compliance criteria',
        expectedVersion: currentVer
      }
    });
    assert(e2eApproveRes.status === 200 && e2eApproveRes.data?.reviewStatus === 'Approved', 'E2E-5 Admin approves workspace');
    currentVer = e2eApproveRes.data?.version;

    // Step 6: Organizer publishes (resumes/activates) workspace
    const e2ePublishRes = await apiRequest(`/workspaces/${e2eId}/lifecycle`, {
      method: 'PATCH',
      headers: e2eOrgHeaders,
      body: {
        action: 'resume',
        expectedVersion: currentVer
      }
    });
    assert(e2ePublishRes.status === 200 && e2ePublishRes.data?.operatingStatus === 'Active', 'E2E-6 Organizer publishes workspace (Active)');
    currentVer = e2ePublishRes.data?.version;

    // Step 7: Admin suspends workspace
    const e2eSuspendRes = await apiRequest(`/admin/workspaces/${e2eId}/moderation`, {
      method: 'PATCH',
      headers: e2eAdminHeaders,
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Safety audit check',
        expectedVersion: currentVer
      }
    });
    assert(e2eSuspendRes.status === 200 && e2eSuspendRes.data?.moderationStatus === 'Suspended', 'E2E-7 Admin suspends workspace');
    currentVer = e2eSuspendRes.data?.version;

    // Step 8: Organizer CANNOT resume while suspended
    const e2eResumeBlockedRes = await apiRequest(`/workspaces/${e2eId}/lifecycle`, {
      method: 'PATCH',
      headers: e2eOrgHeaders,
      body: {
        action: 'resume',
        expectedVersion: currentVer
      }
    });
    assert(
      e2eResumeBlockedRes.status === 400 || e2eResumeBlockedRes.status === 403,
      'E2E-8 Organizer cannot resume suspended workspace (rejected)'
    );

    // Step 9: Admin restores workspace
    const e2eRestoreRes = await apiRequest(`/admin/workspaces/${e2eId}/moderation`, {
      method: 'PATCH',
      headers: e2eAdminHeaders,
      body: {
        moderationStatus: 'Normal',
        expectedVersion: currentVer
      }
    });
    assert(e2eRestoreRes.status === 200 && e2eRestoreRes.data?.moderationStatus === 'Normal', 'E2E-9 Admin restores workspace to Normal moderation');

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
