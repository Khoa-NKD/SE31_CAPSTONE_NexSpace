# Organizer application draft lifecycle

## Approved behavior

The owner explicitly starts a DRAFT, saves incomplete business details, uploads documents using the existing private upload API, and explicitly submits for review. Completing fields or uploading a document never changes the profile status. Successful submission transitions the same profile to PENDING_REVIEW and sets submittedAt in UTC; the account role and document review status are unchanged.

Only active, email-verified USER or ORGANIZER accounts can use this flow. Identity is taken from the Bearer principal. All profile reads and writes check ownership. ADMIN cannot act on behalf of an applicant. Existing PENDING_REVIEW, APPROVED, REJECTED and REVISION_REQUESTED profiles are read-only in this draft flow. The independent document API retains its approved DRAFT/REVISION_REQUESTED upload policy. Revision editing/resubmission and replacing a current document remain separate work.

The existing schema allows nullable draft fields. No entity, schema, migration, authentication behavior, approved business-profile editing or workspace storage contract is changed.

## API

All endpoints use the existing `/api` prefix and statusCode/errors response envelope.

| Method and path | Behavior |
| --- | --- |
| GET `/api/organizer/applications/current` | Return the owner's application fields/status; 404 if absent. No side effects. |
| POST `/api/organizer/applications/draft` | Create an empty DRAFT, or return the existing DRAFT. HTTP 200; other existing states return 409. No request body is needed. |
| PUT `/api/organizer/applications/draft` | Save a full business-field snapshot. Blank/missing fields clear to null. HTTP 200; only DRAFT can be saved. |
| POST `/api/organizer/applications/submit` | Validate persisted fields and current required document, then transition DRAFT to PENDING_REVIEW. HTTP 200; no request body or reupload is needed. |
| POST `/api/organizer/applications` | Legacy multipart submission still returns 201. It may create a new pending profile or submit the owned DRAFT. The existing current license is reused when businessLicense is omitted. Providing another license when one is current returns 409. |

The draft snapshot permits only legalName, businessType, taxId, representativeName, address, contactPhone and contactEmail. It rejects unknown fields such as organizerId, status, fileUrl and review fields. Response details contain id, status, submittedAt and those seven business fields; absent fields may be omitted by the existing JSON configuration. Private storage references and review internals are excluded.

## Validation and concurrency

Drafts may be incomplete, but provided text is trimmed and limited to existing column/DTO lengths: legalName 255, taxId 50, representativeName 100, address 500, contactPhone 20 and contactEmail 255. Provided phone/email values must pass the existing phone pattern/email validator. Business types must match the existing enum; INDIVIDUAL remains unsupported and is never mapped to OTHER.

Final submission validates all seven required fields using the existing Submit DTO and requires a current BUSINESS_LICENSE with a nonblank stored reference and PENDING or VERIFIED status. A missing/rejected document or invalid field returns HTTP 400 with field errors and leaves the profile DRAFT, without submittedAt. Duplicate approved tax IDs return 409. This validation establishes completeness, not legal authenticity; administrator review remains necessary.

The existing actor row lock serializes draft creation and prevents duplicate profiles. Draft save/submit and independent upload lock the same owned profile before checking its state. Submission uses a locking current-document read to avoid a stale snapshot. A repeated submit sees PENDING_REVIEW and returns 409. Profile state and submission time are saved in one transaction; no storage call is needed when reusing a current document. Legacy file upload retains rollback compensation for only its newly uploaded file. Database/storage cannot form a distributed atomic transaction; existing orphan-reconciliation limitations still apply.

## Frontend and verification

The application page loads the owner's existing application, offers Start draft application for an absent profile, permits Save draft, embeds the existing document view, and exposes Submit for review. Submission first saves the visible business snapshot, then calls the persisted submission command. If final validation fails, the saved draft remains available to correct. Controls are disabled during the form operation with an immediate ref guard against duplicate clicks. Validation and network errors retain user input; account changes remount owner-specific state. Submitted/approved profiles display read-only fields.

Verification on 2026-11-04:

- Maven Wrapper with `-Dspring.profiles.active=test verify`: 294 tests, zero failures/errors/skips; packaged build succeeded. Tests use mocked repositories/MVC and temporary storage, not shared database writes.
- FE contract tests for application, business profile and verification documents: 26 passed. TypeScript and targeted lint passed. Production build passed with existing third-party directive/bundle warnings.
- Browser fixture on ports 3012/4089 stored synthetic data only in RAM. Verified partial save, reload/resume, missing-field/document errors retaining DRAFT, license upload without automatic submission, explicit transition to PENDING_REVIEW, read-only fields and blocked upload afterwards. A double-click attempt left exactly one successful submission and one upload in fixture statistics.
- Real MySQL write/concurrency and live Cloudinary upload were not tested. No schema or shared database data was changed. Local credentials, unrelated source, skills and worktree structure were preserved; no commit or push was made.
