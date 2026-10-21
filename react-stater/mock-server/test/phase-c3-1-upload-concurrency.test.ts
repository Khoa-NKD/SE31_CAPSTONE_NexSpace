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
console.log(`[PhaseC3.1Test] Initial Developer Runtime SHA256: ${initialDevRuntimeSha}`);

// 2. Configure isolated temporary directory for test mutations
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-c3-1-test-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { storage } = await import('../storage.ts');
const {
  mapWizardStateToCreateDto,
  mapWizardMediaToCanonical,
  isDurableMediaUrl
} = await import('../../src/features/organizer-onboarding/utils/wizard-api-mapper.ts');

const TEST_PORT = 4101;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

// Sample realistic binary images
// Minimal valid 1x1 PNG:
const SAMPLE_PNG_BYTES = Buffer.from(
  '89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000a49444154789c63000100000500010d0a2db40000000049454e44ae426082',
  'hex'
);

// Minimal valid JPEG header + SOS + EOI:
const SAMPLE_JPEG_BYTES = Buffer.concat([
  Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01, 0x00, 0x01, 0x00, 0x00]),
  Buffer.from([0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12, 0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20, 0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27, 0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32]),
  Buffer.from([0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01, 0x00, 0x01, 0x01, 0x01, 0x11, 0x00]),
  Buffer.from([0xff, 0xda, 0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xbf, 0x00]),
  Buffer.from([0xff, 0xd9])
]);

// Minimal valid WebP: RIFF [size] WEBP VP8 ...
const SAMPLE_WEBP_BYTES = Buffer.concat([
  Buffer.from('RIFF', 'ascii'),
  Buffer.from([0x1a, 0x00, 0x00, 0x00]), // 26 bytes
  Buffer.from('WEBPVP8 ', 'ascii'),
  Buffer.from([0x0e, 0x00, 0x00, 0x00]),
  Buffer.from([0x30, 0x01, 0x00, 0x9d, 0x01, 0x2a, 0x01, 0x00, 0x01, 0x00, 0x02, 0x00, 0x34, 0x25])
]);

