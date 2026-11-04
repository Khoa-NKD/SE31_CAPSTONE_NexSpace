# View organizer application status

## Source and requirements

Implemented on the development branches after fast-forward updates on 2026-11-04:

- Backend `feature/backend`: `b663d380` to `0c85a9ef` (3 commits).
- Frontend `feature/frontend`: `1dcd382d` to `4eaaeb3f` (4 commits).
- Submit, Business Profile and Verification Upload are already merged into these bases; Upload PRs are #52/#53.

The inspected Report 3 SRS identifies M03-UC06 and section 3.4.6 as displaying the owner's application state, review outcome, correction request or permitted rejection reason. Its detailed section also contains unrelated booking/rating/review fields and generic write-action descriptions. Those inconsistent template details are not implemented in this read-only feature.

The actual OrganizerProfileStatus enum supports DRAFT, PENDING_REVIEW, REVISION_REQUESTED, APPROVED and REJECTED. SUSPENDED is absent and is not added or mapped to another state. Account ACTIVE/LOCKED is separate from application state; an account-denial response does not fabricate an application status.

## Backend contract and authorization

Reuse GET `/api/organizer/applications/current`, the existing authenticated current-owner application endpoint. No new endpoint, entity, table or state is added. The user explicitly approved adding optional reviewedAt and reviewFeedback fields to OrganizerApplicationDetailsResponse while preserving all existing fields. Null optional values follow the existing response serialization.

The existing service identifies the actor from the Bearer principal, requires an active, email-verified USER or ORGANIZER, looks up only that actor's profile and checks ownership. ADMIN cannot inspect another application through this self-service endpoint. The service transaction remains read-only; no storage provider is called. Missing account returns 401, ineligible account/owner returns 403 and missing profile returns 404 using the existing envelope.

The DTO now maps organizer_profile.reviewed_at and returns review_feedback only for REJECTED or REVISION_REQUESTED. Other states omit review feedback even when the entity contains text. Reviewer identity, bank fields, credentials, document contents and private storage references are never added to this response. The DTO's previous internal constructor is retained for compatibility. Submit, Draft, Business Profile and Upload write-service logic is unchanged.

Persistence fields reused: users.id/status/is_verified/role_id and roles.name for existing eligibility; organizer_profile.organizer_id/id/status/legal_name/submitted_at/reviewed_at/review_feedback for owner-scoped status and display. The current DTO retains its previously exposed business/contact fields. No schema changes, migrations or shared data writes are performed. Schema comparison in this task uses source entity mappings; live database review outcomes were not manufactured for testing.

## Frontend

The read-only page `/organizer/status` uses the same current-owner API, existing Bearer client, QueryClient, cards, badge, buttons and NexSpace logo. It is reachable from the application page and Organizer Console. It provides a focused status view without opening the editable application/upload form, rather than creating another application-editing screen.

The query is enabled only after browser hydration for a signed-in USER or ORGANIZER. Cache keys include the authenticated account ID, staleTime and gcTime are zero, retries are explicit and window-focus refetch is enabled. Refresh re-reads the real backend. There is no polling, fake production status or client-supplied owner ID.

The page displays a human-readable badge, legal business name, actual submission/review times and permitted feedback. UTC local date/time strings are displayed without browser-timezone conversion. Missing timestamps or feedback are explicitly unavailable, not fabricated. Unknown future states display a safe fallback without privileged actions. React renders feedback as plain text.

Navigation is limited to existing authorized flows: DRAFT can continue the application; REVISION_REQUESTED can view permitted document actions; APPROVED with ORGANIZER role can open Business Profile. There are no approve, reject, resubmit, suspend or direct upload controls. 404 is an empty state with a link to start an application; merely viewing does not create a draft. Anonymous, 403 and server errors have separate states, with retry where appropriate.

## Verification

- Baseline after pull: Maven Wrapper verify passed 298 tests.
- Final Maven Wrapper `-B -ntp -Dspring.profiles.active=test verify`: 311 tests, zero failures/errors/skips; package build succeeded. Tests cover all supported states, ownership/account denials, missing profiles, principal scoping, permitted feedback, response privacy and absence of repository writes/storage calls. Existing Organizer and new upstream Workspace tests remain included.
- Frontend: 32 contract tests across status, Submit/Draft, Business Profile and Upload passed. TypeScript --noEmit, targeted oxlint and production build passed. Existing third-party directive and bundle-size warnings remain.
- Browser testing used a dedicated FE on localhost:3013 and an explicitly enabled fixture on localhost:4090. Synthetic metadata lived only in RAM. Verified anonymous access, login, all five states, refresh, actual provided timestamps, conditional feedback/actions, 404 empty state, 500 retry and 403 denial. Mobile 390px and desktop 1280px had no horizontal overflow. Temporary viewport overrides, test tabs and servers were cleaned up.
- These checks do not establish a live authenticated browser-to-MySQL review workflow. No real database writes, Cloudinary uploads, seed operations or migrations were used. The original FE/BE processes were not restarted by this implementation task.

No commit, push or new task branch was created. Local configuration, architecture guidance, skills, worktree structure and the pre-existing local documentation edits remain preserved.

## Changed files

Backend paths relative to spring-starter:

- src/main/java/base/api/feature/organizer/dto/response/OrganizerApplicationDetailsResponse.java
- src/test/java/base/api/feature/organizer/controller/OrganizerApplicationControllerTest.java
- src/test/java/base/api/feature/organizer/service/OrganizerApplicationStatusTest.java (new)
- docs/organizer-application-status.md (new)

Frontend paths relative to .worktrees/frontend/react-stater:

- src/features/organizer-application/api/application.ts
- src/features/organizer-application-status/api/status.ts (new)
- src/features/organizer-application-status/components/application-status-view.tsx (new)
- src/routes/organizer/status.tsx (new)
- src/routes/organizer/apply.tsx
- src/config/nav-config.ts
- mock-server/test/organizer-application-status-contract.test.ts (new)
- mock-server/test/organizer-application-status-ui-fixture.ts (new)

The worktrees remain on feature/backend and feature/frontend at the heads recorded above, matching their fetched origin refs. Task changes are unstaged; there are no unmerged paths. Pre-existing local-only files remain outside the task, including organizer-application.md edits, organizer-onboarding-storage.md, local architecture guidance and IDE/root frontend files. application-local.properties remains ignored. The existing running BE needs a restart to load the extended DTO before live testing of the two new review fields; this task verified code with tests and an isolated browser fixture rather than restarting the shared local session.
