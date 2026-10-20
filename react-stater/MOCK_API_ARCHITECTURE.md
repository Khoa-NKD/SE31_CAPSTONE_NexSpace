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
