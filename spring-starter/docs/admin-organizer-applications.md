# Admin view organizer applications

## Source and requirements

Implementation date: 2026-11-05. Backend and frontend were safely switched from the previous Application Status task branches back to feature/backend and feature/frontend. Fetch and fast-forward-only pull advanced both development branches by 17 commits:

- Backend: 0c85a9ef to ffca51fe4fb0f2d7e209b89b77af79674a7027d8.
- Frontend: 4eaaeb3f to c4bf85f6f58501e7e4f8fe3e9e40bb562bf0ac5f.

The updated bases contain Submit, Business Profile, Verification Upload and Application Status, plus upstream Workspace changes. No task branch, commit, push, merge commit, rebase, reset, stash or additional worktree was created during this task. Pre-existing local documentation, configuration and guidance were preserved.

Report 3 SRS M03-UC10 / section 3.4.10 specifies viewing and filtering submitted Organizer applications by status and submission time. Its generic interface text mentions other write operations, and its actor line also lists Organizer; this implementation follows the explicit task and use-case purpose restricting this administrative list to ADMIN. Application details and decisions remain separate use cases. Workspace submissions are not included.

## Read-only API

GET `/api/admin/organizer-applications`, authenticated through the existing Bearer JWT security chain. Both controller and service require ADMIN. The service additionally reloads the actor and requires the account to be active before querying application data. USER and ORGANIZER receive 403; anonymous requests receive 401.

| Parameter | Meaning |
| --- | --- |
| page | 1-based integer, default 1; values below 1 return 400. |
| size | Default 20; valid range 1–100, otherwise 400. |
| search | Optional trimmed substring of legal business name, applicant username or account email; maximum 255 characters. |
| status | Optional actual OrganizerProfileStatus; omission lists all submitted applications. Unknown values, including SUSPENDED, return 400. |
| sortBy | id, legalName, submittedAt, reviewedAt or status; default submittedAt. Other fields return 400. |
| sortDir | asc or desc; default desc. Invalid values return 400. |

The response uses the existing ApiResponse and PageResponseDTO: data.listObjects, pageNumber, pageSize, totalRecords, totalPages, hasNext and hasPrevious. Existing shared pagination aliases are preserved. Empty or out-of-range pages return 200 with an empty list and genuine totals.

Each list row contains only id, legalName, businessType, applicantId, applicantUserName, applicantEmail, status, submittedAt and reviewedAt. Applicant information comes from the profile owner's users row, not the profile's business contact email. Documents, private URLs, banking fields, passwords, tokens, review feedback and reviewer internals are not returned.

The existing organizer_profile and users mappings are reused. A JPQL constructor projection selects only list metadata; it does not materialize user-role or document graphs. The explicit matching count query supports server-side pagination. Parameters are bound, LIKE wildcard characters are escaped using an explicit escape character, and sort properties are allowlisted. A descending id tie-breaker stabilizes pages when primary sort values match. The service transaction is read-only and has no persistence/storage/audit writes.

## Application states and history limits

The existing profile enum contains DRAFT, PENDING_REVIEW, APPROVED, REJECTED and REVISION_REQUESTED. SUSPENDED is not an application state and is not added or inferred from account status.

Only records with a submittedAt value and a non-DRAFT status belong to this submitted-application list. DRAFT records are excluded even when explicitly requested as a valid enum filter. The UI offers pending, approved, rejected, changes requested and all submitted filters, defaulting to pending. Approved/rejected/revision rows show the current review outcome and actual reviewedAt when present; missing dates remain unavailable.

Read-only inspection of the configured database found organizer_profile, organizer_document, organizer_payout and the generic audit_log table, but no dedicated Organizer review-history table. At inspection time the generic audit table contained zero rows whose module/entity/action matched Organizer. Source contains a generic audit repository/service but no implemented Organizer review-decision audit writer. This feature therefore exposes current outcomes only, with an explicit UI notice that complete decision history is unavailable. It does not manufacture events, a timeline or a reviewer, and adds no schema or migration.

## Frontend

The existing `/dashboard/admin/organizers/queue` route now uses the real Spring list API through backendRequest. The Organizer overview entry redirects to this same list, removing simulated KPIs, exports, drawer decisions and in-memory application data from the rendered list workflow. Prototype component files remain preserved but are not imported by these routes.

The page reuses the existing Admin dashboard layout, PageContainer, Table, Input, Button and Badge. Search, status, sort, direction, page and page size are synchronized with URL search parameters. Changes to search/filter/sort/size reset page to 1. Pagination uses backend totals/flags rather than slicing an entire client-side dataset. Historical appId navigation parameters remain accepted for source compatibility but are ignored and never sent to an application-detail or decision API.

