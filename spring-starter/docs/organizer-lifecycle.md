# Organizer application review and lifecycle

Implementation evidence: 2026-11-05. This document describes the actual Java 17 / Spring Boot 3.5 / Long-ID / Bearer baseline. Initial implementation verification did not change the shared database.

Local startup follow-up (2026-11-05): the user separately authorized applying the single is_suspended column addition to the database configured by the ignored Local profile. The column was added, and the updated backend started successfully with Hibernate schema validation, SQL initialization disabled, startup seeds removed and scheduled maintenance disabled. No role, review outcome or unrelated business data was changed. Frontend port 3000 and backend Swagger port 8080 returned HTTP 200; the protected lifecycle endpoint returned HTTP 401 both directly and through the frontend proxy without authentication. The pending schema statements below describe the original implementation handoff; this configured Local database now has the required column. Other databases still require their own authorized rollout.

## Source synchronization

Both existing worktrees were switched to their integration branches and pulled with fast-forward only, one new commit each:

| Worktree | Branch | HEAD |
| --- | --- | --- |
| Repository root (Backend) | feature/backend | 800cd9f2ee2354d480fa1245872d5aa0122a062f |
| .worktrees/frontend (Frontend) | feature/frontend | ecae0f0888998e0f02d078f72b3cf17a951ec7ef |

No task branch, commit, push, merge, rebase, reset, clean or automatic stash was performed. Existing Local documents, configuration, skills and agent rules remain preserved.

## State transitions

| Actor | Initial application state | Operation | Result | Account/document effects |
| --- | --- | --- | --- | --- |
| Owner | DRAFT | Existing draft save/upload | DRAFT | Existing behavior retained |
| Owner | DRAFT | Existing explicit submit | PENDING_REVIEW | No role grant |
| Admin | PENDING_REVIEW | Approve | APPROVED | USER becomes ORGANIZER; all confirmed current documents become VERIFIED |
| Admin | PENDING_REVIEW | Reject with reason | REJECTED | Role and document verification states remain unchanged |
| Owner | REJECTED or REVISION_REQUESTED | Save correction / explicitly replace a document | Same state | No submission or role grant; old document version and bytes retained |
| Owner | REJECTED or REVISION_REQUESTED | Explicit resubmit | PENDING_REVIEW | Same profile ID; new submittedAt; current review fields cleared; previous decisions retained in audit |
| Admin | APPROVED, not suspended | Suspend with reason | APPROVED, suspended=true | ORGANIZER role and ACTIVE account retained; management denied |

SUSPENDED is an operational flag, not a new application enum. No reactivate/unsuspend, request-revision action, workspace approval, booking cancellation, payment mutation or email notification was added.

## Validation and authorization

- Every actor comes from the authenticated principal. Admin actions require an active ADMIN, and self-review is forbidden.
- Owner correction/resubmission requires an active, email-verified USER owning that profile. Inconsistent legacy role/status combinations return conflict rather than silently changing roles.
- Required fields reuse SubmitOrganizerApplicationRequest: legal name, supported business type, tax ID, representative, address, contact phone and email. INDIVIDUAL remains unsupported.
- Submission requires a current business license, one current document per type, nonempty private storage references and no current REJECTED document. Approval additionally requires explicit confirmation and the exact current document-ID set.
- Reject/suspend reasons are trimmed, required and at most 500 characters. Approval notes are optional and bounded to 500 characters. Unknown top-level lifecycle fields are rejected.
- Correction upload reuses private storage validation (safe filename, JPG/PNG/PDF, matching content, maximum 5 MB). Supported correction types are BUSINESS_LICENSE, ID_CARD_FRONT, ID_CARD_BACK, TAX_CERTIFICATE and OTHER. BANK_CERTIFICATE remains read-only.
- A replacement explicitly identifies the current document; missing types omit that reference. No old file is deleted. Transaction rollback removes only the newly uploaded file.
- Management denial covers both workspace API aliases and their private child operations, plus business-profile management. Public workspace media/amenities remain readable. Sign-in, customer features, application status and Admin access retain existing policies.
- The frontend blocks suspended Organizer dashboard screens and displays the reason on application status. Backend enforcement is authoritative; an already-running request is not forcibly cancelled. Booking-management HTTP APIs are not implemented in the inspected source, so no speculative booking rules were added.
- Existing generic authenticated media upload/delete policy is unchanged; it is not an Organizer-only operation.

