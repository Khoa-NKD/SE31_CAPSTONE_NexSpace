> Current behavior: see [review decisions](organizer-review-decisions.md) and [Cloudinary document retention](organizer-cloudinary-retention.md). These supersede the original rollout details below.

# Organizer onboarding: verification uploads and Cloudinary storage

## Scope and source evidence

This work continues on `feature/backend-organizer-verification-documents-upload` from backend base `b663d380` and `feature/frontend-organizer-verification-documents-upload` from frontend base `1dcd382d`. Those common-branch bases include Business Profile PRs #50/#49. The user authorized creating these task branches while preserving the uncommitted implementation; no history rewrite, commit or push was performed. The subsequently approved draft lifecycle is documented in [organizer-application-draft.md](organizer-application-draft.md).

Cloudinary was already implemented for workspace images, not merely declared: Maven resolves `cloudinary-http44` / `cloudinary-core` 1.36.0; `CloudinaryStorageServiceImpl` uses the SDK and existing `cloudinary.cloud-name`, `cloudinary.api-key`, `cloudinary.api-secret` configuration. Its public-media method returns a delivery URL and falls back to the public `/uploads/**` filesystem mapping when unconfigured. That public-media path is unsuitable for verification documents and is not used by the Organizer facade. Real Cloudinary account connectivity and delivery restrictions have not been tested in this work; the existing tests previously exercised public local fallback.

## Strategy by task and file type

| Task / data | Storage and effect |
| --- | --- |
| Workspace public media | Existing public image method and its configuration remain unchanged. |
| Submit Organizer Application | Existing multipart contract and business flow remain unchanged. Its required business license uses the shared private document facade. |
| Update Organizer Business Profile | No file/media field exists in its approved schema/DTO. No Cloudinary code, logo/avatar field, legal-field permission or approval change is added. |
| Upload Verification Documents | The same facade validates files before authenticated Cloudinary or private local storage. |
| JPG/JPEG/PNG verification evidence | `resource_type=image`, `type=authenticated`; no transformations or public URL returned by this application. |
| PDF verification evidence | `resource_type=raw`, `type=authenticated`; generated public ID retains `.pdf`. No PDF conversion is requested. |

The existing Cloudinary service is extended with private document upload/compensation methods. No new provider abstraction, SDK dependency or direct frontend-to-Cloudinary upload system is introduced. `PrivateOrganizerDocumentStorage` remains the validation/provider-routing facade used by both Organizer services.

