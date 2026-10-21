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
console.log(`[PhaseC3GateTest] Initial Developer Runtime SHA256: ${initialDevRuntimeSha}`);

// 2. Configure isolated temporary directory for test mutations
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-c3-gate-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { storage } = await import('../storage.ts');
const {
  mapWizardStateToCreateDto,
  mapWizardStateToUpdateDto,
  mapCanonicalToWizardState,
  mapWizardMediaToCanonical
} = await import('../../src/features/organizer-onboarding/utils/wizard-api-mapper.ts');

const TEST_PORT = 4098;
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

async function runAcceptanceGateSuite() {
  console.log('\n===============================================================');
  console.log('🛡️ Phase C3: Final Acceptance & Data Safety Gate Test Suite');
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
    assert(server !== null, `Mock Server started on isolated port ${TEST_PORT}`);

    const testOrganizerId = 'USR-9432';
    const otherOrganizerId = 'USR-2194';

    // ===============================================================
    // Gate 1: Idempotency & Duplicate Workspace Creation Protection
    // ===============================================================
    console.log('\n--- Gate 1: Idempotency & Duplicate Workspace Creation Protection ---');

    const stableClientDraftKey = `draft-key-test-${Date.now()}`;
    const initialCreatePayload = {
      name: 'Idempotency Test Coworking Hub',
      category: 'coworking_hub',
      streetAddress: '100 Nguyen Hue Blvd',
      city: 'Ho Chi Minh City',
      district: 'District 1',
      usableAreaSqm: 850,
      clientDraftKey: stableClientDraftKey
    };

    // First POST: creates new canonical workspace
    const firstPostRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: initialCreatePayload
    });

    assert(firstPostRes.status === 201, 'First POST creates workspace with status 201 Created');
    const createdWorkspace = firstPostRes.data.data;
    const canonicalId = createdWorkspace.id;
    assert(!!canonicalId && canonicalId.startsWith('WS-'), `Canonical ID assigned: ${canonicalId}`);
    assert(createdWorkspace.clientDraftKey === stableClientDraftKey, 'clientDraftKey persisted in record');

    // Second POST (Double-click / retry with identical clientDraftKey): must return 200 OK with same workspace
    const retryPostRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: initialCreatePayload
    });

    assert(retryPostRes.status === 200, 'Duplicate POST retry returns 200 OK (idempotent resolution)');
    assert(retryPostRes.data.data.id === canonicalId, 'Duplicate POST returns exact same canonical ID');
    assert(retryPostRes.data.data.version === createdWorkspace.version, 'Workspace version unchanged on duplicate retry');

    // Verify workspace list contains exactly ONE record with this clientDraftKey
    const listRes = await httpFetch(`${BASE_URL}/workspaces?organizerId=${testOrganizerId}`, {
      headers: { 'x-organizer-id': testOrganizerId }
    });
    const matches = listRes.data.data.content.filter((w: any) => w.clientDraftKey === stableClientDraftKey);
    assert(matches.length === 1, `Exactly 1 record exists in database with draft key ${stableClientDraftKey} (no duplicates)`);

    // Cross-organizer check: another organizer using same key generates their own separate workspace
    const otherOrganizerPayload = {
      name: 'Other Organizer Space',
      category: 'business_lounge',
      streetAddress: '200 Pasteur St',
      city: 'Ho Chi Minh City',
      district: 'District 3',
      organizerId: otherOrganizerId,
      clientDraftKey: stableClientDraftKey
    };
    const otherOrgRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': otherOrganizerId },
      body: otherOrganizerPayload
    });
    assert(otherOrgRes.status === 201, 'Different organizer using same key creates new workspace (tenant scoped)');
    assert(otherOrgRes.data.data.id !== canonicalId, 'Other organizer receives distinct canonical ID');

    // ===============================================================
    // Gate 2: O09 Media Persistence & O15 Submission Rejection
    // ===============================================================
    console.log('\n--- Gate 2: O09 Media Persistence & O15 Submission Rejection ---');

    // Create a new draft with ONLY local blob URLs
    const blobOnlyDraftKey = `blob-draft-${Date.now()}`;
    const blobDraftRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        name: 'Blob Photo Test Hub',
        category: 'creative_studio',
        streetAddress: '55 Dong Du St',
        city: 'Ho Chi Minh City',
        district: 'District 1',
        latitude: 10.7769,
        longitude: 106.7009,
        usableAreaSqm: 400,
        capacityDesks: 30,
        amenities: ['fast-wifi', 'cctv-security'],
        clientDraftKey: blobOnlyDraftKey
      }
    });
    const blobWorkspaceId = blobDraftRes.data.data.id;

    // Simulate wizard mapper filtering when user has selected only local JPEG/PNG files
    const localBlobMediaItems = [
      { id: 'b1', url: 'blob:http://localhost:3000/a39281-local', name: 'photo1.jpg', isCover: true },
      { id: 'b2', url: 'blob:http://localhost:3000/b92811-local', name: 'photo2.png', isCover: false }
    ];
    const mappedMedia = mapWizardMediaToCanonical(localBlobMediaItems as any, 'b1');
    assert(mappedMedia.images.length === 0, 'Mapper completely filters out local blob: URLs (0 durable images)');
    assert(mappedMedia.coverImageUrl === '', 'Mapper assigns empty string for coverImageUrl when only blobs exist');

    // Attempting submission without durable media MUST be rejected by server
    const submitBlobRes = await httpFetch(`${BASE_URL}/workspaces/${blobWorkspaceId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: { agreementConfirmed: true }
    });

    assert(submitBlobRes.status === 400, 'Submission with missing durable photographs rejected with HTTP 400');
    assert(
      submitBlobRes.data.validationErrors?.images?.includes('photograph') ||
      submitBlobRes.data.validationErrors?.images?.includes('cover image'),
      'Server returns validation error specifically requiring workspace photograph'
    );

    // Verify workspace remains in Draft state
    const blobWsCheck = await httpFetch(`${BASE_URL}/workspaces/${blobWorkspaceId}`, {
      headers: { 'x-organizer-id': testOrganizerId }
    });
    assert(blobWsCheck.data.data.reviewStatus === 'Draft', 'Workspace remains strictly in Draft reviewStatus after rejection');

    // Now update with a durable remote HTTPS photograph
    const durableMediaPatch = await httpFetch(`${BASE_URL}/workspaces/${blobWorkspaceId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: blobWsCheck.data.data.version,
        coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
        images: [
          {
            id: 'durable-1',
            url: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
            caption: 'Main Coworking Space',
            isCover: true,
            displayOrder: 1,
            mediaType: 'image'
          }
        ]
      }
    });
    assert(durableMediaPatch.status === 200, 'PATCH with durable remote HTTPS media succeeds');

    // Now submit: must succeed and transition to Pending
    const submitDurableRes = await httpFetch(`${BASE_URL}/workspaces/${blobWorkspaceId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: durableMediaPatch.data.data.version,
        agreementConfirmed: true
      }
    });
    assert(submitDurableRes.status === 200, 'Submission with durable photograph succeeds (200 OK)');
    assert(submitDurableRes.data.data.reviewStatus === 'Pending', 'Workspace reviewStatus transitioned to Pending');
    assert(submitDurableRes.data.data.status === 'pending', 'Operational status set to pending');

    // ===============================================================
    // Gate 3: Legacy LocalStorage Draft Recovery & Server Hydration
    // ===============================================================
    console.log('\n--- Gate 3: Legacy LocalStorage Draft Recovery & Server Hydration ---');

    // Simulated legacy localStorage fixture (version 1 without canonicalWorkspaceId)
    const legacyLocalStorageFixture = {
      version: 1,
      lastSavedAt: '2026-10-19T10:00:00.000Z',
      isDraftSynced: false,
      canonicalWorkspaceId: undefined,
      serverVersion: undefined,
      basicInfo: {
        name: 'Legacy Recovered Hub',
        category: 'coworking_hub',
        description: 'Recovered from local draft fixture',
        totalArea: 750,
        contactPhone: '+84 28 3822 0000',
        contactEmail: 'legacy@nexspace.vn'
      },
      location: {
        streetAddress: '15 Le Duan Boulevard',
        district: 'District 1',
        city: 'Ho Chi Minh City',
        floorSuite: 'Floor 8',
        latitude: 10.7812,
        longitude: 106.7001,
        entryNotes: 'Elevator bank A'
      },
      operatingHours: {
        is247: false,
        schedule: [
          { day: 'monday', label: 'Monday', isOpen: true, openTime: '08:00 AM', closeTime: '08:00 PM' }
        ],
        blockHolidays: true,
        allowGracePeriod: false
      },
      amenities: ['fast-wifi', 'espresso-bar'],
      media: {
        coverPhotoId: 'leg-1',
        items: [
          { id: 'leg-1', url: 'https://images.unsplash.com/photo-1517502884422-41eaead166d4', name: 'Lounge', isCover: true }
        ]
      },
      floorPlan: {
        selectedFloorId: 'fl-1',
        floors: [{ id: 'fl-1', number: 8, name: 'Floor 8', usableAreaSqm: 750, capacity: 50, status: 'draft' }],
        zones: [{ id: 'z-1', name: 'Open Desk', code: 'Z1', floorId: 'fl-1', type: 'open_desk', color: '#3B82F6', baseHourlyRate: 3.5, areaSqm: 500, capacity: 50, amenities: [] }],
        gridSnap: true,
        showDimensions: false,
        zoomLevel: 100
      }
    };

    // 3.1 Initial draft recovery check: map to create DTO
    const legacyCreateDto = mapWizardStateToCreateDto(legacyLocalStorageFixture as any, testOrganizerId);
    assert(legacyCreateDto.name === 'Legacy Recovered Hub', 'Legacy draft basic info mapped correctly');
    assert(legacyCreateDto.streetAddress === '15 Le Duan Boulevard', 'Legacy location mapped correctly');
    assert(legacyCreateDto.capacityDesks === 50, 'Legacy capacity calculated from zones');

    // 3.2 Explicit save: promotes to canonical server record
    const legacySaveRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: legacyCreateDto
    });
    assert(legacySaveRes.status === 201, 'Explicit save of legacy draft creates canonical record');
    const legacySavedWs = legacySaveRes.data.data;
    assert(!!legacySavedWs.id, `Legacy draft assigned canonical ID: ${legacySavedWs.id}`);

    // 3.3 Server hydration back into wizard state preserves local unsynced values
    const hydratedState = mapCanonicalToWizardState(legacySavedWs, legacyLocalStorageFixture as any);
    assert(hydratedState.basicInfo?.name === 'Legacy Recovered Hub', 'Hydrated basic info matches server');
    assert(hydratedState.location?.streetAddress === '15 Le Duan Boulevard', 'Hydrated address matches server');
    assert(hydratedState.operatingHours?.is247 === false, 'Hydrated operating hours match server');

    // ===============================================================
    // Gate 4: Optimistic Concurrency & Safe Conflict Handling
    // ===============================================================
    console.log('\n--- Gate 4: Optimistic Concurrency & Safe Conflict Handling ---');

    // Perform an out-of-order patch with stale expectedVersion
    const stalePatchRes = await httpFetch(`${BASE_URL}/workspaces/${legacySavedWs.id}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 999, // Stale version
        name: 'Conflicted Update'
      }
    });

    assert(stalePatchRes.status === 409, 'Stale version update rejected with HTTP 409 Conflict');
    assert(stalePatchRes.data.error === 'Conflict', 'Error type indicates Conflict');

    // Verify existing workspace name was NOT overwritten by the rejected update
    const verifyWs = await httpFetch(`${BASE_URL}/workspaces/${legacySavedWs.id}`, {
      headers: { 'x-organizer-id': testOrganizerId }
    });
    assert(verifyWs.data.data.name === 'Legacy Recovered Hub', 'Original workspace name preserved intact after 409 conflict');

    // ===============================================================
    // Gate 5: Location Coordinates Integrity & Incomplete Drafts
    // ===============================================================
    console.log('\n--- Gate 5: Location Coordinates Integrity & Incomplete Drafts ---');

    // 5.1 Incomplete draft creation with omitted coordinates
    const noCoordsDraftPayload = {
      name: 'Uncalibrated Bare Draft',
      category: 'coworking_hub',
      clientDraftKey: `no-coords-${Date.now()}`
    };
    const noCoordsCreateRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: noCoordsDraftPayload
    });
    assert(noCoordsCreateRes.status === 201, 'Incomplete draft created without coordinates returns 201 Created');
    const noCoordsWs = noCoordsCreateRes.data.data;
    assert(noCoordsWs.latitude === null && noCoordsWs.longitude === null, 'Missing coordinates stored as null without fake coordinate substitutions');

    // 5.2 Mapper preserves null coordinates for uncalibrated draft state
    const emptyCoordState: any = {
      basicInfo: { name: 'Empty Coords Space', category: 'coworking_hub', description: '', totalArea: 100 },
      location: { streetAddress: '', district: '', city: '', floorSuite: '', latitude: null, longitude: null, entryNotes: '' },
      operatingHours: { is247: false, schedule: [], blockHolidays: true, allowGracePeriod: false },
      amenities: [],
      media: { items: [], coverPhotoId: '' },
      floorPlan: { floors: [], zones: [] }
    };
    const mappedEmptyCoords = mapWizardStateToCreateDto(emptyCoordState, testOrganizerId);
    assert(mappedEmptyCoords.latitude === null && mappedEmptyCoords.longitude === null, 'mapWizardStateToCreateDto sets latitude and longitude to null when omitted');
    assert(mappedEmptyCoords.city === '' && mappedEmptyCoords.district === '', 'mapWizardStateToCreateDto does not fabricate Ho Chi Minh City or District 1');

    // 5.3 Legitimate user coordinates preserved
    const validCoordState: any = {
      ...emptyCoordState,
      location: { ...emptyCoordState.location, latitude: 10.8231, longitude: 106.6297, city: 'Ho Chi Minh City', district: 'Go Vap District' }
    };
    const mappedValidCoords = mapWizardStateToCreateDto(validCoordState, testOrganizerId);
    assert(mappedValidCoords.latitude === 10.8231 && mappedValidCoords.longitude === 106.6297, 'mapWizardStateToCreateDto preserves legitimate user coordinates');

    // 5.4 Submission strictly rejected if coordinates are missing/null
    const submitNoCoordsRes = await httpFetch(`${BASE_URL}/workspaces/${noCoordsWs.id}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: { expectedVersion: noCoordsWs.version }
    });
    assert(submitNoCoordsRes.status === 400, 'Submitting workspace with missing coordinates rejected with 400 Bad Request');
    assert(
      submitNoCoordsRes.data.validationErrors?.location?.includes('Valid geolocation coordinates'),
      'Detailed validation error specifies missing coordinates prerequisite'
    );

    // 5.5 Existing coordinates remain unchanged when updating other unrelated fields
    const setCoordsRes = await httpFetch(`${BASE_URL}/workspaces/${noCoordsWs.id}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: noCoordsWs.version,
        latitude: 10.7769,
        longitude: 106.7009
      }
    });
    assert(setCoordsRes.status === 200, 'PATCH sets coordinates to 10.7769, 106.7009');
    const coordsVersion = setCoordsRes.data.data.version;

    const patchDescRes = await httpFetch(`${BASE_URL}/workspaces/${noCoordsWs.id}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: coordsVersion,
        description: 'Updated description without sending coordinates'
      }
    });
    assert(patchDescRes.status === 200, 'PATCH description without coordinates returns 200 OK');
    assert(
      patchDescRes.data.data.latitude === 10.7769 && patchDescRes.data.data.longitude === 106.7009,
      'Existing coordinates remain unchanged after editing other fields'
    );

    // ===============================================================
    // Gate 6: O15 Save-then-Submit Consistency & Concurrency Invariants
    // ===============================================================
    console.log('\n--- Gate 6: O15 Save-then-Submit Consistency & Concurrency Invariants ---');

    // 6.1 Existing Workspace with unsaved changes:
    // Create fully complete workspace
    const completeDraftKey = `complete-o15-${Date.now()}`;
    const completeCreatePayload = {
      name: 'O15 Submission Flow Hub',
      category: 'coworking_hub',
      streetAddress: '88 Ham Nghi Boulevard',
      city: 'Ho Chi Minh City',
      district: 'District 1',
      latitude: 10.7700,
      longitude: 106.7030,
      usableAreaSqm: 600,
      capacityDesks: 45,
      amenities: ['fast-wifi', 'ergonomic-chairs'],
      operatingHours: [{ dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false }],
      coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c',
      images: [{ id: 'm1', url: 'https://images.unsplash.com/photo-1497366216548-37526070297c', isCover: true, displayOrder: 0, mediaType: 'image' }],
      floors: [{ id: 'f1', name: 'Floor 1', floorNumber: 1, totalDesks: 45 }],
      clientDraftKey: completeDraftKey
    };
    const completeCreateRes = await httpFetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: completeCreatePayload
    });
    assert(completeCreateRes.status === 201, 'Complete draft workspace created at version 1');
    const completeWs = completeCreateRes.data.data;
    const completeWsId = completeWs.id;
    assert(completeWs.version === 1, 'Initial version is 1');

    // 6.2 O15 Save Draft with unsaved local changes (e.g. updated name and capacity)
    const unsavedChangesUpdate = {
      expectedVersion: 1,
      name: 'O15 Submission Flow Hub (Persisted)',
      capacityDesks: 55
    };
    const persistSaveRes = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: unsavedChangesUpdate
    });
    assert(persistSaveRes.status === 200, 'O15 Save Draft persists current changes to server');
    const persistedWs = persistSaveRes.data.data;
    assert(persistedWs.version === 2, 'Version incremented to 2 after server save');
    assert(persistedWs.name === 'O15 Submission Flow Hub (Persisted)', 'Workspace name persisted to server');
    assert(persistedWs.capacityDesks === 55, 'Capacity persisted to server');

    // 6.3 O15 Save Draft followed by browser reload / hydration
    const reloadFetchRes = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}`, {
      headers: { 'x-organizer-id': testOrganizerId }
    });
    assert(reloadFetchRes.status === 200, 'Workspace fetched upon browser reload');
    const reloadedHydrated = mapCanonicalToWizardState(reloadFetchRes.data.data);
    assert(reloadedHydrated.basicInfo?.name === 'O15 Submission Flow Hub (Persisted)', 'Hydrated state matches persisted changes after reload');
    assert(reloadedHydrated.serverVersion === 2, 'Hydrated state has exact serverVersion 2');

    // 6.4 HTTP 409 Conflict before submission (concurrent modification in another tab)
    // tab B modifies the record to version 3
    const tabBPatchRes = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: { expectedVersion: 2, description: 'Concurrent tab edit' }
    });
    assert(tabBPatchRes.status === 200, 'Tab B advanced record to version 3');

    // Now tab A attempts to save/submit with stale version 2
    const stalePreSubmitSaveRes = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: { expectedVersion: 2, name: 'Tab A Stale Changes' }
    });
    assert(stalePreSubmitSaveRes.status === 409, 'Pre-submission save with stale version returns 409 Conflict');
    assert(stalePreSubmitSaveRes.data.error === 'Conflict', 'Conflict detected before submission');

    // Ensure tab A aborted and did NOT submit or overwrite server version
    const verifyUnchangedWs = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}`, {
      headers: { 'x-organizer-id': testOrganizerId }
    });
    assert(verifyUnchangedWs.data.data.version === 3, 'Record remains at version 3 (Tab A changes did not overwrite)');
    assert(verifyUnchangedWs.data.data.reviewStatus === 'Draft', 'Workspace remains in Draft status after 409 pre-submit abort');

    // 6.5 Save failure before submission prevents calling /submit
    // If save fails, submission must NOT proceed with stale version
    const failedSubmitAttemptRes = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: { expectedVersion: 2 } // Stale version 2
    });
    assert(failedSubmitAttemptRes.status === 409, 'Direct submission with stale version 2 rejected with 409 Conflict');

    // 6.6 Successful persist-then-submit with sequential versions (V=3 -> Save: V=4 -> Submit: V=5)
    // Synchronize to current version 3
    const freshSaveRes = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}`, {
      method: 'PATCH',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: 3,
        name: 'O15 Submission Flow Hub (Final Pre-submission Save)'
      }
    });
    assert(freshSaveRes.status === 200, 'Pre-submission save succeeded (version incremented from 3 to 4)');
    const savedBeforeSubmit = freshSaveRes.data.data;
    assert(savedBeforeSubmit.version === 4, 'Saved version is 4');

    // Execute submission using the returned version 4 as precondition
    const finalSubmitRes = await httpFetch(`${BASE_URL}/workspaces/${completeWsId}/submit`, {
      method: 'POST',
      headers: { 'x-organizer-id': testOrganizerId },
      body: {
        expectedVersion: savedBeforeSubmit.version,
        agreementConfirmed: true
      }
    });
    assert(finalSubmitRes.status === 200, 'POST /workspaces/:id/submit with sequential version 4 succeeded with 200 OK');
    const finalWs = finalSubmitRes.data.data;
    assert(finalWs.version === 5, 'Final submitted workspace version is 5');
    assert(finalWs.reviewStatus === 'Pending', 'reviewStatus is Pending (under review)');
    assert(finalWs.moderationStatus === 'Normal', 'moderationStatus is Normal');
    assert(finalWs.name === 'O15 Submission Flow Hub (Final Pre-submission Save)', 'O04 shows exact submitted workspace state');

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
    console.log(`[PhaseC3GateTest] Final Developer Runtime SHA256: ${finalDevRuntimeSha}`);
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

runAcceptanceGateSuite();