## API contract

All paths below include the existing /api prefix and return the existing ApiResponse envelope (statusCode/errors conventions retained).

| Method | Path | Input |
| --- | --- | --- |
| GET | /api/admin/organizer-applications/{id}/lifecycle | No mutation |
| POST | /api/admin/organizer-applications/{id}/approve | revision, documentsConfirmed=true, documentIds, optional note |
| POST | /api/admin/organizer-applications/{id}/reject | revision, reason |
| POST | /api/admin/organizer-applications/{id}/suspend | revision, reason |
| GET | /api/organizer/applications/current/lifecycle | No mutation |
| PUT | /api/organizer/applications/current/correction | revision, application (existing complete submission fields) |
| POST | /api/organizer/applications/current/correction-documents | Multipart: revision, documentType, optional expectedCurrentDocumentId, file |
| POST | /api/organizer/applications/current/resubmit | revision |

Lifecycle response fields: id, status, revision, suspended, optional suspensionReason, canApprove, canReject, canSuspend, canCorrect and currentDocumentIds. Responses contain no storage keys, private URLs or credentials. Admin list DTO additionally exposes suspended; its application-state filter is unchanged.

Examples of action bodies:

```json
{"revision":12,"documentsConfirmed":true,"documentIds":[9,10],"note":"Current documents checked"}
```

```json
{"revision":12,"reason":"Please provide a legible current business license"}
```

401 means missing authentication; 403 means insufficient role/ownership/account eligibility; 404 means no eligible submitted/owned resource; 400 carries validation errors; 409 means stale revision, duplicate/invalid transition or inconsistent state. Reload and inspect current data after 409; do not automatically replay a sensitive decision.

## Persistence, audit and concurrency

Existing organizer_profile, organizer_document, user, role and audit_log are reused. Existing reviewer/submitted/reviewed/feedback fields remain the current decision. The only proposed schema addition is organizer_profile.is_suspended BOOLEAN NOT NULL DEFAULT FALSE.

Lifecycle decisions, role changes, current-document verification and strict audit writes share one transaction. The existing best-effort shared audit writer is unchanged. Lifecycle audit stores actor, action, profile, before/after lifecycle/document states and reason. It does not duplicate private file keys. submittedAt/reviewedAt use the existing UTC Clock. Audit BaseModel timestamps retain the existing Hibernate runtime convention; deployments should use a UTC JVM as required by the existing timestamp contract.

Writers lock the applicant account followed by the profile. Approval first locks the existing ORGANIZER role row to serialize the conditional approved-tax-ID check across different applicants. READ_COMMITTED prevents a pre-lock repeatable-read snapshot from hiding a decision committed while a request waited for a lock.

Revision is the latest lifecycle audit ID for that profile (zero before the first event). A sensitive action must supply the revision it inspected. This catches stale same-second reject/resubmit cycles without adding a version column. Document replacement also compares its explicit prior current-document ID. The frontend keeps a submission guard and only invalidates/refreshes caches after actual server success.

## Deployment prerequisite

The reviewed one-time SQL proposal is [sql/organizer-suspension.sql](sql/organizer-suspension.sql). It has NOT been executed. Applying it to a shared database needs separate authorization for that target. Check whether the column already exists before applying it through the team's deployment workflow.

Do not start this updated backend against an unchanged shared schema. Its existing Hibernate update setting could otherwise perform an unapproved DDL change. Use schema validation for the eventual controlled startup; do not use automatic schema update to apply this proposal. No existing credentials/configuration/migrations were edited.

## Frontend integration

Admin actions extend the existing application detail screen. Approval requires a checked document-confirmation box; Reject and Suspend require a reason. Dialogs retain server errors and remain blocked while submitting. The server revision/document set is captured when the dialog opens.

The existing /organizer/apply form supports correction and an explicit resubmission dialog. Saving corrections or replacing a file does not resubmit. Pending/approved records remain read-only here. /organizer/status links eligible owners to corrections, displays suspension, and refreshes the existing session user after approval without introducing another authentication mechanism.

