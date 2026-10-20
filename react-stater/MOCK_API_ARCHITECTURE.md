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

## 9. Current Status & Limitations (Phase A)
- **Phase A Scope**: Infrastructure, Mock REST Engine, Storage Mutex, Typed Client, and Developer Demo endpoints are 100% complete and verified.
- **UI Screens**: Existing Admin, Customer, and Organizer UI screens remain untouched in Phase A. They will be incrementally migrated starting with Pilot Domain **Admin Users (A03)** in Phase B.
