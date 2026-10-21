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
console.log(`[PhaseC5Test] Initial Developer Runtime SHA256: ${initialDevRuntimeSha}`);

// 2. Configure isolated temporary directory for test mutations
const ISOLATED_TEST_RUNTIME = path.join(os.tmpdir(), `nexspace-c5-test-${Date.now()}`);
process.env.MOCK_RUNTIME_DIR = ISOLATED_TEST_RUNTIME;

const { startServer } = await import('../server.ts');
const { JsonStorageEngine } = await import('../storage.ts');

const TEST_PORT = 4105;
const BASE_URL = `http://localhost:${TEST_PORT}/api/v1`;

async function runPhaseC5TestSuite() {
  console.log('\n===============================================================');
  console.log('🚀 NexSpace Phase C5: Cross-Module Integration & Final Regression');
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
      const data = await res.json().catch(() => null);
      return { status: res.status, headers: res.headers, data };
    }

    const isolatedStorage = new JsonStorageEngine(ISOLATED_TEST_RUNTIME);

    // ===============================================================
    // SECTION 1: Preflight & Baseline Health
    // ===============================================================
    console.log('--- SECTION 1: Preflight & Baseline Invariants ---');
    const health = await apiRequest('/health');
    assert(health.status === 200 && health.data?.success === true, '1.1 Mock server health endpoint active');
    assert(
      initialDevRuntimeSha === 'c1298c73fa86d24fd40a9d2f9a024fd9605ca3d69060be31db617376ee937d1f',
      '1.2 Developer runtime workspaces.json initial sha256 matches verified baseline'
    );

    // ===============================================================
    // SECTION 2: Administrator Platform KPI Aggregation (A06)
    // ===============================================================
    console.log('\n--- SECTION 2: Administrator Platform KPI Aggregation (A06) ---');

    // 2.1 Auth verification on /admin/workspaces/kpis
    const noAuthKpis = await apiRequest('/admin/workspaces/kpis');
    assert(noAuthKpis.status === 403, '2.1 Anonymous request to /admin/workspaces/kpis returns 403 Forbidden');

    const customerKpis = await apiRequest('/admin/workspaces/kpis', {
      headers: { 'x-mock-role': 'Customer', 'x-mock-user-id': 'USR-4412' }
    });
    assert(customerKpis.status === 403, '2.2 Customer request to /admin/workspaces/kpis returns 403 Forbidden');

    const organizerKpis = await apiRequest('/admin/workspaces/kpis', {
      headers: { 'x-mock-role': 'Organizer', 'x-mock-user-id': 'USR-9432' }
    });
    assert(organizerKpis.status === 403, '2.3 Organizer request to /admin/workspaces/kpis returns 403 Forbidden');

    const missingIdentityAdminKpis = await apiRequest('/admin/workspaces/kpis', {
      headers: { 'x-mock-role': 'Administrator' }
    });
    assert(missingIdentityAdminKpis.status === 403, '2.4 Admin role without identity returns 403 Forbidden');

    const invalidAdminIdKpis = await apiRequest('/admin/workspaces/kpis', {
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-UNKNOWN' }
    });
    assert(invalidAdminIdKpis.status === 403, '2.5 Unauthorized admin identity returns 403 Forbidden');

    const validAdminKpis = await apiRequest('/admin/workspaces/kpis', {
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' }
    });
    assert(validAdminKpis.status === 200, '2.6 Authorized Admin request returns 200 OK');
    assert(validAdminKpis.data?.success === true, '2.7 KPI response envelope has success: true');
    assert(typeof validAdminKpis.data?.data?.totalWorkspaces === 'number', '2.8 KPI data includes totalWorkspaces count');
    assert(typeof validAdminKpis.data?.data?.totalPublishedSpaces === 'number', '2.9 KPI data includes totalPublishedSpaces');
    assert(validAdminKpis.data?.data?.publishedMonthlyGrowth === null, '2.10 publishedMonthlyGrowth is null (no fabricated metric)');
    assert(typeof validAdminKpis.data?.data?.metroHubsCount === 'number', '2.11 KPI data includes distinct metroHubsCount');

    // 2.12 Platform KPI aggregation beyond 100 records (e.g. 150 canonical workspaces)
    console.log('\n  -> Simulating large platform dataset (150 workspaces)...');
    const seedWorkspaces = JSON.parse(
      fs.readFileSync(path.resolve(__dirname, '../../mock-data/seeds/workspaces.json'), 'utf8')
    );
    const seedIds = seedWorkspaces.map((s: any) => s.id);

    const largeDataset: any[] = [];
    const cities = ['Ho Chi Minh City', 'Hanoi', 'Da Nang', 'Can Tho', 'Hai Phong'];

    for (let i = 1; i <= 150; i++) {
      const city = cities[i % cities.length];
      const padId = String(i).padStart(3, '0');
      // Use existing seed IDs for the first entries so all seed IDs are covered in processedIds
      const id = i <= seedIds.length ? seedIds[i - 1] : `WS-SCALE-${padId}`;

      let reviewStatus = 'Draft';
      let operatingStatus = 'Inactive';
      let moderationStatus = 'Normal';
      let isListingVisible = false;

      if (i <= 80) {
        // 80 Published workspaces
        reviewStatus = 'Approved';
        operatingStatus = 'Active';
        moderationStatus = 'Normal';
        isListingVisible = true;
      } else if (i <= 115) {
        // 35 Pending workspaces (80 + 35 = 115)
        reviewStatus = 'Pending';
        operatingStatus = 'Inactive';
        moderationStatus = 'Normal';
        isListingVisible = false;
      } else if (i <= 130) {
        // 15 Suspended workspaces (115 + 15 = 130)
        reviewStatus = 'Approved';
        operatingStatus = 'Active';
        moderationStatus = 'Suspended';
        isListingVisible = false;
      } else {
        // 20 Draft workspaces (130 + 20 = 150)
        reviewStatus = 'Draft';
        operatingStatus = 'Inactive';
        moderationStatus = 'Normal';
        isListingVisible = false;
      }

      largeDataset.push({
        id,
        workspaceCode: `SC-${padId}`,
        organizerId: 'USR-9432',
        organizerLegalName: 'Scale Test Partner LLC',
        organizerTaxId: 'TAX-SCALE',
        organizerVerified: true,
        name: `Scale Hub ${padId}`,
        category: 'coworking_hub',
        streetAddress: `${i} Test Blvd`,
        district: `District ${((i % 10) + 1)}`,
        city,
        pricePerHour: 2.5,
        pricePerDay: 20,
        rating: 4.8,
        reviewsCount: 10,
        capacityDesks: 20,
        meetingRooms: 2,
        focusPods: 1,
        bookingConfirmationMode: 'Instant',
        reviewStatus,
        operatingStatus,
        moderationStatus,
        status: moderationStatus === 'Suspended' ? 'suspended' : operatingStatus === 'Active' ? 'active' : 'inactive',
        isLive: operatingStatus === 'Active',
        isListingVisible,
        submittedAt: reviewStatus === 'Pending' ? new Date(Date.now() - 3600000 * 5).toISOString() : null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        version: 1
      });
    }

    await isolatedStorage.writeAll('workspaces', largeDataset);

    const largeKpis = await apiRequest('/admin/workspaces/kpis', {
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' }
    });

    assert(largeKpis.status === 200, '2.13 Large dataset KPI request succeeds (200 OK)');
    assert(largeKpis.data?.data?.totalWorkspaces === 150, '2.14 Total canonical workspaces correctly counts 150 (not capped at 100)');
    assert(largeKpis.data?.data?.totalPublishedSpaces === 80, '2.15 Total published workspaces correctly counts 80 across full dataset');
    assert(largeKpis.data?.data?.pendingModerationCount === 35, '2.16 Pending moderation count correctly counts 35 across full dataset');
    assert(largeKpis.data?.data?.suspendedCount === 15, '2.17 Suspended count correctly counts 15 across full dataset');
    assert(largeKpis.data?.data?.partnerDraftsCount === 20, '2.18 Draft count correctly counts 20 across full dataset');
    assert(largeKpis.data?.data?.metroHubsCount === 5, '2.19 Metro hubs count correctly identifies 5 distinct cities');
    assert(largeKpis.data?.data?.pendingOldestHours >= 5, '2.20 Pending oldest hours calculated from submission timestamps');

    // Restore baseline seed fixtures for remaining tests
    await isolatedStorage.writeAll('workspaces', seedWorkspaces);

    // ===============================================================
    // SECTION 3: Public Marketplace Discovery (GET /public/workspaces)
    // ===============================================================
    console.log('\n--- SECTION 3: Public Discovery Integration ---');

    // 3.1 Public discovery returns only eligible listings
    const publicList = await apiRequest('/public/workspaces');
    assert(publicList.status === 200, '3.1 GET /api/v1/public/workspaces returns 200 OK');
    assert(Array.isArray(publicList.data?.data?.content), '3.2 Public content is an array');

    const publishedItems = publicList.data?.data?.content || [];
    assert(publishedItems.length > 0, '3.3 Public list contains approved seed workspaces');

    // 3.4 Invariant: every single public workspace must satisfy all 4 criteria
    const allEligible = publishedItems.every((w: any) => {
      // In public summary DTO, private fields like reviewStatus are omitted, but let's check id & name
      return w.id && w.name && w.city && typeof w.pricePerHour === 'number';
    });
    assert(allEligible, '3.4 Every workspace in public list is complete and well-formed');

    // 3.5 Privacy verification: no private fields in public summary
    const samplePublic = publishedItems[0];
    assert(samplePublic.organizerTaxId === undefined, '3.5a organizerTaxId is stripped from public summary');
    assert(samplePublic.reviewedBy === undefined, '3.5b reviewedBy is stripped from public summary');
    assert(samplePublic.suspendedBy === undefined, '3.5c suspendedBy is stripped from public summary');
    assert(samplePublic.suspendReason === undefined, '3.5d suspendReason is stripped from public summary');
    assert(samplePublic.grossRevenueMtd === undefined, '3.5e grossRevenueMtd is stripped from public summary');
    assert(samplePublic.totalBookingsMtd === undefined, '3.5f totalBookingsMtd is stripped from public summary');

    // 3.6 Search filtering
    const searchRes = await apiRequest('/public/workspaces?search=Saigon');
    assert(searchRes.status === 200, '3.6 Search query returns 200 OK');
    const allMatchSearch = (searchRes.data?.data?.content || []).every(
      (w: any) =>
        w.name.toLowerCase().includes('saigon') ||
        w.streetAddress?.toLowerCase().includes('saigon') ||
        w.city?.toLowerCase().includes('saigon') ||
        w.district?.toLowerCase().includes('saigon')
    );
    assert(allMatchSearch, '3.7 Search results strictly match the query string');

    // 3.7 Sorting - Price Ascending
    const sortedByPrice = await apiRequest('/public/workspaces?sortBy=pricePerHour&sortOrder=asc');
    assert(sortedByPrice.status === 200, '3.8 Sort by pricePerHour returns 200 OK');
    const prices = (sortedByPrice.data?.data?.content || []).map((w: any) => w.pricePerHour);
    let isSortedAsc = true;
    for (let i = 1; i < prices.length; i++) {
      if (prices[i] < prices[i - 1]) isSortedAsc = false;
    }
    assert(isSortedAsc, '3.9 Public workspaces sorted in ascending order of pricePerHour (cheapest first)');

    // 3.7b Sorting - Rating Descending (Highest Rated First)
    const sortedRatingDesc = await apiRequest('/public/workspaces?sortBy=rating&sortOrder=desc');
    assert(sortedRatingDesc.status === 200, '3.9b Sort by rating desc returns 200 OK');
    const ratingsDesc = (sortedRatingDesc.data?.data?.content || []).map((w: any) => w.rating || 0);
    let isRatingDesc = true;
    for (let i = 1; i < ratingsDesc.length; i++) {
      if (ratingsDesc[i] > ratingsDesc[i - 1]) isRatingDesc = false;
    }
    assert(isRatingDesc, '3.9c Public workspaces sorted in descending order of rating (highest first)');
    assert(ratingsDesc[0] >= 4.9, '3.9d First item in rating desc has top-tier rating (>= 4.9)');

    // 3.7c Sorting - Rating Ascending (Lowest Rated First)
    const sortedRatingAsc = await apiRequest('/public/workspaces?sortBy=rating&sortOrder=asc');
    assert(sortedRatingAsc.status === 200, '3.9e Sort by rating asc returns 200 OK');
    const ratingsAsc = (sortedRatingAsc.data?.data?.content || []).map((w: any) => w.rating || 0);
    let isRatingAsc = true;
    for (let i = 1; i < ratingsAsc.length; i++) {
      if (ratingsAsc[i] < ratingsAsc[i - 1]) isRatingAsc = false;
    }
    assert(isRatingAsc, '3.9f Public workspaces sorted in ascending order of rating (lowest first)');

    // 3.7d Sorting - Name Ascending (Alphabetical)
    const sortedByName = await apiRequest('/public/workspaces?sortBy=name&sortOrder=asc');
    assert(sortedByName.status === 200, '3.9g Sort by name asc returns 200 OK');
    const names = (sortedByName.data?.data?.content || []).map((w: any) => w.name);
    let isNameAsc = true;
    for (let i = 1; i < names.length; i++) {
      if (names[i].localeCompare(names[i - 1]) < 0) isNameAsc = false;
    }
    assert(isNameAsc, '3.9h Public workspaces sorted alphabetically by name');

    // 3.8 Pagination Audit with 25+ Eligible Workspaces
    // Add 25 synthetic eligible public workspaces to runtime to test pagination scale
    const currentWs = JSON.parse(fs.readFileSync(path.join(ISOLATED_TEST_RUNTIME, 'workspaces.json'), 'utf-8'));
    const expandedWs = [...currentWs];
    for (let k = 1; k <= 25; k++) {
      expandedWs.push({
        id: `WS-SCALE-${k}`,
        name: `Scale Hub Alpha ${String(k).padStart(2, '0')}`,
        category: k % 2 === 0 ? 'coworking_hub' : 'business_lounge',
        streetAddress: `${k * 10} Nguyen Hue`,
        district: 'District 1',
        city: 'Ho Chi Minh City',
        pricePerHour: 2.0 + k * 0.1,
        pricePerDay: 20.0 + k,
        capacityDesks: 30,
        organizerId: 'USR-9432',
        reviewStatus: 'Approved',
        operatingStatus: 'Active',
        moderationStatus: 'Normal',
        isListingVisible: true,
        rating: 4.0 + (k % 10) * 0.1,
        featuredPosition: 100 + k,
        version: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
    }
    fs.writeFileSync(path.join(ISOLATED_TEST_RUNTIME, 'workspaces.json'), JSON.stringify(expandedWs, null, 2), 'utf-8');

    // Page 1 Query
    const paginatedP1 = await apiRequest('/public/workspaces?page=1&limit=6');
    assert(paginatedP1.status === 200, '3.10 Page 1 request returns 200 OK');
    assert(paginatedP1.data?.data?.content?.length === 6, '3.11 Page 1 contains exactly 6 items');
    assert(paginatedP1.data?.data?.pagination?.page === 1, '3.12 Page 1 pagination page is 1');
    assert(paginatedP1.data?.data?.pagination?.totalElements >= 25, '3.13 totalElements reflects full dataset (>= 25)');
    const totalPages = paginatedP1.data?.data?.pagination?.totalPages;
    assert(totalPages >= 5, `3.14 totalPages is >= 5 (calculated ${totalPages})`);

    // Page 2 Query
    const paginatedP2 = await apiRequest('/public/workspaces?page=2&limit=6');
    assert(paginatedP2.status === 200, '3.15 Page 2 request returns 200 OK');
    assert(paginatedP2.data?.data?.content?.length === 6, '3.16 Page 2 contains exactly 6 items');
    assert(paginatedP2.data?.data?.pagination?.page === 2, '3.17 Page 2 pagination page is 2');

    // Verify zero duplicate IDs between Page 1 and Page 2
    const p1Ids = new Set((paginatedP1.data?.data?.content || []).map((w: any) => w.id));
    const p2Ids = (paginatedP2.data?.data?.content || []).map((w: any) => w.id);
    const hasOverlap = p2Ids.some((id: string) => p1Ids.has(id));
    assert(!hasOverlap, '3.18 Zero duplicate workspace IDs between Page 1 and Page 2');

    // Category filter applies before pagination
    const filteredCoworking = await apiRequest('/public/workspaces?category=coworking_hub&page=1&limit=6');
    assert(filteredCoworking.status === 200, '3.19 Filtered category pagination returns 200 OK');
    const allCoworking = (filteredCoworking.data?.data?.content || []).every((w: any) => w.category === 'coworking_hub');
    assert(allCoworking, '3.20 All items on paginated page strictly match the category filter');
    assert(filteredCoworking.data?.data?.pagination?.totalElements < paginatedP1.data?.data?.pagination?.totalElements, '3.21 totalElements reflects filtered subset count');

    // Restore isolated runtime back to pre-scale state for subsequent sections
    fs.writeFileSync(path.join(ISOLATED_TEST_RUNTIME, 'workspaces.json'), JSON.stringify(currentWs, null, 2), 'utf-8');

    // ===============================================================
    // SECTION 4: Public Workspace Details (GET /public/workspaces/:id)
    // ===============================================================
    console.log('\n--- SECTION 4: Public Workspace Details & Legacy Aliases ---');

    // 4.1 Canonical ID resolution
    const canonicalDetail = await apiRequest('/public/workspaces/WS-104');
    assert(canonicalDetail.status === 200, '4.1 GET /public/workspaces/WS-104 returns 200 OK');
    assert(canonicalDetail.data?.data?.id === 'WS-104', '4.2 Canonical ID is WS-104');
    assert(Boolean(canonicalDetail.data?.data?.name), '4.3 Workspace name is present');
    assert(Boolean(canonicalDetail.data?.data?.organizerLegalName), '4.4 Organizer legal name is present');
    assert(canonicalDetail.data?.data?.organizerTaxId === undefined, '4.5 Organizer tax ID is hidden from public detail');
    assert(canonicalDetail.data?.data?.reviewedBy === undefined, '4.6 Reviewer identity is hidden from public detail');

    // 4.2 Legacy alias resolution
    const alias1Detail = await apiRequest('/public/workspaces/1');
    assert(alias1Detail.status === 200, '4.7 GET /public/workspaces/1 resolves legacy alias to 200 OK');
    assert(alias1Detail.data?.data?.id === 'WS-101', '4.8 Alias "1" maps to canonical WS-101');

    const aliasSgPrime = await apiRequest('/public/workspaces/ws-sg-prime-01');
    assert(aliasSgPrime.status === 200, '4.9 GET /public/workspaces/ws-sg-prime-01 resolves to 200 OK');
    assert(aliasSgPrime.data?.data?.id === 'WS-104', '4.10 Alias "ws-sg-prime-01" maps to canonical WS-104');

    // 4.3 Unavailable / 404 behavior for un-eligible or missing workspaces
    const missingDetail = await apiRequest('/public/workspaces/NON-EXISTENT-999');
    assert(missingDetail.status === 404, '4.11 Non-existent workspace ID returns 404 NotFound');

    // ===============================================================
    // SECTION 5: Cross-Module End-to-End Lifecycle Consistency
    // ===============================================================
    console.log('\n--- SECTION 5: Cross-Module Lifecycle Consistency ---');

    // Step 1: Organizer creates Draft
    const createDraft = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: {
        name: 'Phase C5 Lifecycle Hub',
        category: 'coworking_hub',
        streetAddress: '100 Nguyen Du',
        district: 'District 1',
        city: 'Ho Chi Minh City',
        latitude: 10.7719,
        longitude: 106.7044,
        pricePerHour: 3.5,
        pricePerDay: 25.0,
        capacityDesks: 40,
        meetingRooms: 4,
        amenities: ['Gigabit Fiber WiFi', 'Ergonomic Desk', 'Artisanal Cafe'],
        coverImageUrl: 'https://images.unsplash.com/photo-1497366216548-37526070297c?auto=format&fit=crop&w=800&q=80',
        operatingHours: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false }
        ],
        clientDraftKey: 'draft-c5-lifecycle-001'
      }
    });

    assert(createDraft.status === 201, '5.1 Organizer creates Draft workspace (201 Created)');
    const createdId = createDraft.data?.data?.id;
    assert(Boolean(createdId), `5.2 Created workspace ID is ${createdId}`);
    assert(createDraft.data?.data?.reviewStatus === 'Draft', '5.3 Workspace reviewStatus is Draft');

    // Step 2: Customer CANNOT see Draft in public list or detail
    const publicCheck1 = await apiRequest('/public/workspaces');
    const inPublic1 = (publicCheck1.data?.data?.content || []).some((w: any) => w.id === createdId);
    assert(!inPublic1, '5.4 Draft workspace is NOT visible in public discovery list');

    const publicDetail1 = await apiRequest(`/public/workspaces/${createdId}`);
    assert(publicDetail1.status === 404, '5.5 Public detail for Draft workspace returns 404 NotFound');

    // Step 3: Organizer submits Draft for review
    const submitRes = await apiRequest(`/workspaces/${createdId}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { expectedVersion: createDraft.data?.data?.version, notes: 'Ready for admin compliance audit' }
    });
    assert(submitRes.status === 200, '5.6 Organizer submits workspace for review (200 OK)');
    assert(submitRes.data?.data?.reviewStatus === 'Pending', '5.7 Workspace reviewStatus is Pending');

    // Step 4: Customer still CANNOT see Pending workspace
    const publicDetail2 = await apiRequest(`/public/workspaces/${createdId}`);
    assert(publicDetail2.status === 404, '5.8 Public detail for Pending workspace returns 404 NotFound');

    // Step 5: Administrator approves workspace
    const approveRes = await apiRequest(`/admin/workspaces/${createdId}/review`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        reviewStatus: 'Approved',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Full fire & building safety compliance verified.',
        expectedVersion: submitRes.data?.data?.version
      }
    });
    assert(approveRes.status === 200, '5.9 Administrator approves workspace (200 OK)');
    assert(approveRes.data?.data?.reviewStatus === 'Approved', '5.10 Workspace reviewStatus is Approved');
    assert(approveRes.data?.data?.operatingStatus === 'Inactive', '5.11 Approval does not automatically publish (operatingStatus remains Inactive)');

    // Step 6: Customer still CANNOT see Approved but Inactive/un-published workspace
    const publicDetail3 = await apiRequest(`/public/workspaces/${createdId}`);
    assert(publicDetail3.status === 404, '5.12 Public detail for Approved-but-Inactive workspace returns 404 NotFound');

    // Step 7: Organizer publishes via lifecycle command
    const publishRes = await apiRequest(`/workspaces/${createdId}/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: {
        action: 'resume',
        expectedVersion: approveRes.data?.data?.version
      }
    });
    assert(publishRes.status === 200, '5.13 Organizer publishes workspace via lifecycle resume (200 OK)');
    assert(publishRes.data?.data?.operatingStatus === 'Active', '5.14 Workspace operatingStatus is now Active');
    assert(publishRes.data?.data?.isListingVisible === true, '5.15 Workspace isListingVisible is true');

    // Step 8: Customer CAN NOW see published workspace in discovery & details!
    const publicCheck2 = await apiRequest('/public/workspaces');
    const inPublic2 = (publicCheck2.data?.data?.content || []).some((w: any) => w.id === createdId);
    assert(inPublic2, '5.16 Published workspace is now VISIBLE in customer public discovery');

    const publicDetail4 = await apiRequest(`/public/workspaces/${createdId}`);
    assert(publicDetail4.status === 200, '5.17 Public detail for published workspace returns 200 OK');
    assert(publicDetail4.data?.data?.name === 'Phase C5 Lifecycle Hub', '5.18 Public detail displays correct name');
    assert(publicDetail4.data?.data?.pricePerHour === 3.5, '5.19 Public detail displays correct pricePerHour');
    assert(publicDetail4.data?.data?.capacityDesks === 40, '5.20 Public detail displays correct capacityDesks');

    // Step 9: Administrator suspends workspace
    const suspendRes = await apiRequest(`/admin/workspaces/${createdId}/moderation`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        moderationStatus: 'Suspended',
        suspendedBy: 'USR-1882',
        suspendReason: 'Urgent HVAC audit required following tenant noise complaint',
        expectedVersion: publishRes.data?.data?.version
      }
    });
    assert(suspendRes.status === 200, '5.21 Administrator suspends workspace (200 OK)');
    assert(suspendRes.data?.data?.moderationStatus === 'Suspended', '5.22 Workspace moderationStatus is Suspended');

    // Step 10: Customer IMMEDIATELY excluded from public list & details
    const publicCheck3 = await apiRequest('/public/workspaces');
    const inPublic3 = (publicCheck3.data?.data?.content || []).some((w: any) => w.id === createdId);
    assert(!inPublic3, '5.23 Suspended workspace is immediately EXCLUDED from customer public discovery');

    const publicDetail5 = await apiRequest(`/public/workspaces/${createdId}`);
    assert(publicDetail5.status === 404, '5.24 Public detail for suspended workspace returns 404 NotFound');

    // Step 11: Organizer cannot bypass suspension
    const bypassRes = await apiRequest(`/workspaces/${createdId}/lifecycle`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { action: 'resume', expectedVersion: suspendRes.data?.data?.version }
    });
    assert(bypassRes.status === 403 || bypassRes.status === 400, '5.25 Organizer cannot resume suspended workspace (403/400 Forbidden)');

    // Step 12: Administrator restores workspace
    const restoreRes = await apiRequest(`/admin/workspaces/${createdId}/moderation`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        moderationStatus: 'Normal',
        expectedVersion: suspendRes.data?.data?.version
      }
    });
    assert(restoreRes.status === 200, '5.26 Administrator restores workspace to Normal moderation (200 OK)');

    // Step 13: Customer can see it again!
    const publicDetail6 = await apiRequest(`/public/workspaces/${createdId}`);
    assert(publicDetail6.status === 200, '5.27 Restored workspace is accessible again in public detail (200 OK)');

    // ===============================================================
    // SECTION 6: Rejection & Resubmission Flow
    // ===============================================================
    console.log('\n--- SECTION 6: Rejection & Resubmission Flow ---');

    // 6.1 Create second workspace
    const draft2 = await apiRequest('/workspaces', {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: {
        name: 'Phase C5 Rejection Candidate',
        category: 'business_lounge',
        streetAddress: '25 Le Duan',
        district: 'District 1',
        city: 'Ho Chi Minh City',
        latitude: 10.7758,
        longitude: 106.7004,
        pricePerHour: 4.0,
        pricePerDay: 30.0,
        capacityDesks: 25,
        amenities: ['Gigabit Fiber WiFi', 'Espresso Bar'],
        coverImageUrl: 'https://images.unsplash.com/photo-1497215728101-856f4ea42174?auto=format&fit=crop&w=800&q=80',
        operatingHours: [
          { dayOfWeek: 1, openTime: '08:00', closeTime: '20:00', isClosed: false, is24Hours: false }
        ],
        clientDraftKey: 'draft-c5-reject-002'
      }
    });
    const id2 = draft2.data?.data?.id;

    // 6.2 Submit for review
    const submit2 = await apiRequest(`/workspaces/${id2}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { expectedVersion: draft2.data?.data?.version }
    });

    // 6.3 Admin rejects
    const reject2 = await apiRequest(`/admin/workspaces/${id2}/review`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Administrator', 'x-mock-user-id': 'USR-1882' },
      body: {
        reviewStatus: 'Rejected',
        reviewedBy: 'USR-1882',
        reviewFeedback: 'Missing proof of valid business lease agreement.',
        expectedVersion: submit2.data?.data?.version
      }
    });
    assert(reject2.status === 200, '6.1 Administrator rejects workspace with feedback (200 OK)');
    assert(reject2.data?.data?.reviewStatus === 'Rejected', '6.2 Workspace reviewStatus is Rejected');

    // 6.4 Customer CANNOT see rejected workspace
    const publicDetailReject = await apiRequest(`/public/workspaces/${id2}`);
    assert(publicDetailReject.status === 404, '6.3 Public detail for rejected workspace returns 404 NotFound');

    // 6.5 Organizer inspects private detail to view feedback
    const privateOwnerView = await apiRequest(`/workspaces/${id2}`, {
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' }
    });
    assert(privateOwnerView.status === 200, '6.4 Organizer accesses private detail (200 OK)');
    assert(privateOwnerView.data?.data?.reviewFeedback === 'Missing proof of valid business lease agreement.', '6.5 Organizer sees rejection feedback');

    // 6.6 Organizer edits and corrects rejected workspace
    const edit2 = await apiRequest(`/workspaces/${id2}`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: {
        description: 'Updated with lease cert #VN-88219.',
        expectedVersion: reject2.data?.data?.version
      }
    });
    assert(edit2.status === 200, '6.6 Organizer edits rejected workspace (200 OK)');

    // 6.7 Organizer resubmits corrected workspace
    const resubmit2 = await apiRequest(`/workspaces/${id2}/submit`, {
      method: 'POST',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { expectedVersion: edit2.data?.data?.version, notes: 'Lease documentation attached' }
    });
    assert(resubmit2.status === 200, '6.7 Organizer resubmits workspace (200 OK)');
    assert(resubmit2.data?.data?.reviewStatus === 'Pending', '6.8 Workspace transitions back to Pending without duplicate ID');
    assert(resubmit2.data?.data?.id === id2, '6.9 Canonical ID is preserved across rejection/resubmission');

    // ===============================================================
    // SECTION 7: Concurrency & Tenant Isolation
    // ===============================================================
    console.log('\n--- SECTION 7: Multi-Tenant & Concurrency Isolation ---');

    // 7.1 Cross-tenant mutation forbidden
    const crossTenantPatch = await apiRequest(`/workspaces/${createdId}`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-ANOTHER-TENANT' },
      body: { name: 'Hacked Title', expectedVersion: 1 }
    });
    assert(crossTenantPatch.status === 403, '7.1 Cross-tenant workspace modification returns 403 Forbidden');

    // 7.2 Stale version OCC conflict
    const staleOccPatch = await apiRequest(`/workspaces/${createdId}`, {
      method: 'PATCH',
      headers: { 'x-mock-role': 'Organizer', 'x-organizer-id': 'USR-9432' },
      body: { name: 'New Title', expectedVersion: 1 } // actual version has advanced
    });
    assert(staleOccPatch.status === 409, '7.2 Stale expectedVersion returns 409 Conflict');

    // ===============================================================
    // SECTION 8: Persistence & Developer Invariants
    // ===============================================================
    console.log('\n--- SECTION 8: Data Persistence & Working Tree Safety ---');

    // Check developer runtime hash
    const finalDevRuntimeSha = crypto.createHash('sha256').update(fs.readFileSync(DEV_RUNTIME_PATH)).digest('hex');
    assert(
      finalDevRuntimeSha === initialDevRuntimeSha,
      `8.1 Developer runtime workspaces.json UNTOUCHED (SHA: ${finalDevRuntimeSha})`
    );

  } finally {
    if (server) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
      console.log('\n  ✓ Mock server stopped');
    }

    // Clean up temporary isolated directory
    try {
      fs.rmSync(ISOLATED_TEST_RUNTIME, { recursive: true, force: true });
      console.log(`  ✓ Cleaned up isolated test runtime: ${ISOLATED_TEST_RUNTIME}`);
    } catch {
      // Ignore cleanup error
    }
  }

  console.log('\n===============================================================');
  console.log(`Phase C5 Test Results: ${passed} Passed, ${failed} Failed`);
  console.log('===============================================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

runPhaseC5TestSuite().catch((err) => {
  console.error('Unhandled Phase C5 test error:', err);
  process.exit(1);
});