Queries remain isolated by actor ID; list, detail, status, document, business-profile and operational caches are invalidated after successful mutations. Application status and operational suspension stay distinct.

## Verification evidence

- Backend: Maven Wrapper, `-Dspring.profiles.active=test verify`: 420 tests, zero failures/errors/skips; executable jar built.
- H2: test-scope dependency only, random jdbc:h2:mem database, five relevant entities, temporary private files. Twelve database tests verify real transactional rollback, competing decisions, approved-tax uniqueness, stale revisions, ownership/eligibility, correction states and retained document versions. No Local properties or shared database are loaded by these tests.
- MVC/security tests cover role denial, principal mapping, bounded reasons, unexpected fields, conflict envelope, multipart mapping and suspension on actual workspace routes while preserving status/public reads.
- Frontend: 62 Node contract tests passed (eight lifecycle tests and the previous Organizer contracts), TypeScript noEmit passed, production build passed.
- Changed frontend files pass targeted oxlint and oxfmt checks. Repository-wide lint still reports 17 errors and 539 warnings in unrelated existing files, including settings, hooks, chat and shared UI. Those files were not modified.
- H2 proves the exercised transaction outcomes in H2, not MySQL lock equivalence. Docker/MySQL integration and a browser journey against the updated backend have not been run. Shared-schema deployment remains pending as above.
- H2 is not a runtime dependency. Initial verification performed no shared DB mutation or schema execution. The separately authorized one-column Local rollout is recorded above. No seed, new account, credentials change, commit or push was performed.

## Files in this task

Paths are relative to each application. Pre-existing Local changes are excluded.

Backend modified:
- pom.xml
- src/main/java/base/api/feature/auth/repository/IRoleRepository.java
- src/main/java/base/api/feature/governance/repository/IAuditLogRepository.java
- src/main/java/base/api/feature/organizer/dto/response/AdminOrganizerApplicationResponse.java
- src/main/java/base/api/feature/organizer/repository/IOrganizerProfileRepository.java
- src/main/java/base/api/shared/entity/organizer/OrganizerProfileModel.java
- src/test/java/base/api/feature/organizer/controller/OrganizerBusinessProfileControllerTest.java

Backend added:
- src/main/java/base/api/feature/organizer/config/OrganizerOperationalAccessConfiguration.java
- src/main/java/base/api/feature/organizer/controller/OrganizerApplicationLifecycleController.java
- src/main/java/base/api/feature/organizer/dto/request/OrganizerLifecycleRequests.java
- src/main/java/base/api/feature/organizer/dto/response/OrganizerLifecycleContext.java
- src/main/java/base/api/feature/organizer/service/OrganizerApplicationLifecycleService.java
- src/main/java/base/api/feature/organizer/service/OrganizerLifecycleAudit.java
- src/test/java/base/api/feature/organizer/controller/OrganizerApplicationLifecycleControllerTest.java
- src/test/java/base/api/feature/organizer/controller/OrganizerOperationalAccessTest.java
- src/test/java/base/api/feature/organizer/service/OrganizerLifecycleDatabaseTest.java
- docs/sql/organizer-suspension.sql
- docs/organizer-lifecycle.md

Frontend modified:
- src/features/admin-organizers/api/applications.ts
- src/features/admin-organizers/components/application-details-view.tsx
- src/features/admin-organizers/components/applications-list-view.tsx
- src/features/organizer-application-status/components/application-status-view.tsx
- src/features/organizer-application/components/application-form.tsx
- src/routes/dashboard.tsx

Frontend added:
- src/features/organizer-lifecycle/api/lifecycle.ts
- src/features/organizer-lifecycle/components/admin-review-actions.tsx
- src/features/organizer-lifecycle/components/correction-documents.tsx
- src/features/organizer-lifecycle/components/organizer-operational-boundary.tsx
- src/features/organizer-lifecycle/components/owner-lifecycle-status.tsx
- mock-server/test/organizer-lifecycle-contract.test.ts

Final implementation changes are unstaged: 18 backend files (7 modified, 11 added) and 12 frontend files (6 modified, 6 added). Existing Local-only files and the previously modified organizer-application.md / untracked organizer-onboarding-storage.md remain preserved separately. No unresolved Git conflicts or staged changes were found.