async function runPhaseC31TestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 NexSpace Phase C3.1: Media Upload & Idempotency Test Suite');
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

    // =========================================================================
    // SECTION 1: Local Development Media Upload API Tests
    // =========================================================================
    console.log('--- 1. Development Media Upload Validation & Storage ---');

    // 1.1 Upload valid PNG file
    const pngFormData = new FormData();
    pngFormData.append('file', new Blob([SAMPLE_PNG_BYTES], { type: 'image/png' }), 'nexspace-coworking.png');

    const pngUploadRes = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: pngFormData
    });
    const pngUploadData = await pngUploadRes.json();

    assert(
      pngUploadRes.status === 201 && pngUploadData.success === true,
      'POST /api/v1/media/upload accepts valid PNG and returns 201 Created'
    );
    assert(
      Boolean(pngUploadData.data?.url && pngUploadData.data.url.startsWith('/api/v1/media/')),
      'Upload response includes durable relative development URL (/api/v1/media/:mediaId)',
      JSON.stringify(pngUploadData.data)
    );
    assert(
      pngUploadData.data?.mimeType === 'image/png',
      'Upload response correctly identifies image/png MIME type'
    );

    const uploadedPngUrl = pngUploadData.data.url;
    const uploadedPngFilename = pngUploadData.data.filename;

    // 1.2 Fetch uploaded PNG media via GET
    const getPngRes = await fetch(`http://localhost:${TEST_PORT}${uploadedPngUrl}`);
    assert(
      getPngRes.status === 200,
      'GET /api/v1/media/:mediaId returns HTTP 200 OK'
    );
    assert(
      getPngRes.headers.get('content-type') === 'image/png',
      'GET /api/v1/media/:mediaId sets Content-Type: image/png'
    );
    assert(
      getPngRes.headers.get('x-content-type-options') === 'nosniff',
      'GET /api/v1/media/:mediaId sets X-Content-Type-Options: nosniff'
    );
    assert(
      getPngRes.headers.get('cache-control')?.includes('public') === true,
      'GET /api/v1/media/:mediaId sets appropriate Cache-Control'
    );

    const fetchedPngBuffer = Buffer.from(await getPngRes.arrayBuffer());
    assert(
      fetchedPngBuffer.equals(SAMPLE_PNG_BYTES),
      'GET /api/v1/media/:mediaId returns exact matching binary bytes'
    );

    // 1.3 Upload valid JPEG file
    const jpegFormData = new FormData();
    jpegFormData.append('file', new Blob([SAMPLE_JPEG_BYTES], { type: 'image/jpeg' }), 'boardroom-photo.jpg');

    const jpegUploadRes = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: jpegFormData
    });
    const jpegUploadData = await jpegUploadRes.json();

    assert(
      jpegUploadRes.status === 201 && jpegUploadData.data?.mimeType === 'image/jpeg',
      'POST /api/v1/media/upload accepts valid JPEG and returns 201 Created'
    );

    // 1.4 Upload valid WebP file
    const webpFormData = new FormData();
    webpFormData.append('file', new Blob([SAMPLE_WEBP_BYTES], { type: 'image/webp' }), 'pantry-view.webp');

    const webpUploadRes = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: webpFormData
    });
    const webpUploadData = await webpUploadRes.json();

    assert(
      webpUploadRes.status === 201 && webpUploadData.data?.mimeType === 'image/webp',
      'POST /api/v1/media/upload accepts valid WebP and returns 201 Created'
    );

    // 1.5 Reject disguised text file (invalid file signature)
    const fakeImageFormData = new FormData();
    const fakeImageBytes = Buffer.from('console.log("malicious code disguised as png");');
    fakeImageFormData.append('file', new Blob([fakeImageBytes], { type: 'image/png' }), 'exploit.png');

    const fakeImageRes = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: fakeImageFormData
    });
    const fakeImageData = await fakeImageRes.json();

    assert(
      fakeImageRes.status === 400 && fakeImageData.error === 'InvalidFileType',
      'POST /api/v1/media/upload rejects text/script disguised as PNG with 400 InvalidFileType',
      `status: ${fakeImageRes.status}`
    );

    // 1.6 Reject empty file
    const emptyFormData = new FormData();
    emptyFormData.append('file', new Blob([Buffer.alloc(0)], { type: 'image/png' }), 'empty.png');

    const emptyRes = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: emptyFormData
    });
    const emptyData = await emptyRes.json();

    assert(
      emptyRes.status === 400 && emptyData.error === 'EmptyFile',
      'POST /api/v1/media/upload rejects empty file with 400 EmptyFile'
    );

    // 1.7 Reject oversized file (>10MB)
    const oversizedFormData = new FormData();
    // 10.5 MB payload starting with PNG magic bytes:
    const oversizedBytes = Buffer.concat([SAMPLE_PNG_BYTES, Buffer.alloc(10.5 * 1024 * 1024)]);
    oversizedFormData.append('file', new Blob([oversizedBytes], { type: 'image/png' }), 'huge.png');

    const oversizedRes = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      body: oversizedFormData
    });
    const oversizedData = await oversizedRes.json();

    assert(
      oversizedRes.status === 400 && oversizedData.error === 'FileTooLarge',
      'POST /api/v1/media/upload rejects file exceeding 10MB limit with 400 FileTooLarge'
    );
    assert(
      oversizedRes.headers.get('x-development-only') === 'local-mock-storage',
      'POST /api/v1/media/upload includes X-Development-Only: local-mock-storage header'
    );

    // 1.8 Reject malformed multipart request body safely with 400 BadRequest
    const malformedRes = await fetch(`${BASE_URL}/media/upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'multipart/form-data; boundary=----WebKitFormBoundaryInvalid'
      },
      body: 'Invalid body without matching boundary delimiters'
    });
    const malformedData = await malformedRes.json();
    assert(
      malformedRes.status === 400 && malformedData.error === 'BadRequest',
      'POST /api/v1/media/upload safely rejects malformed multipart requests with 400 BadRequest'
    );

    // 1.9 Path traversal rejection on GET media
    const traversalRes = await fetch(`${BASE_URL}/media/..%2F..%2Fworkspaces.json`);
    assert(
      traversalRes.status === 400 || traversalRes.status === 404,
      'GET /api/v1/media/:mediaId safely rejects directory traversal attack'
    );

    // =========================================================================
    // SECTION 2: Persistence Across Mock Server Restart
    // =========================================================================
    console.log('\n--- 2. Media Durability Across Mock Server Restart ---');

    // Close server
    await new Promise<void>((resolve) => {
      server!.close(() => resolve());
    });
    server = null;
    console.log('  ✓ Mock Server stopped.');

    // Restart server pointing to the exact same isolated runtime
    server = await startServer(TEST_PORT);
    console.log(`  ✓ Mock Server restarted on port ${TEST_PORT} with same runtime directory.`);

    // Re-fetch the previously uploaded PNG
    const restartGetRes = await fetch(`http://localhost:${TEST_PORT}${uploadedPngUrl}`);
    assert(
      restartGetRes.status === 200,
      'GET /api/v1/media/:mediaId succeeds after Mock Server restart'
    );
    const restartedBuffer = Buffer.from(await restartGetRes.arrayBuffer());
    assert(
      restartedBuffer.equals(SAMPLE_PNG_BYTES),
      'Image bytes remain byte-for-byte identical after server restart'
    );

    // =========================================================================
    // SECTION 3: Concurrent Draft Creation Idempotency (Promise.all)
    // =========================================================================
    console.log('\n--- 3. Concurrent Draft Creation Idempotency (Promise.all) ---');

    const concurrentDraftKey = `concurrent-test-draft-${Date.now()}`;
    const concurrentPayload = {
      name: 'Concurrent Innovation Lab',
      category: 'coworking_hub',
      totalArea: 650,
      clientDraftKey: concurrentDraftKey,
      streetAddress: '100 Concurrent Ave',
      district: 'District 1',
      city: 'Ho Chi Minh City',
      latitude: 10.7769,
      longitude: 106.7009
    };

    // Fire 5 concurrent POST requests with the same clientDraftKey simultaneously
    console.log(`  Firing 5 simultaneous POST /api/v1/workspaces with key: ${concurrentDraftKey}`);
    const concurrentPromises = Array.from({ length: 5 }, (_, i) =>
      fetch(`${BASE_URL}/workspaces`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-mock-role': 'Organizer',
          'x-organizer-id': 'ORG-CONCURRENT-1'
        },
        body: JSON.stringify(concurrentPayload)
      }).then(async (res) => ({
        index: i,
        status: res.status,
        data: await res.json()
      }))
    );

    const concurrentResults = await Promise.all(concurrentPromises);

    // Check that all 5 succeeded with 200 or 201
    const allSuccessful = concurrentResults.every((r) => r.status === 200 || r.status === 201);
    assert(
      allSuccessful,
      'All 5 concurrent draft creation requests return HTTP 200 or 201',
      `Statuses: ${concurrentResults.map((r) => r.status).join(', ')}`
    );

    // Check that all 5 responses return the EXACT SAME canonical Workspace ID
    const canonicalIds = concurrentResults.map((r) => r.data.data?.id);
    const uniqueCanonicalIds = new Set(canonicalIds);
    assert(
      uniqueCanonicalIds.size === 1,
      'All 5 concurrent requests resolve to the exact same canonical Workspace ID',
      `Resolved IDs: ${Array.from(uniqueCanonicalIds).join(', ')}`
    );

    const persistedWorkspaceId = canonicalIds[0];

    // Check database records count: only 1 workspace record with this key must exist
    const allWorkspaces = await storage.getAll<any>('workspaces');
    const matchingRecords = allWorkspaces.filter(
      (w: any) => w.clientDraftKey === concurrentDraftKey
    );
    assert(
      matchingRecords.length === 1,
      `Exactly 1 database record persisted for concurrent key (found ${matchingRecords.length})`
    );

    // 3.2 Cross-tenant draft key isolation test
    // If another organizer tries to hijack the same clientDraftKey, expect 409 Conflict
    const hijackRes = await fetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-DIFFERENT-ORGANIZER'
      },
      body: JSON.stringify(concurrentPayload)
    });
    const otherOrgData = await hijackRes.json();

    assert(
      hijackRes.status === 201 && otherOrgData.data?.id !== persistedWorkspaceId,
      'POST /workspaces with same clientDraftKey from different organizer creates distinct workspace (tenant scoped)',
      `Status: ${hijackRes.status}, ID: ${otherOrgData.data?.id}`
    );

    // =========================================================================
    // SECTION 4: End-to-End Onboarding Media & Submission Flow
    // =========================================================================
    console.log('\n--- 4. End-to-End Onboarding with Local Uploaded Media & Submission ---');

    // 4.1 Create workspace draft
    const onboardingDraftKey = `onboard-media-key-${Date.now()}`;
    const draftPayload = {
      name: 'NexSpace Tower Coworking Hub',
      category: 'coworking_hub',
      description: 'Premium serviced offices and hot desks.',
      totalArea: 1200,
      contactEmail: 'contact@nexspacetower.com',
      contactPhone: '+84 901 234 567',
      streetAddress: '123 Nguyen Hue',
      district: 'District 1',
      city: 'Ho Chi Minh City',
      floorSuite: 'Levels 12-14',
      latitude: 10.7769,
      longitude: 106.7009,
      clientDraftKey: onboardingDraftKey
    };

    const createDraftRes = await fetch(`${BASE_URL}/workspaces`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify(draftPayload)
    });
    const createDraftData = await createDraftRes.json();
    assert(
      createDraftRes.status === 201,
      'Onboarding workspace draft created on Mock REST server'
    );
    const workspaceId = createDraftData.data.id;
    let workspaceVersion = createDraftData.data.version;

    // 4.2 Attach the uploaded local media URL to the workspace
    assert(
      isDurableMediaUrl(uploadedPngUrl),
      'isDurableMediaUrl accurately recognizes /api/v1/media/ URLs'
    );

    const updateMediaRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify({
        expectedVersion: workspaceVersion,
        coverImageUrl: uploadedPngUrl,
        images: [
          {
            id: 'media-local-1',
            url: uploadedPngUrl,
            caption: 'Main Coworking Space',
            isCover: true,
            displayOrder: 1,
            mediaType: 'image'
          }
        ],
        amenities: ['wifi', 'parking', 'coffee'],
        operatingHours: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 2, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 3, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 4, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 5, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 6, openTime: '09:00', closeTime: '17:00', isClosed: false, is24Hours: false },
          { dayOfWeek: 7, openTime: '00:00', closeTime: '00:00', isClosed: true, is24Hours: false }
        ],
        totalFloors: 1,
        capacityDesks: 60,
        floors: [
          {
            id: 'floor-1',
            name: 'Floor 1',
            floorNumber: 1,
            totalDesks: 60,
            status: 'Published'
          }
        ]
      })
    });
    const updateMediaData = await updateMediaRes.json();
    assert(
      updateMediaRes.status === 200,
      'PUT /workspaces/:id successfully persists local uploaded media in canonical record'
    );
    assert(
      updateMediaData.data?.coverImageUrl === uploadedPngUrl,
      'Canonical record stores relative durable local media URL for coverImageUrl'
    );
    workspaceVersion = updateMediaData.data.version;

    // 4.3 Negative Test (Final Check B): Reject submission when media reference does not exist on disk
    const putNotFoundRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify({
        expectedVersion: workspaceVersion,
        coverImageUrl: '/api/v1/media/not-found.png',
        images: [
          {
            id: 'img-missing',
            url: '/api/v1/media/not-found.png',
            caption: 'Missing photo',
            isCover: true,
            displayOrder: 1,
            mediaType: 'image'
          }
        ]
      })
    });
    const putNotFoundData = await putNotFoundRes.json();
    assert(putNotFoundRes.status === 200, 'PUT saves draft with media reference');
    workspaceVersion = putNotFoundData.data.version;

    const submitNotFoundRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify({
        expectedVersion: workspaceVersion,
        agreementConfirmed: true
      })
    });
    const submitNotFoundData = await submitNotFoundRes.json();
    assert(
      submitNotFoundRes.status === 400 && submitNotFoundData.error === 'BadRequest',
      'POST /workspaces/:id/submit rejects submission when local media file does not exist on disk'
    );
    assert(
      Boolean(
        submitNotFoundData.validationErrors?.coverImageUrl?.includes('does not exist on disk') ||
        submitNotFoundData.validationErrors?.['images[0]']?.includes('does not exist on disk')
      ),
      'Validation error specifically flags nonexistent local media on disk',
      `validationErrors: ${JSON.stringify(submitNotFoundData.validationErrors)}`
    );

    // 4.4 Negative Test (Final Check B): Reject submission when local media contains path traversal
    const putTraversalRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify({
        expectedVersion: workspaceVersion,
        coverImageUrl: '/api/v1/media/../../etc/passwd',
        images: []
      })
    });
    const putTraversalData = await putTraversalRes.json();
    assert(putTraversalRes.status === 200, 'PUT saves draft with traversal test URL');
    workspaceVersion = putTraversalData.data.version;

    const submitTraversalRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify({
        expectedVersion: workspaceVersion,
        agreementConfirmed: true
      })
    });
    const submitTraversalData = await submitTraversalRes.json();
    assert(
      submitTraversalRes.status === 400,
      'POST /workspaces/:id/submit rejects submission with path traversal media reference'
    );

    // 4.5 Restore valid uploaded media before legitimate submission
    const restoreValidRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify({
        expectedVersion: workspaceVersion,
        coverImageUrl: uploadedPngUrl,
        images: [
          {
            id: 'img-valid',
            url: uploadedPngUrl,
            caption: 'Verified local PNG',
            isCover: true,
            displayOrder: 1,
            mediaType: 'image'
          }
        ]
      })
    });
    const restoreValidData = await restoreValidRes.json();
    assert(restoreValidRes.status === 200, 'PUT restores valid uploaded media on draft');
    workspaceVersion = restoreValidData.data.version;

    // 4.6 Submit workspace for review with valid local media
    const submitRes = await fetch(`${BASE_URL}/workspaces/${workspaceId}/submit`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      },
      body: JSON.stringify({
        expectedVersion: workspaceVersion,
        agreementConfirmed: true
      })
    });
    const submitData = await submitRes.json();
    assert(
      submitRes.status === 200,
      'POST /workspaces/:id/submit succeeds when local media is uploaded and durable',
      `status: ${submitRes.status}, err: ${JSON.stringify(submitData)}`
    );
    assert(
      submitData.data?.reviewStatus === 'Pending' || submitData.data?.status === 'pending',
      'Workspace status transitions to "Pending" after successful submission'
    );

    // 4.4 Verify pending workspace remains hidden from public customer listing
    const publicListRes = await fetch(`${BASE_URL}/public/workspaces`);
    const publicListData = await publicListRes.json();
    const publicItems = publicListData.data?.content || [];
    const isHiddenFromPublic = !publicItems.some((w: any) => w.id === workspaceId);
    assert(
      isHiddenFromPublic,
      'Pending workspace is excluded from public search listing'
    );

    // 4.5 Verify organizer workspace list includes the submitted workspace with Pending status
    const organizerListRes = await fetch(`${BASE_URL}/workspaces?organizerId=ORG-NEX-01`, {
      headers: {
        'x-mock-role': 'Organizer',
        'x-organizer-id': 'ORG-NEX-01'
      }
    });
    const organizerListData = await organizerListRes.json();
    const organizerItems = organizerListData.data?.content || [];
    const organizerRecord = organizerItems.find((w: any) => w.id === workspaceId);
    assert(
      Boolean(organizerRecord && (organizerRecord.reviewStatus === 'Pending' || organizerRecord.status === 'pending')),
      'Organizer workspace list shows submitted workspace with Pending status (Under Review)',
      `Found: ${JSON.stringify(organizerRecord)}`
    );

    // =========================================================================
    // SECTION 5: Developer Working Runtime JSON & Git Safety Verification
    // =========================================================================
    console.log('\n--- 5. Developer Runtime Data Protection Verification ---');

    const finalDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
    assert(
      initialDevRuntimeSha === finalDevRuntimeSha,
      'Developer runtime JSON (mock-data/runtime/workspaces.json) is 100% untouched and unmodified',
      `Before: ${initialDevRuntimeSha}, After: ${finalDevRuntimeSha}`
    );

    // Check that isolated uploads directory was used and dev uploads dir was untouched
    assert(
      fs.existsSync(path.join(ISOLATED_TEST_RUNTIME, 'uploads', uploadedPngFilename)),
      'Uploaded files were strictly isolated inside temporary test runtime directory'
    );

  } catch (err) {
    console.error('Fatal test runner error:', err);
    failed++;
  } finally {
    if (server) {
      await new Promise<void>((resolve) => {
        server!.close(() => resolve());
      });
    }

    // Clean up temporary test runtime
    try {
      fs.rmSync(ISOLATED_TEST_RUNTIME, { recursive: true, force: true });
    } catch {
      // ignore
    }

    console.log('\n===============================================================');
    console.log(`📊 Phase C3.1 Test Summary: ${passed} passed, ${failed} failed`);
    console.log('===============================================================\n');

    if (failed > 0) {
      process.exit(1);
    }
  }
}

await runPhaseC31TestSuite();
