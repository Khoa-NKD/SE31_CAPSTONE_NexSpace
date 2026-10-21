import http from 'node:http';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// 1. Snapshot developer working runtime JSON sha256 before any test execution
const DEV_RUNTIME_PATH = path.resolve(__dirname, '../../mock-data/runtime/workspaces.json');
const initialDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
console.log(`[PhaseC3Test] Initial Developer Runtime SHA256: ${initialDevRuntimeSha}`);

// 2. Configure isolated temporary directory for test mutations
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-c3-wizard-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { storage } = await import('../storage.ts');
const {
  mapWizardStateToCreateDto,
  mapWizardStateToUpdateDto,
  mapCanonicalToWizardState,
  mapWizardMediaToCanonical
} = await import('../../src/features/organizer-onboarding/utils/wizard-api-mapper.ts');

const TEST_PORT = 4097;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;
process.env.INTERNAL_API_URL = BASE_URL;

async function httpFetch(url: string, options: Omit<RequestInit, 'body'> & { body?: any } = {}) {
  const fetchOptions: RequestInit = { ...options };
  const headers: Record<string, string> = {
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

async function runWizardTestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 Phase C3: Organizer Workspace Onboarding Wizard API Tests');
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
    assert(server !== null, `Mock Server started on isolated test port ${TEST_PORT}`);

    // ===============================================================
    // Section 1: Wizard Mapper & Blob Filtering Safety
    // ===============================================================
    console.log('\n--- Section 1: Wizard Mapper & Blob Filtering Safety ---');
    const mockBlobMedia = [
      { id: 'm1', url: 'blob:http://localhost:5173/123-abc', name: 'temp.png', type: 'image' as const, isCover: false, size: 2048000 },
      { id: 'm2', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c', name: 'office.jpg', type: 'image' as const, isCover: true, size: 3072000 }
    ];

    const filteredMedia = mapWizardMediaToCanonical(mockBlobMedia, 'm2');
    assert(filteredMedia.images.length === 1, 'Temporary blob: URL was strictly filtered out of canonical media list');
    assert(filteredMedia.images[0].url.startsWith('https://'), 'Durable remote HTTPS URL was preserved in canonical media list');
    assert(filteredMedia.images[0].isCover === true, 'Cover photo metadata preserved');
    assert(filteredMedia.coverImageUrl.startsWith('https://'), 'Cover image URL resolves to durable remote URL');

    // ===============================================================
    // Section 2: Canonical Workspace Creation (O05 Basic Info)
    // ===============================================================
    console.log('\n--- Section 2: Canonical Workspace Creation (O05 Basic Info) ---');
    const testOrganizerId = 'USR-9432';

    // 2.1 Missing required field should fail
    const invalidCreateRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        name: '' // invalid: empty name
      }
    });
    assert(invalidCreateRes.status === 400, 'POST /workspaces with empty name rejected with 400 Bad Request');

    // 2.2 Valid initial Draft creation using canonical DTO format
    const validCreatePayload = {
      name: 'NexSpace Innovation Campus',
      category: 'coworking_hub',
      description: 'A premier collaborative workplace designed for tech ventures.',
      supportEmail: 'contact@nexspace-campus.io',
      supportPhone: '+84 28 3822 9999',
      streetAddress: '123 Innovation Boulevard',
      district: 'Thu Duc City',
      city: 'Ho Chi Minh City'
    };

    const createRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: validCreatePayload
    });

    assert(createRes.status === 201, 'POST /workspaces created draft returns 201 Created');
    const createdWorkspace = createRes.data?.data;
    const canonicalId = createdWorkspace?.id;
    assert(typeof canonicalId === 'string' && canonicalId.startsWith('WS-'), `Server assigned canonical ID: ${canonicalId}`);
    assert(createdWorkspace?.organizerId === testOrganizerId, `Assigned organizer ownership: ${createdWorkspace?.organizerId}`);
    assert(createdWorkspace?.reviewStatus === 'Draft', 'Newly created Workspace has reviewStatus: "Draft"');
    assert(createdWorkspace?.moderationStatus === 'Normal', 'Newly created Workspace has moderationStatus: "Normal"');
    assert(createdWorkspace?.version === 1, 'Initial draft version is 1');

    // ===============================================================
    // Section 3: Step-by-Step Incremental Saves (O06 to O10)
    // ===============================================================
    console.log('\n--- Section 3: Incremental Partial Draft Saves (PATCH) ---');

    // 3.1 Step O06: Location & Address update
    const patchLocationRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 1,
        streetAddress: '123 Innovation Boulevard, Suite 500',
        district: 'Thu Duc City',
        city: 'Ho Chi Minh City',
        latitude: 10.803,
        longitude: 106.732,
        onboardingStep: 2
      }
    });
    assert(patchLocationRes.status === 200, 'O06 Location patch returns 200 OK');
    assert(patchLocationRes.data.data.version === 2, 'Version incremented to 2');
    assert(patchLocationRes.data.data.streetAddress === '123 Innovation Boulevard, Suite 500', 'Street address updated');
    assert(patchLocationRes.data.data.latitude === 10.803, 'Coordinates persisted');

    // 3.2 Step O07: Operating Hours update
    const patchHoursRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 2,
        operatingHours: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '22:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '22:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '22:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '22:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '22:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 6, openTime: '09:00', closeTime: '18:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 7, openTime: '00:00', closeTime: '00:00', isClosed: true, is24Hours: false }
        ],
        timezone: 'Asia/Ho_Chi_Minh',
        onboardingStep: 3
      }
    });
    assert(patchHoursRes.status === 200, 'O07 Operating hours patch returns 200 OK');
    assert(patchHoursRes.data.data.version === 3, 'Version incremented to 3');
    assert(patchHoursRes.data.data.operatingHours.length === 7, '7 operating hours entries persisted');

    // 3.3 Step O08: Amenities update
    const patchAmenitiesRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 3,
        amenities: ['wifi', 'coffee', 'meeting_rooms', 'printing', 'air_conditioning', 'parking'],
        onboardingStep: 4
      }
    });
    assert(patchAmenitiesRes.status === 200, 'O08 Amenities patch returns 200 OK');
    assert(patchAmenitiesRes.data.data.version === 4, 'Version incremented to 4');
    assert(patchAmenitiesRes.data.data.amenities.length === 6, 'All 6 amenities persisted');

    // 3.4 Step O09: Media Gallery update (remote durable URLs only)
    const patchMediaRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 4,
        images: [
          { id: 'img-1', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c', caption: 'Lobby', isCover: true, displayOrder: 1, mediaType: 'image' },
          { id: 'img-2', url: 'https://images.unsplash.com/photo-1497366811353-6870744d04b2', caption: 'Desk Area', isCover: false, displayOrder: 2, mediaType: 'image' }
        ],
        coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        onboardingStep: 5
      }
    });
    assert(patchMediaRes.status === 200, 'O09 Media gallery patch returns 200 OK');
    assert(patchMediaRes.data.data.version === 5, 'Version incremented to 5');
    assert(patchMediaRes.data.data.images.length === 2, '2 durable images saved');

    // 3.5 Step O10: Floor Plan metadata update
    const patchFloorPlanRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 5,
        totalFloors: 2,
        capacityDesks: 80,
        meetingRooms: 6,
        focusPods: 4,
        capacityLabel: '80 Desks, 6 Mtgs',
        pricePerHour: 50000,
        pricePerDay: 300000,
        onboardingStep: 6,
        onboardingCompleted: true
      }
    });
    assert(patchFloorPlanRes.status === 200, 'O10 Floor plan summary patch returns 200 OK');
    assert(patchFloorPlanRes.data.data.version === 6, 'Version incremented to 6');
    assert(patchFloorPlanRes.data.data.totalFloors === 2, 'Total floors persisted');
    assert(patchFloorPlanRes.data.data.capacityDesks === 80, 'Capacity desks persisted');

    // ===============================================================
    // Section 4: Concurrency & Conflict Protection
    // ===============================================================
    console.log('\n--- Section 4: Concurrency & Conflict Protection ---');
    const stalePatchRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 2, // Stale version (server is at 6)
        name: 'Attempted Stale Overwrite'
      }
    });
    assert(stalePatchRes.status === 409, 'PATCH with stale expectedVersion rejected with 409 Conflict');
    assert(stalePatchRes.data.error === 'Conflict', 'Error type is Conflict');
    assert(stalePatchRes.data.message.includes('concurrency conflict'), 'Message explains optimistic concurrency conflict');

    // ===============================================================
    // Section 5: Persistence Across Server Reload & Cache Hydration
    // ===============================================================
    console.log('\n--- Section 5: Persistence Across Reload & Re-fetch ---');
    const getRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}`);
    assert(getRes.status === 200, 'GET /workspaces/:id returns 200 OK');
    const fetchedDraft = getRes.data.data;
    assert(fetchedDraft.name === 'NexSpace Innovation Campus', 'Workspace name preserved');
    assert(fetchedDraft.streetAddress === '123 Innovation Boulevard, Suite 500', 'Address preserved');
    assert(fetchedDraft.operatingHours.length === 7, 'Hours preserved');
    assert(fetchedDraft.amenities.includes('wifi'), 'Amenities preserved');
    assert(fetchedDraft.version === 6, 'Server version is 6');

    // Hydrate into Wizard Store model
    const rehydratedWizardDraft = mapCanonicalToWizardState(fetchedDraft);
    assert(rehydratedWizardDraft.basicInfo?.name === 'NexSpace Innovation Campus', 'Wizard store hydrates basic info');
    assert(rehydratedWizardDraft.location?.streetAddress === '123 Innovation Boulevard, Suite 500', 'Wizard store hydrates location');
    assert(Boolean(rehydratedWizardDraft.amenities?.includes('wifi')), 'Wizard store hydrates amenities');

    // ===============================================================
    // Section 6: Submission Workflow (O15 Pre-submission Review)
    // ===============================================================
    console.log('\n--- Section 6: Submission Workflow (POST /submit) ---');

    // 6.1 Incomplete submission test on a bare draft
    const bareDraftRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        name: 'Bare Incomplete Workspace',
        category: 'coworking_hub',
        streetAddress: 'Partial Street',
        city: 'Ho Chi Minh City',
        district: 'District 1'
      }
    });
    const bareId = bareDraftRes.data.data.id;
    const bareSubmitRes = await httpFetch(`${BASE_URL}/workspaces/${bareId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: { expectedVersion: 1 }
    });
    assert(bareSubmitRes.status === 400, 'Submitting bare workspace with missing requirements rejected with 400 Bad Request');
    assert(bareSubmitRes.data.error === 'BadRequest', 'Error is BadRequest');
    assert(
      bareSubmitRes.data.validationErrors && Object.keys(bareSubmitRes.data.validationErrors).length > 0,
      'Detailed missing requirement validation errors provided'
    );

    // 6.2 Unauthorized submitter test (wrong tenant)
    const unauthorizedSubmitRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': 'USR-ATTACKER' },
      body: { expectedVersion: 6 }
    });
    assert(unauthorizedSubmitRes.status === 403, 'Submit by non-owner rejected with 403 Forbidden');

    // 6.3 Valid submission of fully configured workspace
    const validSubmitRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 6,
        notes: 'Ready for administrator review and verification.'
      }
    });
    assert(validSubmitRes.status === 200, 'POST /workspaces/:id/submit returns 200 OK');
    const submittedWorkspace = validSubmitRes.data.data;
    assert(submittedWorkspace.reviewStatus === 'Pending', 'reviewStatus transitioned to "Pending" (NOT auto-approved)');
    assert(submittedWorkspace.moderationStatus === 'Normal', 'moderationStatus remains "Normal" (NOT auto-published)');
    assert(submittedWorkspace.version === 7, 'Version incremented to 7 upon submission');
    assert(submittedWorkspace.submissionNotes === 'Ready for administrator review and verification.', 'Submission notes persisted');
    assert(typeof submittedWorkspace.submittedAt === 'string', 'submittedAt timestamp recorded');

    // 6.4 Double submission rejection
    const doubleSubmitRes = await httpFetch(`${BASE_URL}/workspaces/${canonicalId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: { expectedVersion: 7 }
    });
    assert(doubleSubmitRes.status === 400, 'Double submission rejected because status is already Pending');

    // ===============================================================
    // Section 7: Cross-Module Visibility & Public Marketplace Leakage
    // ===============================================================
    console.log('\n--- Section 7: Cross-Module Verification & Public Isolation ---');

    // 7.1 Organizer O04 Dashboard listing contains the newly submitted workspace with status Pending
    const orgDashboardRes = await httpFetch(`${BASE_URL}/workspaces?organizerId=${testOrganizerId}`, {
      headers: { 'x-organizer-id': testOrganizerId }
    });
    assert(orgDashboardRes.status === 200, 'Organizer dashboard fetch returns 200 OK');
    const orgList = orgDashboardRes.data.data.content;
    const foundSubmitted = orgList.find((w: any) => w.id === canonicalId);
    assert(!!foundSubmitted, 'Submitted workspace appears in Organizer workspace listing');
    assert(foundSubmitted.reviewStatus === 'Pending', 'Workspace shows reviewStatus: "Pending" for Organizer');

    // 7.2 Customer Public marketplace MUST EXCLUDE Draft and Pending workspaces
    const publicRes = await httpFetch(`${BASE_URL}/public/workspaces`);
    assert(publicRes.status === 200, 'GET /public/workspaces returns 200 OK');
    const publicSpaces = publicRes.data.data.content;
    const leakDraft = publicSpaces.find((w: any) => w.id === bareId);
    const leakPending = publicSpaces.find((w: any) => w.id === canonicalId);
    assert(!leakDraft, 'Draft workspace does NOT leak into Customer public marketplace');
    assert(!leakPending, 'Pending workspace does NOT leak into Customer public marketplace');

    // 7.3 Suspended workspace cannot be submitted
    await storage.update('workspaces', bareId, (w: any) => ({ ...w, moderationStatus: 'Suspended' }));
    const suspendedSubmitRes = await httpFetch(`${BASE_URL}/workspaces/${bareId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {}
    });
    assert(suspendedSubmitRes.status === 400, 'Suspended workspace submission rejected with 400');

  } catch (err) {
    console.error('Unhandled test suite error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      console.log('Mock server closed.');
    }

    // Clean up temporary isolated directory
    if (fs.existsSync(ISOLATED_TEST_RUNTIME)) {
      fs.rmSync(ISOLATED_TEST_RUNTIME, { recursive: true, force: true });
      console.log(`Cleaned up isolated runtime: ${ISOLATED_TEST_RUNTIME}`);
    }

    // Verify developer runtime JSON SHA256 integrity
    const finalDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
    console.log(`[PhaseC3Test] Final Developer Runtime SHA256: ${finalDevRuntimeSha}`);
    if (finalDevRuntimeSha !== initialDevRuntimeSha) {
      console.error('CRITICAL ERROR: Developer runtime JSON was modified during tests!');
      process.exit(1);
    } else {
      console.log('🛡️ Developer working runtime JSON remained 100% UNTOUCHED and pristine.');
    }

    console.log(`\nResults: ${passed} passed, ${failed} failed\n`);
    if (failed > 0) {
      process.exit(1);
    }
  }
}

runWizardTestSuite();