The query is browser-only and enabled only for an authenticated ADMIN. Keys include actor and normalized filters; gcTime and staleTime are zero, and automatic retries/focus refresh are disabled. Account/route protection is reused from the existing dashboard guard and enforced again in the view. Loading, empty, 401/403, server errors, explicit retry/refresh and an out-of-range-page recovery action are supported. No mock fallback is used in production. The development proxy explicitly sends only the new Admin application API prefix to Spring; unrelated API routing is preserved.

Business labels reuse existing business-type names, statuses reuse Application Status labels and timestamps reuse the existing UTC display helper. The table has contained horizontal scrolling on mobile. No functional approve/reject/replace/resubmit/detail controls or new document operations are added.

## Verification

- Maven Wrapper `-B -ntp -Dspring.profiles.active=test verify`: 361 tests, zero failures/errors/skips, packaged build successful. The focused new controller/service suite contributes 23 tests covering Bearer/role restrictions, active actor checks, pagination, status, literal search, stable/allowlisted sorting, invalid parameters, empty response, DTO privacy and unsupported POST.
- Read-only JPA smoke test on the configured database: startup with Hibernate validate and Hikari read-only connections, startup initializer and scheduling removed, temporary localhost 8081 context closed afterward. Real constructor projection, count, all status filters, escaped search, pagination and all five sort fields in both directions executed successfully. Three submitted applications were counted; DRAFT returned zero and status totals matched the all-submitted count. No personal row contents or credentials were printed and no data was seeded or updated.
- Database metadata and Organizer audit count inspection used a separate read-only JDBC connection followed by rollback. No migration or DML was used.
- Frontend: 40 contract tests across the new Admin list and existing Organizer modules passed. TypeScript --noEmit, targeted oxlint, formatter checks and production build passed. An intermediate Nitro output EPERM in the sandbox was resolved by rerunning outside the sandbox after fixture cleanup; no dependency change or destructive cleanup was used. Existing third-party directive/bundle/config-loader warnings remain.
- Browser tests used explicitly enabled RAM-only API fixture 4091 and separate FE 3014 with synthetic accounts/applications. Verified anonymous redirect; Admin list loading; 36 pending records across 20/16-row pages; status filter resetting page; search/sort/URL mapping; empty results; review timestamps; server 500 and retry; absence of decision buttons; USER and ORGANIZER redirects with no list remaining after navigation settled. Mobile 390px and desktop 1280px had no horizontal document overflow. Fixtures, temporary tabs and viewport overrides were cleaned up.
- These tests do not establish an authenticated real-browser-to-live-MySQL session using an actual Admin login. Browser integration used the fixture, MVC exercised the real security chain with mocked auth dependencies, and repository queries separately ran against the real database in read-only mode. Existing FE/BE processes were not restarted. Restart the Backend before testing the new API in that existing local session.

## Changed files

Backend paths relative to spring-starter:

- src/main/java/base/api/feature/organizer/controller/AdminOrganizerApplicationController.java (new)
- src/main/java/base/api/feature/organizer/dto/response/AdminOrganizerApplicationResponse.java (new)
- src/main/java/base/api/feature/organizer/service/AdminOrganizerApplicationService.java (new)
- src/main/java/base/api/feature/organizer/repository/IOrganizerProfileRepository.java
- src/test/java/base/api/feature/organizer/controller/AdminOrganizerApplicationControllerTest.java (new)
- src/test/java/base/api/feature/organizer/service/AdminOrganizerApplicationServiceTest.java (new)
- docs/admin-organizer-applications.md (new)

Frontend paths relative to .worktrees/frontend/react-stater:

- src/features/admin-organizers/api/applications.ts (new)
- src/features/admin-organizers/components/applications-list-view.tsx (new)
- src/routes/dashboard/admin/organizers/index.tsx
- src/routes/dashboard/admin/organizers/queue.tsx
- vite.config.ts
- mock-server/test/admin-organizer-applications-contract.test.ts (new)
- mock-server/test/admin-organizer-applications-ui-fixture.ts (new)

Local inspection/smoke helpers and logs are inside ignored target/output directories. The pre-existing organizer-application.md edit and organizer-onboarding-storage.md file are outside this task and remain unchanged. Local configuration, skills, AGENTS.md, rules, auth implementation, shared envelopes, previous Organizer write APIs and Cloudinary configuration are preserved. Changes remain unstaged on feature/backend and feature/frontend; no commit or push has been performed.
