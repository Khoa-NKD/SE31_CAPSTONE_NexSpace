# Admin view organizer application details

## Scope and source evidence

Report 3 SRS M03-UC11 / section 3.4.11 describes selecting an Organizer application and viewing its information, verification evidence and status history. Its generic interface/actor text also mentions Organizer and write actions; this task explicitly implements an ADMIN-only read operation. Review, document verification, approval, rejection and workspace approval remain separate use cases.

Both common branches were fast-forwarded by one commit before implementation:

- Backend `feature/backend`: ffca51fe to 88ae347565edba64dfbd6cd7e45474bc49e37108 (Admin list, PR #69).
- Frontend `feature/frontend`: c4bf85f6 to d2418f0fa20e6e3d6ecda62da0dc465c9698f60d (Admin list, PR #70).

The list was squash-merged, so the previous task commit is not an ancestor. Relevant source trees were compared against the pushed list commits and are identical. Submit, Business Profile, Verification Documents and Application Status are also present. No cherry-pick, merge, rebase, reset, stash, new branch or additional worktree was used.

## API contract

`GET /api/admin/organizer-applications/{applicationId}` uses the existing Bearer JWT chain, controller-level ADMIN restriction and service-level ADMIN restriction. The actor ID comes from the authenticated principal. The service additionally reloads the actor and requires an active ADMIN before application lookup. The target ID identifies an application, never an owner supplied by the caller.

The ID is a positive Java Long. Invalid numeric binding/overflow or non-positive IDs return 400. Unknown applications and unsubmitted/DRAFT profiles return 404, consistently with the submitted-list scope. Anonymous requests return 401; USER/ORGANIZER return 403. There is no write handler; POST returns 405. Existing list and Organizer write contracts remain unchanged.

The existing `ApiResponse` wraps `AdminOrganizerApplicationDetailsResponse` in `data`:

- `id`, `legalName`, `businessType`, `taxId`, `representativeName`, `address`, `contactEmail`, `contactPhone`.
- `applicant`: `id`, `userName`, `email`, `fullName`, selected from the profile's actual applicant.
- `status`, `submittedAt`, nullable `reviewedAt`, nullable `reviewFeedback`.
- `documents`: an array, empty when there are no records. Each metadata row contains `id`, `documentType`, `fileName`, `status`, `uploadedAt`, `current`, nullable `adminFeedback`.

Null values follow the existing Jackson configuration. No registration-reason or fabricated history field is added. Bank details, account password/2FA/security fields, storage references and document contents are excluded by explicit DTOs.

## Persistence and document boundaries

Existing relationships are reused: `organizer_profile.organizer_id -> users.id`, and `organizer_document.organizer_profile_id -> organizer_profile.id`. Entity/schema mappings remain unchanged. Real JPA startup with Hibernate validate and read-only query execution verified the mappings against the configured database.

The read-only service uses one submitted-profile query that fetches the applicant and its eager role, then one metadata projection query scoped to that exact profile ID. Documents do not materialize storage references or lazy entity graphs. The metadata includes current and retained previous versions, ordered current first and then ID descending. Document versions are evidence versions, not an invented application decision history.

The metadata response still excludes storage references. Private viewing and downloading are now implemented through an ADMIN-only binary endpoint for legacy local and authenticated Cloudinary documents. See [private document delivery](admin-organizer-document-content.md) for the contract, controls, dependency approval and latest verification. Public/signed provider URLs, filesystem paths, Cloudinary keys and API secrets are never returned to the frontend.

No registration-reason field exists in the current profile entity/submission contract; the unsupported section is omitted from the UI. Only the stored current review outcome is shown. Missing document/review feedback and review dates are described as not recorded, without inferring whether a review occurred. The current model has no complete decision-history implementation, so no timeline or reviewer identity is invented and no empty history section is rendered.

## Frontend

The list adds an accessible View details link for each application. `/dashboard/admin/organizers/$applicationId` reuses the existing Admin layout and PageContainer. It groups summary, legal/business information, applicant, document metadata and current review outcome. Status/business/document labels and UTC timestamp formatting reuse existing modules. React renders returned text without raw HTML or generated file links.

List page, size, search, status and sort parameters travel with the details link; Back to applications restores those parameters and removes obsolete appId. Detail queries use the shared Spring API client and Bearer session, keys separated by actor/application, zero retained cache, cancellation signal and no automatic retries. Queries are disabled during SSR, for unauthorized actors and for invalid IDs. Decimal Long deep links are validated as strings to avoid rounding the path identifier.

Loading, invalid-ID, missing-application, unauthorized, server-error/retry, refresh and empty-document states are explicit. Document tables have contained horizontal scrolling. No approve/reject/upload/update controls are added. The existing sidebar and role guard are preserved.

## Verification

The following bullets record the initial details implementation. The subsequent private-document extension has 397 passing backend tests, 54 passing frontend contract tests, a successful production build and actual file-view verification; its current evidence is in [the extension report](admin-organizer-document-content.md).

- Focused MVC/service and list regression suite: 35 tests, zero failures/errors/skips.
- Maven Wrapper `-B -ntp -Dspring.profiles.active=test verify`: 373 tests, zero failures/errors/skips; packaged build successful. Tests use mocked repositories/auth dependencies and do not use the Local database for writes.
- Real read-only JPA smoke: Hibernate validate, Hikari read-only connections, seed initializer and scheduling removed, temporary port 8081 closed afterward. Submitted profile/applicant fetching and document projection executed successfully for existing submitted applications. Missing-ID lookup and previous list query checks passed. No DDL, DML, seed or personal response contents were printed.
- Frontend: 47 contract tests (7 new detail tests and 40 existing Admin/Organizer tests), TypeScript, targeted lint/formatter and production build passed. A test-only unsafe optional-chain lint finding was corrected by asserting request options before access. Existing upstream bundler/config-loader warnings remain.
- Browser tests used an explicitly enabled RAM-only fixture on 4091 and separate FE on 3014, never a writable database. Verified list page 2 -> details -> back with filters preserved; real API-client mapping into the view; business/applicant/document metadata; current/previous document labels; review feedback; empty documents; invalid ID; 404; 500/retry; no approve/reject controls or file-delivery links; USER and ORGANIZER redirects after navigation settled. Mobile 390px and desktop 1280px had no horizontal document overflow. Fixture processes, temporary tab and viewport overrides were cleaned up.
- Browser integration used synthetic data, MVC tested the real security chain with mocked auth dependencies, and JPA queries separately exercised the real database read-only. This does not establish an authenticated real-browser-to-new-backend session. The existing BE 8080 process was not restarted; restart it safely before testing the new endpoint there.

## Changed files

Backend paths relative to `spring-starter/`:

- `src/main/java/base/api/feature/organizer/controller/AdminOrganizerApplicationController.java`
- `src/main/java/base/api/feature/organizer/dto/response/AdminOrganizerApplicationDetailsResponse.java` (new)
- `src/main/java/base/api/feature/organizer/dto/response/AdminOrganizerDocumentResponse.java` (new)
- `src/main/java/base/api/feature/organizer/repository/IOrganizerProfileRepository.java`
- `src/main/java/base/api/feature/organizer/repository/IOrganizerDocumentRepository.java`
- `src/main/java/base/api/feature/organizer/service/AdminOrganizerApplicationDetailsService.java` (new)
- `src/test/java/base/api/feature/organizer/controller/AdminOrganizerApplicationControllerTest.java`
- `src/test/java/base/api/feature/organizer/service/AdminOrganizerApplicationDetailsServiceTest.java` (new)
- `docs/admin-organizer-application-details.md` (new)

Frontend paths relative to `.worktrees/frontend/react-stater/`:

- `src/features/admin-organizers/api/application-details.ts` (new)
- `src/features/admin-organizers/components/application-details-view.tsx` (new)
- `src/features/admin-organizers/components/applications-list-view.tsx`
- `src/routes/dashboard/admin/organizers/$applicationId.tsx` (new; route tree generated by Vite, never hand-edited)
- `mock-server/test/admin-organizer-application-details-contract.test.ts` (new)
- `mock-server/test/admin-organizer-applications-ui-fixture.ts`

Changes remain uncommitted on the two common branches. No task branch, commit or push was created. Pre-existing local documentation, configuration, skills/rules, AGENTS.md and worktree structure are preserved. Temporary helpers and logs remain ignored. No credentials or test-account data are included in this report.
