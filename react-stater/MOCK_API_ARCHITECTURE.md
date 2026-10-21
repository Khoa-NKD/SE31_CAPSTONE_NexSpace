# NexSpace — Centralized Mock API Architecture & Developer Guide

## 1. Overview
The NexSpace frontend (`react-stater`) is backed by a standalone, lightweight, zero-dependency Node.js Mock REST API Server. It eliminates hardcoded in-component arrays and fragmented `localStorage` stores, replacing them with a centralized, JSON-persisted REST API operating under the `/api/v1` namespace.

---

## 2. Directory Structure
```text
react-stater/
├── mock-server/                      # Standalone Mock REST Server Engine
│   ├── server.ts                     # HTTP Server entry point (default port 4000)
│   ├── router.ts                     # Route dispatcher, body parsing & CORS
│   ├── storage.ts                    # Mutex-locked atomic JSON storage engine
│   ├── routes/                       # Domain route handlers
│   │   ├── health.ts                 # GET /api/v1/health
│   │   ├── dev.ts                    # POST /api/v1/dev/reset (Protected dev reset)
│   │   └── demo.ts                   # Demo CRUD endpoints for infrastructure verification
│   ├── validators/                   # Input validation & field error mappings
│   │   └── demo.ts
│   ├── scripts/                      # Utility scripts
│   │   ├── reset.ts                  # CLI reset to seed fixtures
│   │   └── dev-all.ts                # Starts Mock API + Vite together
│   └── test/                         # Automated test suites
│       ├── mock-server.test.ts       # 31 server & persistence unit tests
│       └── api-client.test.ts        # 15 frontend client integration tests
├── mock-data/
│   ├── seeds/                        # Version-controlled baseline JSON fixtures
│   │   ├── users.json                # 10 representative accounts (USR-8821...)
│   │   ├── workspaces.json           # 6 representative hubs (WS-104...)
│   │   └── bookings.json             # 6 representative reservations (NX-9021...)
│   └── runtime/                      # Writable runtime JSON files (GITIGNORED)
│       └── .gitignore                # Protects runtime mutations from Git commits
├── src/
│   ├── lib/
│   │   └── api-client.ts             # Typed, SSR-safe HTTP client with query serialization
│   └── types/
│       └── api.ts                    # Response envelopes (ApiResponse, PageResponse) & adapters
```

---

## 3. Quick Start & Developer Commands

| Command | Action | Description |
|---|---|---|
| `npm run dev:all` | **Recommended** | Starts both Mock REST API (Port 4000) and Vite Dev Server (Port 3000) concurrently with unified logging. |
| `npm run mock:server` | Mock Server Only | Runs the standalone Mock REST server on `http://localhost:4000/api/v1`. |
| `npm run mock:reset` | Reset Data | Restores all runtime JSON files in `mock-data/runtime/` back to baseline seed fixtures. |
| `npm run test:mock` | Automated Tests | Executes the 31-step server persistence, concurrency, and validation test suite. |
| `npm run dev` | Frontend Only | Starts Vite frontend on `http://localhost:3000` (proxies `/api` to port 4000). |

---

## 4. Environment Variables (`.env`)

Configure the API transport in `react-stater/.env`:

```bash
# Base URL for frontend API client. Default is '/api/v1' (proxied via Vite on port 3000)
# In standalone mode or SSR, falls back to http://localhost:4000/api/v1
VITE_API_BASE_URL=/api/v1

# Target port for the standalone Mock REST Server (default: 4000)
MOCK_SERVER_PORT=4000

# Proxy target for Vite dev server (default: http://localhost:4000)
VITE_API_PROXY_TARGET=http://localhost:4000
```

---

## 5. Seed vs. Runtime Data Storage

1. **`mock-data/seeds/`**:
   - Contains immutable, version-controlled baseline test fixtures.
   - Initialized from actual project data (`USR-8821`, `WS-104`, `NX-9021`).
2. **`mock-data/runtime/`**:
   - Contains the active, writable JSON files modified by UI actions.
   - **Persistence across restarts**: When the server boots, existing runtime files are **preserved**. Changes are never automatically wiped on dev server restart.
   - **Git Protection**: `mock-data/runtime/.gitignore` ignores all generated files (`*`), protecting developer test mutations from polluting Git commits without modifying the root `.gitignore`.

---

## 6. Concurrency Safety & Atomic Writes

To prevent file corruption and race conditions during concurrent user operations:
1. **Per-Domain Mutex (`AsyncLock`)**:
   Every domain file (`users.json`, `workspaces.json`) has an independent asynchronous mutex. Concurrent requests queuing updates on the same file are executed sequentially without dropped updates.
2. **Atomic Temp File Replacement**:
   When saving data, `storage.ts` writes to `${filePath}.tmp.${timestamp}`, verifies the file is non-empty, and performs an atomic POSIX rename (`fs.promises.rename`).
3. **Corrupted File Detection & Backup**:
   If an invalid JSON syntax error is encountered during read, the server automatically backs up the broken file to `${filePath}.corrupt.${timestamp}` and alerts the developer.

---

## 7. How to Add a New Domain

When migrating a new feature domain (e.g., `organizers` or `support-cases`):
1. **Add Seed Fixture**: Create `mock-data/seeds/[domain].json` with baseline records.
2. **Add Route Handler**: Create `mock-server/routes/[domain].ts` implementing standard REST handlers (`GET`, `POST`, `PATCH`, `DELETE`) using `storage.getAll('[domain]')`, `storage.getById`, `storage.create`, `storage.update`.
3. **Mount Route**: Register the route pattern in `mock-server/router.ts`.
4. **Create Domain Service**: In `src/features/[feature]/api/service.ts`, import `apiClient` from `@/lib/api-client` and invoke endpoints.

