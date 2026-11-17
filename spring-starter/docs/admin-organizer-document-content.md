# Admin private organizer document viewing and downloading

## Scope and contract

The approved extension adds file inspection to Admin Application Details, without implementing review, upload, replacement or deletion. Database schema, existing application/document states, credentials and previous Organizer APIs are unchanged. Existing private local and authenticated Cloudinary references remain supported; no migration or backfill is required.

`GET /api/admin/organizer-applications/{applicationId}/documents/{documentId}/content`

- Uses existing Bearer authentication and ADMIN restrictions on controller and services.
- Reloads the actor and requires an active ADMIN before looking up the submitted application.
- Validates positive Long IDs. Unsubmitted/DRAFT applications and missing/foreign documents return 404. Anonymous viewers receive 401, other roles receive 403, invalid IDs receive 400, unavailable storage receives sanitized 502. No write handler is added.
- Selects the document by both ID and application/profile ID. Current and retained previous versions can be inspected.
- Returns original bounded bytes with detected `image/jpeg`, `image/png` or `application/pdf`, Content-Length, safe UTF-8 Content-Disposition, Cache-Control no-store, Pragma no-cache, nosniff and sandbox CSP. `download=true` selects attachment; the default is inline. Binary success is intentionally outside the JSON envelope; errors retain the existing envelope.
- Resolves an internal reference in a short read-only transaction. Storage/network I/O happens after the transaction releases its database connection.

Local reads only accept the existing generated UUID-plus-extension keys, resolve a configured private directory, reject public/symlink targets, use no-follow file opening and never create directories. Reads are capped at 5 MiB and checked against JPEG/PNG/PDF signatures. No arbitrary path or external URL is accepted from requests.

Cloudinary reads validate the existing authenticated reference prefix, resource type and fixed organizer folder/UUID pattern. The installed SDK creates a server-only signed authenticated delivery URL. Retrieval is restricted to HTTPS res.cloudinary.com, disallows redirects, has connection/read timeouts and enforces the same size/signature checks. No provider URL, error body, credentials or local path is returned or logged by this delivery path. The existing public Workspace image upload/delete methods are unchanged.

Cloudinary documentation: [access control](https://cloudinary.com/documentation/control_access_to_media), [delivery URL signatures](https://cloudinary.com/documentation/delivery_url_signatures).

## Frontend behavior

Each document has View and Download controls. Binary fetches use the existing session's Bearer token in the header, no cookies, no redirects and no browser HTTP cache. Content is kept outside the React Query/JSON cache, validated by MIME/signature/size and converted to a temporary Blob URL. Session changes prevent stale responses from exposing content or clearing a newer session. Preview requests are aborted and URLs released when the viewer closes, retries or changes actor.

Images support zoom in/out, rotation, reset, opening a separate tab and original-file download. PDFs support page selection, previous/next, zoom, rotation and reset using canvas rendering; opening a separate tab also allows the browser's native PDF controls. Loading, corrupt/unsupported file, authorization/not-found/provider errors, download errors and retry are handled. Mobile dialogs scroll internally and document content does not enlarge the page horizontally.

The native PDF plugin showed an empty frame in the in-app browser. The user explicitly approved adding Mozilla PDF.js and updating the lockfile. `pdfjs-dist` 6.5.438 is loaded dynamically only when opening a PDF, with its worker emitted by Vite. This canvas-only viewer does not create a document scripting engine or execute link/annotation actions. The installed version's types were checked; removed options from older PDF.js versions were not retained.

## Verification and limits

- Focused backend security/storage suite: 32 tests passed. Full Maven Wrapper test-profile verify: 397 tests, zero failures/errors/skips; packaged build successful.
- Tests cover ADMIN/anonymous/other roles, locked/missing actors, invalid IDs, foreign/missing documents, previous versions, file-not-found, corrupt/oversized content, sanitized provider errors, headers/UTF-8 filenames and no write operations. Filesystem writes only occurred under JUnit temporary directories; Cloudinary tests used fake SDK credentials and an overridden transport, never an upload or provider write.
- Frontend: 54 Admin/Organizer contract tests passed, including 7 new binary-content tests; TypeScript, targeted lint/formatter and production build with the PDF.js worker passed.
- Browser: actual PNG bytes decoded, image zoom/rotation worked, a two-page synthetic PDF rendered visibly with page switching/zoom/rotation, PDF downloads completed, provider error appeared and retry downloaded successfully. At 390px the document width equaled the viewport width. Blob open-in-new-tab and download links use temporary blob URLs, not provider URLs.
- Actual authenticated browser session on FE 3000/BE 8080 opened an existing application document successfully; the image decoded at its stored dimensions. This operation only read application/document/file data. Backend was restarted through the safe launcher with Hibernate validate and seed/scheduling disabled. Live Local and Cloudinary providers were not separately exercised with new test uploads; routing/signing and local-file paths were covered by isolated tests.
- npm audit reported 11 findings in other existing packages (2 high, 9 critical), none attributed to pdfjs-dist. The affected package versions match the baseline lockfile. No automatic audit fix or unrelated dependency upgrade was performed.
- No shared database writes, schema changes, seeds, migrations, status changes, commits or pushes were performed for this extension.

## Files for the delivery extension

Backend paths relative to spring-starter:

- `src/main/java/base/api/feature/organizer/controller/AdminOrganizerDocumentContentController.java` (new)
- `src/main/java/base/api/feature/organizer/service/AdminOrganizerDocumentAccessService.java` (new)
- `src/main/java/base/api/feature/organizer/service/AdminOrganizerDocumentContentService.java` (new)
- `src/main/java/base/api/feature/organizer/service/PrivateDocumentUnavailableException.java` (new)
- `src/main/java/base/api/feature/organizer/service/PrivateOrganizerDocumentStorage.java`
- `src/main/java/base/api/feature/organizer/repository/IOrganizerDocumentRepository.java`
- `src/main/java/base/api/feature/workspace/service/impl/CloudinaryStorageServiceImpl.java`
- `src/main/java/base/api/shared/exception/GlobalExceptionHandler.java`
- `src/test/java/base/api/feature/organizer/controller/AdminOrganizerDocumentContentControllerTest.java` (new)
- `src/test/java/base/api/feature/organizer/service/AdminOrganizerDocumentAccessServiceTest.java` (new)
- `src/test/java/base/api/feature/organizer/service/AdminOrganizerDocumentContentServiceTest.java` (new)
- `src/test/java/base/api/feature/organizer/service/PrivateOrganizerDocumentDeliveryTest.java` (new)
- `src/test/java/base/api/feature/organizer/service/PrivateOrganizerDocumentStorageTest.java`
- This document and the details report cross-reference.

Frontend paths relative to .worktrees/frontend/react-stater:

- `src/features/admin-organizers/api/document-content.ts` (new)
- `src/features/admin-organizers/components/document-actions.tsx` (new)
- `src/features/admin-organizers/components/pdf-document-viewer.tsx` (new)
- `src/features/admin-organizers/components/application-details-view.tsx`
- `mock-server/test/admin-organizer-document-content-contract.test.ts` (new)
- `mock-server/test/admin-organizer-applications-ui-fixture.ts` (synthetic PNG/PDF read endpoints only)
- `package.json`, `package-lock.json` (approved PDF.js addition)

Existing uncommitted Application Details changes, unrelated local documentation, skills/rules, AGENTS.md and both worktrees remain preserved. Test helpers/logs remain ignored. The RAM demo on 3014/4091 is separate from the real backend on 3000/8080.