Cloudinary documents distinguish signed uploading from access-controlled delivery. Their [authenticated asset documentation](https://cloudinary.com/documentation/upload_parameters#authenticated_assets) restricts originals and derived assets; `private` alone does not fully protect derived images. The [Upload API reference](https://cloudinary.com/documentation/image_upload_api_reference) documents the resource/delivery options and raw-ID extension requirement. These are provider-contract evidence, not a live verification of this deployment's account.

## Configuration, references and older files

`app.organizer.documents-cloudinary-enabled=${ORGANIZER_DOCUMENTS_CLOUDINARY_ENABLED:true}` enables Cloudinary preference when all three existing Cloudinary credential properties are nonblank. The same SDK client factory and credential loading are reused. No credential values are added to source, reports or database metadata. `ORGANIZER_DOCUMENTS_CLOUDINARY_ENABLED=false` explicitly keeps new uploads local. Partial/missing credentials use the existing private local configuration; once a Cloudinary upload is attempted, an error is reported rather than silently switching providers.

Local documents use the existing absolute `APP_ORGANIZER_DOCUMENTS_DIRECTORY`, defaulting outside the checkout at `${user.home}/.nexspace/organizer-documents`. Local storage rejects known public/static resource directories, including the existing `uploads` mapping and Spring source/build static roots. Physical paths are rechecked after resolution. Operators must also keep the private volume outside any custom reverse-proxy/static mappings and restrict service-account filesystem permissions. No deployment or Docker-volume configuration is changed.

The existing `organizer_document.file_url` VARCHAR(500) stores one of these internal references:

- Local: a generated UUID plus the allowed extension, compatible with earlier Organizer uploads.
- Cloudinary image: `cloudinary:authenticated:image:nexspace/organizer-verification/<UUID>`.
- Cloudinary PDF: `cloudinary:authenticated:raw:nexspace/organizer-verification/<UUID>.pdf`.

The other fields remain `organizer_profile_id`, `document_type`, `file_name`, `is_current`, `status`, `uploaded_at` and the inherited update timestamp. No binary data, Cloudinary credentials or delivery URLs are stored in these fields. Reference lengths fit the existing column; no entity/schema change is made.

Legacy files stay in their original private directory. Cleanup routes by the saved reference rather than the current provider flag, so enabling Cloudinary does not reinterpret a local UUID as a cloud asset, and disabling preference does not reinterpret a Cloudinary reference as a local path. Invalid/foreign references are rejected. No existing filesystem or Cloudinary asset is migrated, overwritten or deleted. Retain the original local volume and the relevant Cloudinary account configuration for the records that depend on them.

Neither old nor new documents have a binary preview/download endpoint in the current Organizer implementation. Owner metadata listing continues to work for both providers. No public or signed delivery URL is generated or returned. A future viewing/downloading use case must authorize in the Backend before producing a protected response; it must not fetch arbitrary legacy URL strings or expose storage references. That use case is not added here.

## Upload business rules and contract

Report 3 section 3.4.2 / BR-04 / BR-37 and the user's confirmed decisions apply:

- Only the owning active, email-verified `USER` or `ORGANIZER` can access this upload flow. `ADMIN` cannot upload on behalf of the owner.
- Independent upload is permitted only for `DRAFT` and `REVISION_REQUESTED`; `PENDING_REVIEW`, `APPROVED` and `REJECTED` reject POST with 409. Metadata remains readable by the eligible owner in these states.
- Supported upload types: `BUSINESS_LICENSE`, `ID_CARD_FRONT`, `ID_CARD_BACK`, `TAX_CERTIFICATE`, `OTHER`. `BANK_CERTIFICATE` is not accepted for new uploads.
- Ownership/operation evidence uses `OTHER` and belongs to the Organizer profile, not a particular workspace. The schema has no workspace link for these documents.
- One current document per supported type. A duplicate returns 409 and preserves the current record/file, including a rejected current document. No replacement, deletion, history/version change, submission or automatic re-review is performed.

| Method | Endpoint | Request / response |
| --- | --- | --- |
| GET | `/api/organizer/verification-documents` | Existing envelope with `profileId`, `uploadAllowed`, `maxFileSizeBytes`, `supportedDocumentTypes`, `documents`. |
| POST | `/api/organizer/verification-documents` | Multipart text `documentType` plus one file part `file`; HTTP 201 with safe metadata. |
| POST | `/api/organizer/applications` | Unchanged: JSON part `application` plus file part `businessLicense`; HTTP 201 receipt. |
| GET / PUT | `/api/organizer/business-profile` | Unchanged contact-only contract and approved-owner requirement. |

Document metadata contains `id`, `documentType`, `fileName`, document `status`, `uploadedAt`. Neither DTO contains `file_url`, private reference, storage path, Cloudinary URL, account credentials or review feedback. Upload timestamps retain the existing entity timestamp conventions; no timezone/schema change is introduced.

The document POST accepts exactly one type and one file. Extra owner/system/provider fields and bulk files are rejected. The actor comes only from the authenticated principal; clients cannot choose profile ownership, provider, public ID, delivery/access type, status or current flag. The frontend sends a browser-generated multipart boundary. Requests still use the existing Bearer session and `/api` transport; Cloudinary requires no new frontend configuration.

Errors retain the current envelope: 400 for invalid fields/files/types, 401 for authentication, 403 for role/account/ownership denial, 404 for a missing owned profile, 409 for a locked profile or current-type duplicate, 413 for container multipart limits, 415 for wrong request content type, 500 for storage/persistence failures. No provider error details or signed URLs are propagated to the user-facing exception or logs.

## Consistency and privacy controls

Validation runs before any provider upload: safe original filename, nonempty file, at most 5 MiB, allowed extension, matching MIME and file signature. Content is read with a 5 MiB + 1-byte bound. Signature checks reject common disguised/unsupported content; they are not a complete document parser or malware scanner. Stored names are generated server-side.

Private Cloudinary calls force `authenticated`, a generated namespace/public ID and `overwrite=false`; they never use a public upload preset or frontend options. The response must match the requested ID/resource type and authenticated delivery before its reference is accepted. A response identifying an existing asset is not adopted or deleted. Unexpected foreign IDs are never deleted. A mismatched access response is rejected, with best-effort compensation limited to the new generated ID when the provider confirms that ID. Provider error text/causes are suppressed because they may contain sensitive references or signatures.

Independent uploads acquire the existing profile write lock before state/duplicate checks. The duplicate-document query is also a locking read, avoiding a stale MySQL repeatable-read snapshot opened by an earlier account lookup. This follows the [MySQL locking-read semantics](https://dev.mysql.com/doc/refman/8.4/en/innodb-locking-reads.html); actual concurrent database behavior remains untested here. Both profile/document metadata writes remain transactional. Confirmed rollback invokes the facade's provider-specific compensation for the newly stored object only. Cloudinary destroy explicitly supplies the recorded resource type and `type=authenticated`.

Filesystem/Cloudinary and MySQL do not share an atomic transaction. A crash, timeout with an unknown upload outcome, indeterminate DB commit or failed compensation may leave an orphan requiring operational reconciliation. Unknown DB outcomes deliberately do not trigger automatic deletion, which could remove a committed document. No migration, reconciliation job or deletion of existing files is run in this task.

## Frontend and workflow dependencies

The page `/organizer/documents` supports owners with either USER or ORGANIZER role, outside the Organizer-only dashboard route. It is linked from the existing application page and the Organizer Console. It renders loading/errors, current safe metadata, server-approved types, upload capability, validation, uploading/success/failure states and an account-scoped cache. Current types are removed from selection. A synchronous guard and disabled controls prevent double submission. After 409, the file is cleared before refreshing types so it cannot silently be sent as a different type; ordinary server failures permit retry. No preview/replace/delete controls are added.

The new page reuses shared cards, inputs, buttons and the NexSpace logo with its own compact header. This avoids the existing shared Navbar's mobile overflow without modifying other screens. Mobile and desktop layouts were browser-checked.

The existing Submit API immediately creates `PENDING_REVIEW` and requires a business license. This task does not add draft creation, application edits or resubmission. Therefore an eligible `DRAFT` / `REVISION_REQUESTED` record must already exist before independent upload can be used. An APPROVED account used to test Business Profile is intentionally not upload-eligible. No shared database record is changed to manufacture these preconditions.

## Verification on 2026-11-04

- Maven Wrapper `verify` with `-Dspring.profiles.active=test`: 274 tests, zero failures/errors/skips, build successful. SDK tests use mocked `Cloudinary` / `Uploader`; composition tests use mocked repositories and Cloudinary plus temporary local directories. No live Cloudinary upload/delete or shared-database write is performed.
- Tests include authenticated image/raw options, non-overwriting IDs, response access validation, sanitized failures, rollback compensation for Submit and independent upload, original role/state preservation, legacy local references, provider flag changes, owner/role/state checks, duplicate types, invalid/oversized files and private metadata contracts. Existing Business Profile and public workspace-media tests still pass.
- Frontend: 28 tests pass across verification uploads, Submit, Business Profile and role guards; targeted lint, TypeScript and production build pass. Existing third-party module-directive/bundle warnings remain.
- Browser fixture testing uses only an explicitly enabled localhost RAM server and synthetic files in ignored cache. It verifies invalid/missing/oversized files, successful upload and refreshed list, one request from a double-click, retry after a simulated 500, read-only capability, unauthenticated access and mobile/desktop layout. A simulated concurrent upload produces 409; another click without selecting a file produces no second POST.
- Real Cloudinary account connectivity, unsigned delivery denial, authenticated delivery, provider-plan/settings behavior and live cleanup remain unverified because no safe Cloudinary test environment was supplied. Docker is unavailable, so real MySQL persistence/concurrency/rollback is also unverified. Mocks do not establish those live guarantees.
- A temporary Backend startup on localhost 8081 succeeded with Hibernate `validate`, Hikari read-only connections and the existing safe launcher disabling initializers/scheduling. Swagger returned 200; the unauthenticated document endpoint returned 401. This verifies Spring wiring, repository initialization and mapped-schema validation against the configured database without test writes; it does not verify upload/delivery on Cloudinary or database-backed upload persistence. The temporary process was stopped afterward.
- Local credentials, earlier uploaded documents, shared data, deployment configuration, skills and rules are not modified. Temporary browser/fixture servers are stopped. No commit or push is performed.

## Files in this implementation

Backend paths relative to `spring-starter/`:

- `src/main/java/base/api/feature/organizer/controller/OrganizerVerificationDocumentController.java`
- `src/main/java/base/api/feature/organizer/dto/response/OrganizerVerificationDocumentResponse.java`
- `src/main/java/base/api/feature/organizer/dto/response/OrganizerVerificationDocumentsResponse.java`
- `src/main/java/base/api/feature/organizer/service/OrganizerVerificationDocumentService.java`
- `src/main/java/base/api/feature/organizer/repository/IOrganizerDocumentRepository.java`
- `src/main/java/base/api/feature/organizer/service/PrivateOrganizerDocumentStorage.java`
- `src/main/java/base/api/feature/workspace/service/impl/CloudinaryStorageServiceImpl.java`
- `src/main/java/base/api/shared/exception/GlobalExceptionHandler.java`
- `src/main/resources/application.properties`
- `src/test/java/base/api/feature/organizer/controller/OrganizerVerificationDocumentControllerTest.java`
- `src/test/java/base/api/feature/organizer/service/OrganizerVerificationDocumentServiceTest.java`
- `src/test/java/base/api/feature/organizer/service/PrivateOrganizerDocumentStorageFailureTest.java`
- `src/test/java/base/api/feature/organizer/service/OrganizerCloudinaryStorageIntegrationTest.java`
- `src/test/java/base/api/feature/workspace/service/impl/CloudinaryPrivateDocumentStorageTest.java`
- `docs/organizer-application.md`
- `docs/organizer-onboarding-storage.md`

Frontend paths relative to `.worktrees/frontend/react-stater/`:

- `src/features/organizer-verification-documents/api/documents.ts`
- `src/features/organizer-verification-documents/components/verification-documents-view.tsx`
- `src/routes/organizer/documents.tsx`
- `src/routes/organizer/apply.tsx` (navigation link only)
- `src/config/nav-config.ts` (navigation entry only)
- `mock-server/test/organizer-verification-documents-contract.test.ts`
- `mock-server/test/organizer-verification-documents-ui-fixture.ts`
- `package.json` (focused test script only; no dependency changes)