---

## 8. Real Spring Boot Integration Transition

The mock REST server adheres directly to Spring Boot 3.5.0 conventions:
- **Response Envelope**: Standard `{ success: true, data: T, timestamp: string }`.
- **Pagination**: Spring Data `PageResponse<T>` (`content: T[]`, `totalElements`, `totalPages`, `page`, `size`).
- **Error Format**: Spring Boot `ApiErrorPayload` (`status`, `error`, `message`, `validationErrors`).
- **Adapter Layer**: UI components consume domain models. The feature `api/service.ts` uses `ResponseAdapter<TDto, TDomain>` to map wire DTO differences, ensuring that switching to the real Spring Boot backend requires zero JSX refactoring.

---

## 9. Current Status & Roadmap (Phases A, B, C1)
- **Phase A**: Core Mock Infrastructure, Storage Mutex, Typed Client, Dev CLI & Proxy (Completed).
- **Phase B**: Admin A03 (Users) & A02 (Role Permissions Matrix with dynamic KPIs) API migrations (Completed & Merged into `feature/frontend` via PR #25).
- **Phase C1**: Canonical Workspace Data Model & REST API Foundation (Completed).
- **Phases C2–C5**: Screen-by-screen Workspace UI migrations (Organizer O04/O16, Onboarding O05-O15, Admin A06/A07, Customer Discovery/Details).

---

## 10. Phase C1 — Canonical Workspace Data Model & REST API Foundation

Phase C1 unifies scattered, conflicting mock workspace records across Customer, Organizer, and Admin modules into a single authoritative data foundation backed by the 47-table database design specification (`Table: Workspace`, Sheet 15).

### 10.1 Twelve Domain Separations
Rather than collapsing independent lifecycle dimensions into a single ambiguous `status` field, `CanonicalWorkspace` explicitly decouples:
1. **Identity & Ownership**: Stable ID (`WS-104`), unique code (`HUB-SG-001`), `organizerId` (`USR-9432`), legal entity and verification flags.
2. **General Information**: `name`, `category` (5 enum types), descriptions, `usableAreaSqm`, contact channels.
3. **Location & Address**: Street address, building name, suite, district, city, geocoded coordinates (`latitude`/`longitude`), and IANA `timezone`.
4. **Operating Hours**: Structured day-by-day schedules (`dayOfWeek: 1..7`, `openTime`, `closeTime`, `isClosed`, `is24Hours`), check-in tolerances, and holiday rules.
5. **Amenities & Tags**: Standardized string keys (`wifi`, `standing_desk`, `cafe_bar`, `soundproof_booths`) and descriptive highlight tags.
6. **Media Metadata**: Dedicated cover image URL and gallery array with captions, display order, and media types (`image` / `360_degree`).
7. **Floor Plans & Capacity**: Total floors, verified desk count (`capacityDesks`), meeting rooms, focus pods, and floor summaries.
8. **Onboarding Progress**: Step indicator (`1..6`), completion boolean, draft progress percentage (`0..100`), and setup warning messages.
9. **Submission & Review Governance (Administrator)**: `reviewStatus` (`'Draft' | 'Pending' | 'Approved' | 'Rejected'`), timestamps, reviewer ID, and feedback notes.
10. **Admin Moderation Governance**: `moderationStatus` (`'Normal' | 'Suspended'`), suspend audit trail, and reason.
11. **Operational Lifecycle Status (Organizer)**: `operatingStatus` (`'Active' | 'Inactive' | 'Archived'`), `isLive`, hardware turnstile connectivity, and digital access mode.
12. **Marketplace Visibility & Metrics**: `isListingVisible`, landing page featured position, instant vs. manual confirmation mode, pricing (`pricePerHour`, `pricePerDay`, `pricePerMonth`), ratings, occupancy velocity, and financial totals.

#### Referential Foreign Key Integrity Matrix
All Workspace relationships are verified against active canonical records in `users.json`:

| Workspace ID | Reference Field | Referenced User ID | Exists in users.json | Valid Role | Status / Action |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `WS-101` | `organizerId` | `USR-9432` (Sarah Jenkins) | Yes | `Organizer` | CONFIRMED |
| `WS-101` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-101` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-104` | `organizerId` | `USR-9432` (Sarah Jenkins) | Yes | `Organizer` | CONFIRMED |
| `WS-104` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-104` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-108` | `organizerId` | `USR-2194` (Nguyen Van Hai) | Yes | `Organizer` | CONFIRMED |
| `WS-108` | `reviewedBy` | `null` | N/A | N/A | CONFIRMED (Pending Review) |
| `WS-108` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-092` | `organizerId` | `USR-5198` (Marcus Thorne) | Yes | `Organizer` | CONFIRMED |
| `WS-092` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-092` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-115` | `organizerId` | `USR-9432` (Sarah Jenkins) | Yes | `Organizer` | CONFIRMED |
| `WS-115` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-115` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-120` | `organizerId` | `USR-2194` (Nguyen Van Hai) | Yes | `Organizer` | CONFIRMED |
| `WS-120` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-120` | `suspendedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED (Suspended) |
| `WS-128` | `organizerId` | `USR-9432` (Sarah Jenkins) | Yes | `Organizer` | CONFIRMED |
| `WS-128` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-128` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-135` | `organizerId` | `USR-9432` (Sarah Jenkins) | Yes | `Organizer` | CONFIRMED |
| `WS-135` | `reviewedBy` | `null` | N/A | N/A | CONFIRMED (Draft) |
| `WS-135` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-142` | `organizerId` | `USR-9432` (Sarah Jenkins) | Yes | `Organizer` | CONFIRMED |
| `WS-142` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-142` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |
| `WS-150` | `organizerId` | `USR-9432` (Sarah Jenkins) | Yes | `Organizer` | CONFIRMED |
| `WS-150` | `reviewedBy` | `USR-1882` (Rachel Adams) | Yes | `Administrator` | CONFIRMED |
| `WS-150` | `suspendedBy` | `null` | N/A | N/A | CONFIRMED (Nullable) |

> [!NOTE]
> Previously referenced reviewer `USR-0001` did not exist in `users.json`. All administrative reviews and suspensions have been safely attributed to `USR-1882` (Rachel Adams, Administrator), the sole authorized platform administrator in `users.json`.

---

### 10.2 Reconciled Physical Venues & Alias Mapping

The workspace mapping table establishes 10 distinct physical venues, resolving all accidental legacy merges:

| Canonical ID | Workspace Name | Physical Address & Coordinates | Confirmed Legacy Aliases | Confidence | Primary Consumers |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **WS-101** | NexSpace Central Tower — District 1 | 72 Le Thanh Ton St, Ben Nghe, D1, HCMC (10.7781, 106.7020) | `1` | CONFIRMED | Customer Sample 1, Booking Flows |
| **WS-104** | NexSpace Saigon Prime Hub | Floor 14, Bitexco Tower, 2 Hai Trieu St, D1, HCMC (10.7719, 106.7044) | `2`, `ws-sg-prime-01`, `hive-central-hcm`, `hub-01`, `HUB-SG-001` | CONFIRMED | Customer Sample 2, Landing, O04, O16, Admin Analytics |
| **WS-108** | Hanoi Capital Innovation Lab | 58 Xuan Dieu, Quang An, Tay Ho, Hanoi (21.0628, 105.8272) | `westlake-loft-hanoi`, `HUB-HN-001` | CONFIRMED | Landing, Customer Discovery, Admin Bookings |
| **WS-092** | Da Nang Marina Tech Collective | 36 Bach Dang, Hai Chau, Da Nang (16.0678, 108.2208) | `mykhe-coastal-danang`, `hub-05`, `ws-vn-4401`, `HUB-DN-001` | CONFIRMED | Landing, Admin Moderation, Admin Analytics |
| **WS-115** | Thao Dien Creative Haven | 42 Nguyen Van Huong, Thu Duc / D2, HCMC (10.8062, 106.7325) | `komorebi-executive-hcm`, `3`, `HUB-SG-002` | CONFIRMED | Landing, Customer Sample 3, Admin Directory |
| **WS-120** | Westlake Executive Suites | 12 Kim Ma, Ba Dinh, Hanoi (21.0315, 105.8230) | `ba-dinh-boardroom-hanoi`, `hub-03`, `ws-vn-6620`, `HUB-HN-002` | CONFIRMED | Admin Moderation, Analytics (Suspended fixture) |
| **WS-128** | District 1 TechSpace — Creative Pod B | 88 Dong Khoi, Ben Nghe, D1, HCMC (10.7758, 106.7032) | `ws-landmark-bt-02`, `nexus-innovation-hcm`, `hub-02`, `ws-vn-7719`, `HUB-SG-003` | CONFIRMED | Organizer O04, Admin Moderation, Admin Analytics |
| **WS-135** | NexSpace Tech Hub - District 7 | Tan Trao St, Tan Phu, D7, HCMC (10.7320, 106.7210) | `ws-tech-d7-03`, `HUB-SG-004` | CONFIRMED | Organizer Onboarding Drafts (ReviewStatus: Draft) |
| **WS-142** | NexSpace Capital Center - District 3 | 180 Nam Ky Khoi Nghia, Vo Thi Sau, D3, HCMC (10.7825, 106.6912) | `ws-capital-d3-04`, `HUB-SG-005` | CONFIRMED | Organizer O04, Customer Marketplace |
| **WS-150** | NexSpace Skyline Suites — Le Duan | 33 Le Duan Blvd, Ben Nghe, D1, HCMC (10.7812, 106.7001) | `4`, `HUB-SG-006` | CONFIRMED | Customer Sample 4, Marketplace |

#### Reconciliation Case Details
- **Case A (Customer IDs `1` vs `2`)**:
  - Customer sample `1` corresponds to 72 Le Thanh Ton (Vincom Center / Central Tower, `WS-101`).
  - Customer sample `2` corresponds to Bitexco Financial Tower (2 Hai Trieu St, `WS-104`).
  - These venues are 1.2 km apart with distinct coordinates and floor structures.
  - Resolved by separating Customer ID `1` into canonical `WS-101`, and preserving Customer ID `2` on `WS-104`.
- **Case B (Hanoi Landing Venues)**:
  - `westlake-loft-hanoi` is located in Tay Ho District (`WS-108`).
  - `ba-dinh-boardroom-hanoi` is located in Ba Dinh District, 12 Kim Ma (`WS-120`).
  - Decoupled into their respective physical districts.
- **Case C (Customer Sample ID `4`)**:
  - Sample `4` is on Le Duan Boulevard (`WS-150`), separated from District 3 (`WS-142`).
- **Case D (Organizer Legacy ID `ws-sg-prime-01`)**:
  - Early Organizer mock `ws-sg-prime-01` had name "NexSpace Saigon Prime Hub", 54 desks, 4 meeting rooms, $8,420 gross revenue MTD, and 348 bookings MTD, exactly matching Bitexco Financial Tower (`WS-104`).
  - An earlier draft mistakenly mapped `ws-sg-prime-01` to `WS-101` due to an address string prototype typo.
  - Reconciled definitively to `WS-104`, ensuring O04 and O16 open the intended flagship venue without routing drift.

---

### 10.3 API Contract Architecture (Public vs Organizer vs Administrator)

The Mock API establishes three distinct access-scoped contract tiers:

#### 1. Public Marketplace Endpoints (Customer)
- **`GET /api/v1/public/workspaces`**:
  - Strict publication gate: `reviewStatus === 'Approved' && operatingStatus === 'Active' && moderationStatus === 'Normal' && isListingVisible === true`.
  - Non-public workspaces (Draft, Pending, Rejected, Suspended) are strictly excluded.
  - Projections (`toPublicWorkspaceSummary`): Omits `organizerTaxId`, `reviewedBy`, `reviewedAt`, `reviewFeedback`, `suspendedBy`, `suspendedAt`, `suspendReason`, `grossRevenueMtd`, and `totalBookingsMtd`.
- **`GET /api/v1/public/workspaces/:id`**:
  - Direct detail requests to non-eligible workspaces return `404 Not Found` to prevent leaking existence of unapproved or suspended drafts.
  - Projections (`toPublicWorkspaceDetail`): Excludes private governance, internal onboarding notes, and financial metrics.

#### 2. Organizer Endpoints
- **`GET /api/v1/workspaces`**:
  - Supports filtering by `organizerId` (`?organizerId=USR-9432`) to list spaces owned by the authenticated organizer.
- **`POST /api/v1/workspaces`**:
  - Validates `organizerId` against active `Organizer` accounts in `users.json`.
  - Forces initial lifecycle state: `reviewStatus: 'Draft'`, `operatingStatus: 'Inactive'`, `moderationStatus: 'Normal'`, `isLive: false`, `isListingVisible: false`.
- **`PATCH /api/v1/workspaces/:id`**:
  - **Strict Field Allowlist**: Permits only owner-editable fields (names, descriptions, photos, amenities, prices, capacities, operating hours).
  - **Disallowed Privileged Fields**: Mutating `id`, `workspaceCode`, `organizerId`, `reviewStatus`, `reviewedBy`, `moderationStatus`, `suspendedBy`, `rating`, `grossRevenueMtd`, or `totalBookingsMtd` returns `400 Bad Request`.
  - **Status Invariant Check**: Setting `operatingStatus: 'Active'`, `isLive: true`, or `isListingVisible: true` while `reviewStatus !== 'Approved'` or `moderationStatus === 'Suspended'` returns `400 Bad Request (IllegalStateTransition)`.
  - **Optimistic Concurrency**: Supports `version` matching; returns `409 Conflict` if the provided version is stale.

#### 3. Administrator Governance Endpoints
- **`PATCH /api/v1/admin/workspaces/:id/review`**:
  - Dedicated endpoint for approval workflow.
  - Body: `{ reviewStatus: 'Approved' | 'Rejected' | 'Pending', reviewedBy: string, reviewFeedback?: string }`.
  - Validates `reviewedBy` is an Administrator. If rejected, forces `operatingStatus: 'Inactive'`, `isLive: false`, and `isListingVisible: false`.
- **`PATCH /api/v1/admin/workspaces/:id/moderation`**:
  - Dedicated endpoint for moderation enforcement.
  - Body: `{ moderationStatus: 'Normal' | 'Suspended', suspendedBy?: string, suspendReason?: string }`.
  - If suspended, requires `suspendReason` (min 5 chars), and forces `operatingStatus: 'Inactive'`, `isLive: false`, `isListingVisible: false`, and `status = 'suspended'`.

---

### 10.4 Safe Runtime Data Migration & Diagnostic CLI

- **Startup Safety**:
  - `storage.initialize()` **never** rewrites or modifies existing runtime data on startup.
  - Runs a pure read-only schema diagnostic (`storage.diagnoseWorkspacesSchema`).
  - If legacy records lacking canonical schema fields are found, logs actionable instructions without altering files.
- **Explicit Migration CLI**:
  - Dedicated migration script: `npm run mock:migrate:workspaces`.
  - **Dry-run mode**: `npm run mock:migrate:workspaces -- --dry-run` previews required changes with zero disk mutations.
  - **Explicit run**: Creates timestamped non-overwriting backup (`workspaces.json.bak.<timestamp>`), validates before and after, performs atomic rename write, and is completely idempotent on subsequent runs.
- **Isolated Automated Testing**:
  - All test suites (`test:mock`, `api-client.test.ts`) run against temporary directories in `os.tmpdir()`, leaving the developer's working directory (`mock-data/runtime/`) 100% untouched.

---

### 10.5 Development-Only Mock Identity Boundaries & Future Spring Boot Transition

> [!WARNING]
> The mock server's client headers (`X-Organizer-Id`, `X-Mock-User-Id`, `X-Mock-Role`), role simulations, and DTO projections are local developer/testing stubs designed for frontend decoupling and offline UI verification. They do NOT constitute a production security boundary and must never be used for production authorization.

#### Development Identity vs. Production Authentication Architecture:
1. **Local Development Stubs**:
   - `X-Organizer-Id` / `X-Mock-User-Id`: Emulates tenant identity so O04 and O16 can verify multi-tenant isolation locally.
   - `X-Mock-Role`: Emulates RBAC policies (e.g. `Administrator` vs `Organizer` vs `Customer`).
   - Mock endpoints reject cross-tenant mutations with `403 Forbidden` (`ForbiddenOperation`) when an organizer attempts to modify another organizer's workspace under the simulated identity.
2. **Production Spring Boot Authentication Contract**:
   - Identity is established strictly via cryptographically signed JWT bearer tokens (`Authorization: Bearer <token>`).
   - Tenant ID, user identity, and roles are extracted server-side from verified token claims on every request.
   - Client-controlled plaintext headers (such as `X-Organizer-Id`) are ignored and stripped by API gateway filters.
   - Method-level security annotations enforce tenant boundaries:
     - `GET /api/v1/public/workspaces/**` -> `@PermitAll` with `PublicWorkspaceSummaryDto`.
     - `GET /api/v1/workspaces` -> `@PreAuthorize("hasRole('ORGANIZER')")` filtered by `authentication.principal.organizerId`.
     - `PATCH /api/v1/workspaces/:id` & `/lifecycle` -> `@PreAuthorize("hasRole('ORGANIZER') and @workspaceSecurity.isOwner(authentication, #id)")`.
     - `PATCH /api/v1/admin/workspaces/:id/**` -> `@PreAuthorize("hasRole('ADMIN')")`.
3. **Frontend Decoupling**:
   - The frontend service layer in `src/features/workspaces/api/` completely abstracts these transport concerns, allowing an effortless switch from mock development headers to standard HTTP interceptor Bearer tokens when real microservices are ready.

---

## 11. Phase C3: Organizer Workspace Onboarding Wizard Integration & Submission Architecture

### 11.1 Onboarding Workflow Overview
Phase C3 migrates the 6-step Organizer Workspace Creation Wizard (O05–O10) and Pre-submission Review Checklist (O15) to the centralized, writable Mock REST API.

```text
[O05 Basic Info] ──(POST /workspaces)──► [Canonical ID Assigned: WS-xxx, v1]
       │
[O06 Location] ──(PATCH /workspaces/:id)──► [Address, Coordinates, v2]
       │
[O07 Hours] ──(PATCH /workspaces/:id)──► [Operating Schedules, 24/7 flag, v3]
       │
[O08 Amenities] ──(PATCH /workspaces/:id)──► [Canonical Amenity IDs, v4]
       │
[O09 Media] ──(PATCH /workspaces/:id)──► [Durable Remote URLs Only, v5]
       │
[O10 Floor Plan] ──(PATCH /workspaces/:id)──► [Capacity & Floor Summaries, v6]
       │
[O15 Review Checklist] ──(POST /workspaces/:id/submit)──► [reviewStatus: 'Pending', v7]
       │
       ▼
[O04 Dashboard] ── Reflects 'UNDER REVIEW' badge (Excluded from Public Marketplace)
```

---

### 11.2 Draft Creation & Idempotent Save Semantics
1. **Initial Draft Creation (`POST /api/v1/workspaces`)**:
   - Triggered on Step O05 when the user clicks "Save as Draft" or advances if no server ID exists.
   - Enforces server-side assignment of `canonicalWorkspaceId` (e.g. `WS-111`), organizer tenant ownership (`USR-9432`), `reviewStatus: 'Draft'`, `moderationStatus: 'Normal'`, and initial `version: 1`.
   - Never allows client-controlled ID generation or auto-publishing.
   - **Idempotent Draft Creation Contract (`clientDraftKey`)**:
     - Before issuing the initial creation POST, the client generates and persists a stable UUID/token (`clientDraftKey`) in Zustand / localStorage (`nexspace_organizer_onboarding_draft_v1`).
     - On double-clicks, slow network timeouts, React Strict Mode remounts, or user retries, the same `clientDraftKey` is re-sent.
     - The mock server matches `w.organizerId === payload.organizerId && w.clientDraftKey === payload.clientDraftKey`. If a matching workspace already exists, it returns `200 OK` with the existing canonical record rather than creating a duplicate workspace.
     - Scoped strictly by `organizerId` to prevent cross-organizer key collisions.
   - Guarded in-memory during single-session execution via `inFlightPromiseRef` lock ref.
2. **Incremental Step Updates (`PATCH /api/v1/workspaces/:id`)**:
   - Every subsequent step (O06 to O10) transmits only its supported domain fields along with the current `expectedVersion`.
   - On success, the server increments `version` sequentially and returns the updated canonical record.
   - Store updates `serverVersion` and marks `isDraftSynced: true`.

---

### 11.3 Field-to-API Bidirectional Mapper & Media Upload Reality (`wizard-api-mapper.ts`)
A dedicated pure mapping utility reconciles wizard frontend state with canonical REST DTOs:
- **Operating Hours**:
  - Wizard UI represents hours in 12-hour AM/PM format (e.g., `"08:00 AM"`).
  - Mapper converts to 24-hour ISO format (`"08:00"`) for canonical `WorkspaceOperatingHour[]`.
  - Rehydration back into the store preserves 12-hour formatting for user inputs.
- **Media Gallery & Ephemeral Blob Safety**:
  - `mapWizardMediaToCanonical` strictly filters for durable remote URLs (`http://`, `https://`).
  - Temporary browser blob URLs (`blob:http://...`) created via `URL.createObjectURL(file)` during local file selection are strictly excluded from server payloads to avoid storage of ephemeral, unresolvable browser references.
  - When the browser reloads, in-memory `blob:` URLs are revoked by the browser engine. Local drafts that contain only local blobs are clearly distinguished with `Local Preview (Unsynced)` badges.
  - In O15 pre-submission review, `isMediaValid` strictly requires at least 1 durable remote photograph (`http://` or `https://`). If only local previews exist, submission is disabled with an actionable banner explaining that an active cloud upload service is required.
  - Seeded remote HTTPS images remain fully durable.
- **Floor Plan & Zone Aggregation**:
  - Aggregates zone capacities, desk counts, and meeting rooms into workspace-level summary fields (`capacityDesks`, `meetingRooms`, `focusPods`, `capacityLabel`, `totalFloors`).
  - Does not overwrite granular seat/canvas data owned by separate editor modules.

---

### 11.4 LocalStorage Draft Compatibility & Non-Destructive Reconciliation
- **Data Safety Requirement**: Existing localStorage keys (`nexspace_organizer_onboarding_draft_v1` and `nexspace_organizer_workspaces_v1`) are never deleted or wiped.
- **State Separation**:
  1. *Canonical Server Record*: Authoritative backend state fetched by ID.
  2. *Local Draft State*: Contains unsaved user changes, local form state, and uploaded blob previews.
  3. *UI State*: Current active step, expanded accordion tabs, modal visibility.
- **Draft Recovery Flow**:
  - When the wizard mounts with an existing local draft lacking `canonicalWorkspaceId`, the UI indicates `Unsynchronized Local Draft`.
  - An explicit path allows the organizer to save the draft, promoting it to a canonical record on the server without creating duplicates on mount.
  - If a canonical record is loaded (via URL query param `?id=WS-xxx`), the store rehydrates server values while preserving pending local media blobs.

---

### 11.5 Optimistic Concurrency & Conflict Protection
- All mutation requests (`PATCH /api/v1/workspaces/:id` and `POST /api/v1/workspaces/:id/submit`) provide `expectedVersion`.
- If another session modified the workspace concurrently, the mock server rejects the request with `409 Conflict` (`CONCURRENCY_CONFLICT`).
- The UI catches the 409 error, sets `syncError`, alerts the organizer via toast, and preserves unsaved local form input so data is never silently discarded.

---

### 11.6 Dedicated Submission Endpoint (`POST /api/v1/workspaces/:id/submit`)
- **Route**: `POST /api/v1/workspaces/:id/submit`
- **Ownership Check**: Verifies the requester matches the workspace `organizerId`.
- **Eligibility Validation**:
  - `reviewStatus` must currently be `Draft`. Submitting an already `Pending` or `Approved` workspace is rejected.
  - `moderationStatus` must not be `Suspended`.
- **Completeness Validation**:
  - Title (>= 3 chars) and valid category.
  - Physical address (street, district, city).
  - At least one active operating schedule or 24/7 setting.
  - Minimum configured capacity (`capacityDesks > 0` or valid zone desks).
  - At least 1 selected amenity.
  - At least 1 durable photograph or cover image.
- **State Transition**:
  - Transitions `reviewStatus: 'Pending'`, `status: 'pending'`, `draftProgress: 100`, `onboardingCompleted: true`.
  - Sets `submittedAt` timestamp and stores organizer submission notes.
  - Does **not** auto-approve or auto-publish (Admin approval is handled separately in Phase C4).
- **Public Marketplace Isolation**:
  - Workspaces in `Draft` or `Pending` status are excluded from `/api/v1/public/workspaces`.
  - Only `Approved` + `Active` + `isListingVisible: true` spaces appear in customer search.

---

### 11.7 Future Spring Boot Integration Notes
When transitioning from the Node.js Mock API to production Spring Boot microservices:
1. Replace simulated `X-Organizer-Id` with OAuth2 JWT principal extraction (`@AuthenticationPrincipal Jwt jwt`).
2. Implement file uploads via S3/Cloudflare R2 presigned URLs (`POST /api/v1/media/upload-url`) before attaching URLs to the workspace DTO.
3. Maintain the same DTO schemas (`CreateWorkspaceDto`, `UpdateWorkspaceDto`, `SubmitWorkspaceDto`) to ensure zero frontend regression.
4. Concurrency versioning maps directly to `@Version` JPA entity optimistic locking.

---

## 12. Phase C3.1: Development-Only Media Upload & Concurrency Architecture

### 12.1 Development-Only Media Upload Contract
The mock server provides a lightweight, development-only file upload service operating under `/api/v1/media`:

- **Upload Endpoint**: `POST /api/v1/media/upload`
  - Accepts `multipart/form-data` with a single file field named `file`.
  - Parsed using standard Node 24 streaming multipart (`new Request(url, { body: req, duplex: 'half' }).formData()`) without unsafe third-party ad-hoc parsers.
  - Returns `201 Created` with metadata envelope:
    ```json
    {
      "success": true,
      "data": {
        "id": "media-1792527689763-42ce7f02",
        "filename": "media-1792527689763-42ce7f02.png",
        "originalName": "workspace-photo.png",
        "mimeType": "image/png",
        "size": 67,
        "url": "/api/v1/media/media-1792527689763-42ce7f02.png"
      },
      "timestamp": "2026-10-20T20:21:29.800Z"
    }
    ```
- **Retrieval Endpoint**: `GET /api/v1/media/:mediaId` (also supports `HEAD`)
  - Streams binary file content directly from disk.
  - Enforces headers: `Content-Type: image/...`, `Content-Length`, `Cache-Control: public, max-age=86400`, `X-Content-Type-Options: nosniff`.
  - Returns `404 Not Found` if file does not exist, or `400 Bad Request` if `:mediaId` contains invalid characters or directory traversal sequences.

### 12.2 Storage Location & Git Protection
- Uploaded files are written directly to `<MOCK_RUNTIME_DIR>/uploads/`.
- In normal local development, this resolves to `react-stater/mock-data/runtime/uploads/`.
- **Git Protection**: `mock-data/runtime/.gitignore` specifies `*` to strictly ignore all runtime JSON and uploaded media files. The root `.gitignore` is never modified.
- **Test Isolation**: All automated tests configure `process.env.MOCK_RUNTIME_DIR` to isolated temporary directories (`os.tmpdir()`), ensuring developer working runtime JSON and uploads are never modified or polluted by tests.

### 12.3 Strict Binary File Validation & Ingestion Boundary Safety
Validation does not trust the client's `Content-Type` header alone; it inspects magic binary file signatures and enforces HTTP boundary limits:
- **HTTP Ingestion Boundary Protection**:
  - Checks `Content-Length` header at the HTTP ingestion boundary before buffering or parsing formData.
  - Employs a bounded streaming counter to safely reject chunked or unbounded streams exceeding 10MB without buffering them into memory.
  - Drains oversized streams to `/dev/null` with `Connection: close` to prevent client socket `EPIPE` / `ECONNRESET` exceptions.
  - Safely handles malformed multipart requests, returning `400 BadRequest` instead of unhandled 500 crashes.
  - Responses include `X-Development-Only: local-mock-storage` to clearly identify the mock storage provider.
- **Binary Signature Validation**:
  - **JPEG**: Leading magic bytes `FF D8 FF`.
  - **PNG**: Leading magic bytes `89 50 4E 47 0D 0A 1A 0A`.
  - **WebP**: Leading `RIFF` header with `WEBP` container signature.
- **Rejection Rules**:
  - Empty files (0 bytes) return `400 EmptyFile`.
  - Oversized files (>10MB) return `400 FileTooLarge`.
  - Executable binaries, scripts, or text files disguised with image extensions return `400 InvalidFileType`.
  - Directory traversal sequences (`..`, `/`, `\`) in filename or `:mediaId` return `400 InvalidMediaId` or are stripped.

### 12.4 Server-Side Media Reference Disk Verification on Submission
When submitting a workspace for review (`POST /api/v1/workspaces/:id/submit`):
- All referenced media URLs (`coverImageUrl` and items in `images`) are validated.
- **Local Development Media (`/api/v1/media/<filename>`)**:
  - Validates filename format (`^[a-zA-Z0-9_.-]+$`) and rejects path traversal sequences.
  - Verifies that the referenced file actually exists on physical disk in `<MOCK_RUNTIME_DIR>/uploads/`.
  - Rejects nonexistent references (e.g. `/api/v1/media/not-found.png`) with `400 BadRequest` and explicit validation error (`Local media asset does not exist on disk`).
- **External HTTPS Media URLs**:
  - Validates basic URL structure and syntax.
  - *Documented Limitation*: Live external network requests (HTTP GET/HEAD) are deliberately not performed in the local mock server to prevent external network flakiness, latency, and SSRF risks. Production cloud object storage validates asset existence via bucket ACLs and presigned URL tokens.
- **O15 Client Review Checklist Alignment**:
  - O15 verifies that media items are durable and free of upload errors before marking the media checklist section complete.

### 12.5 Durable Development URLs & Vite Proxy Routing
- The upload API returns a relative durable URL: `/api/v1/media/:mediaId`.
- **No Machine-Specific Hostnames**: Persisting relative URLs avoids hardcoding hostnames (`http://localhost:4000`), allowing uploaded media to resolve identically across different ports, LAN IP addresses, and reverse proxies.
- **Vite Connect Middleware Proxy**: `vite.config.ts` includes early connect proxy middleware (`mockApiProxyPlugin`) that intercepts all `/api/` traffic and forwards it to the mock server on port 4000 before TanStack Start router middleware executes.

### 12.5 Browser Reload & Server Restart Durability
- Unlike transient browser `blob:` or `data:` URLs, uploaded media files reside in physical disk storage.
- When an organizer reloads the browser, the canonical workspace record hydrates with durable `/api/v1/media/...` URLs, which load immediately.
- When the Mock Server process is restarted, runtime JSON and files in `uploads/` remain intact, and all media URLs continue to resolve byte-for-byte.

### 12.6 Concurrent Draft Creation Idempotency
- **Atomic Concurrency Mutex**: Draft check-and-create operations are wrapped in `storage.withLock('workspaces-create', ...)` to serialize execution across async ticks.
- **Simultaneous Request Guarantees**: Multiple simultaneous `POST /api/v1/workspaces` requests (e.g. from rapid double-clicks, concurrent tabs, or `Promise.all` bursts) with the same `clientDraftKey` execute within the lock. The first request creates the canonical record; subsequent concurrent requests detect the existing record and return HTTP 200 with the identical canonical ID.
- **Tenant Scope Isolation**: Idempotency is strictly scoped to the server-resolved organizer identity (`effectiveOrganizerId`). Different organizers using the same key create independent, isolated workspaces with distinct IDs without key collisions.
- **Multi-Process Limitation**: The in-process async mutex guarantees serialization within a single Node.js mock server process. In a distributed multi-process environment, a distributed Redis lock or database unique constraint would be required.

### 12.7 O11–O14 Module Boundaries
- The Onboarding Wizard (O05–O10, O15) strictly manages high-level workspace metadata, operating hours, amenities, media gallery, and aggregated floor summaries.
- Detailed floor plan layout drawing, resource/seat canvas editors, individual desk assignments, and pricing rule configurations (O11–O14) belong to collaborator-owned modules and are preserved without modification.

### 12.8 Production vs. Development Distinction
- **Development Service**: Stores media files locally on the development machine filesystem; provides zero cloud credentials; development-only.
- **Future Production Service**: In production, media will be uploaded directly to cloud object storage (AWS S3, Cloudflare R2) via presigned upload URLs with CDN edge caching, automatic image resizing/WebP transcoding, and cloud antivirus scanning.

---

## 13. Phase C4 — Administrator Workspace Management & Approval Workflow

Phase C4 connects the Administrator Workspace Management console (A06 Overview and A07 Workspace Directory) to the centralized REST API, establishing a resilient, server-persisted review and moderation workflow with strict concurrency guarantees and cross-role lifecycle parity.

### 13.1 Authoritative Public Eligibility Predicate
To prevent discrepancies between public customer discovery and administrative metrics, workspace eligibility is governed by a single authoritative contract:

$$\text{isPubliclyEligible}(w) \iff \begin{cases}
w.\text{reviewStatus} = \text{'Approved'} \\
w.\text{operatingStatus} = \text{'Active'} \\
w.\text{moderationStatus} = \text{'Normal'} \\
w.\text{isListingVisible} = \text{true}
\end{cases}$$

- **Shared Pure Function**: Exported as `isWorkspacePubliclyEligible(w)` from `src/features/workspaces/api/types.ts` and mirrored in `mock-server/routes/workspaces.ts`.
- **A06 KPI Metric Alignment**: A06 "Total Published Spaces" computes counts strictly using this predicate, guaranteeing 100% agreement with `GET /api/v1/public/workspaces`.
- **Decoupling Approval from Publication**: Administrator approval (`reviewStatus: 'Approved'`) verifies legal, safety, and facility standards. Approval **does not** automatically publish the workspace to customers; publication remains an autonomous Organizer operational action (O16) setting `isListingVisible: true`.

### 13.2 Mandatory Optimistic Concurrency Control (OCC)
To eliminate lost updates and prevent concurrent administrators from overriding decisions without seeing current record state, Admin review and moderation endpoints enforce mandatory OCC:

- **Endpoints**:
  - `PATCH /api/v1/admin/workspaces/:id/review`
  - `PATCH /api/v1/admin/workspaces/:id/moderation`
- **Request Contract**: `expectedVersion` is a **required positive integer**.
  - Missing `expectedVersion` $\to$ `400 BadRequest` (`expectedVersion is required and must be a positive integer`).
  - Invalid `expectedVersion` ($\le 0$ or non-integer) $\to$ `400 BadRequest`.
  - Stale `expectedVersion` ($\ne \text{existing.version}$) $\to$ `409 Conflict`.
  - Valid `expectedVersion` ($= \text{existing.version}$) $\to$ Executes atomic transition and increments `version` monotonically ($v \gets v + 1$).
- **Atomicity & Mutex Locking**: Handlers acquire `storage.withLock('workspaces-mutation', ...)` to guarantee serial execution across async ticks. In concurrent race conditions with identical versions, exactly one request succeeds (HTTP 200) and the losing request receives HTTP 409 Conflict.
- **UI Conflict Feedback & Reconfirmation**: On HTTP 409, the client invalidates React Query caches (`workspaceKeys.all`) to pull latest server state, alerts the administrator via toast warning, preserves user-entered notes, and requires explicit reconfirmation against the latest state.
- **Organizer Bypass Prevention**: Generic `PATCH /api/v1/workspaces/:id` enforces `DISALLOWED_WORKSPACE_PATCH_FIELDS`, rejecting any organizer attempts to modify governance fields (`reviewStatus`, `moderationStatus`, etc.) with `400 BadRequest`.

### 13.3 Review & Moderation State Lifecycle
- **Draft Protection**: Workspaces in `Draft` status cannot be reviewed or moderated; the organizer must submit the workspace first (transitions to `Pending`).
- **Mandatory Rejection Feedback**: Admin rejection requires explanatory feedback (minimum 5 characters) explaining required corrections. Rejection preserves the feedback note and transitions the workspace to `Rejected`. Subsequent edits by the organizer reset `reviewStatus` back to `Draft` for iterative remediation.
- **Moderation Suspension**: Active workspaces can be suspended by an administrator for safety or compliance investigations. Suspension requires an explanatory reason (minimum 5 characters), records `suspendedBy`, `suspendedAt`, and immediately excludes the workspace from the customer marketplace.
- **Moderation Restoration**: Restoring a suspended workspace back to `Normal` clears suspension metadata (`suspendedBy`, `suspendedAt`, `suspendReason`), returning the workspace to active public eligibility if all other criteria remain satisfied.

### 13.4 Admin Data Provenance & Neutralized Claims
To maintain factual integrity and avoid misleading dashboard claims:
- **Elapsed Time vs. SLA**: Removed unverified SLA promises (`SLA < 24h`, `Avg Turnaround: 3.4h`). Labeled neutrally as `Pending Review`, with oldest ticket wait time calculated dynamically from persisted `submittedAt` timestamps.
- **Geofence Verification**: Unpersisted geofence claims neutralized to `Not available`.
- **Compliance & Audits**: Removed fabricated claims of ISO-27001, OSHA, and automated scanner compliance. Retained canonical regulatory fields (Tax ID, verified facility photos, floor plan certificates).
- **Decision History Limitations**: Persisted records capture the *latest* review and moderation metadata. The Admin UI presents "Latest Decision" rather than synthesizing a multi-event historical timeline. Full immutable event sourcing is deferred to production database audit tables.

### 13.5 Mock Identity Headers vs. Production Security
- **Development Simulation Only**: Headers `x-mock-role`, `x-mock-user-id`, and `x-organizer-id` allow deterministic testing of multi-role personas (Administrator, Organizer, Customer) in local development.
- **Not Production Security**: In production Spring Boot 3.5.0:
  - Caller identity is extracted exclusively from cryptographic JWT / OAuth2 access tokens via Spring Security `SecurityContextHolder`.
  - Endpoints are protected by method-level authorization: `@PreAuthorize("hasRole('ADMINISTRATOR')")`.
  - OCC maps directly to JPA `@Version` on the canonical `Workspace` entity, throwing `OptimisticLockException` mapped to HTTP 409 Conflict.
