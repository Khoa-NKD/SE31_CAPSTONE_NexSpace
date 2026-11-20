# Organizer OTP agreements across machines

The deployable template `NEXSPACE-OTP-1` uses administrator approval followed by the applicant's authenticated account, consent/authority confirmation, and a single-use email OTP. It does not simulate a certificate-based digital signature or invent a representative's handwriting. Original PDFs, SHA-256 hashes and signed receipts remain immutable. Existing owner/admin authorization, expiry, resend limits, failed-attempt limits and transaction safeguards remain in effect.

## Required server configuration

Set these environment variables or equivalent `app.organizer.contract.*` properties on the backend:

```text
ORGANIZER_CONTRACT_ENABLED=true
ORGANIZER_CONTRACT_CLOUDINARY_ENABLED=true
ORGANIZER_CONTRACT_PLATFORM_LEGAL_NAME=305 NEXSPACE
ORGANIZER_CONTRACT_PLATFORM_TAX_ID=<actual tax identifier required>
ORGANIZER_CONTRACT_PLATFORM_ADDRESS=Ngũ Hành Sơn, Đà Nẵng, Việt Nam
ORGANIZER_CONTRACT_PLATFORM_REPRESENTATIVE_NAME=Nguyễn Huy Vũ
ORGANIZER_CONTRACT_PLATFORM_REPRESENTATIVE_TITLE=CEO
```

The operator must confirm the supplied name is the appropriate contracting legal identity and fill the actual tax identifier. Missing identity fields block new issuance; no tax identifier is generated. The platform representative comes from configuration, the authenticated approving administrator and approval time come from the reviewed application, and the organizer representative comes from the approved application. The current configured platform commission is captured when the agreement is issued; rental VAT follows the applicable rate rather than a hardcoded 10%.

Environment variable values can contain Vietnamese directly. When using Java `.properties` files, use the Unicode escapes shown in `application-local.properties.example` for accented values so property loaders preserve them across machines. The example disables demo issuance by default; enable and fully configure the managed template before approving applications for normal use. Existing unsigned demo records do not automatically become managed agreements when configuration changes; back up and explicitly replace the selected unsigned record. Never rewrite an already signed artifact or its evidence.

Configure working SMTP credentials and sender through the existing mail properties, plus Cloudinary credentials through the existing private-document provider. Required OTP delivery errors are returned rather than treated as successful delivery. Never commit credentials or actual developer configuration. Production does not require the `local` profile or the local-demo switch when the deployable template is enabled and configured. The older local-only demo gate remains for old demo agreements.

## Storage and access

With private cloud storage enabled, generated original and signed PDFs are authenticated raw PDF assets under the `Contracts` folder. Stored references fit the existing 80-character columns, so no schema migration is required. A second backend using the same database and Cloudinary account can retrieve those artifacts without the first machine's home directory. PDF bytes are served only after existing owner/admin checks, never as public Cloudinary URLs. Cloud failures do not silently fall back to a machine-local file when cloud storage is enabled; failed DB transactions compensate their new uploads.

Old local UUID references are still readable on the backend that retains their original files. Copying a database alone cannot transfer those files. Keep a persistent contract directory or arrange an explicit verified migration of old artifacts before moving that backend; this change does not rewrite old agreement hashes or records.

The frontend uses the configured backend API base or same-origin `/api`; for deployment, configure the reverse proxy or `VITE_BACKEND_API_URL` and the backend CORS/client URLs for the real site. A different client machine talks to that backend and does not need a local copy of any PDF. Each developer running their own backend must configure their own database, SMTP and storage.

## Separately signed name/address corrections

Flyway V21 adds `organizer_contract_addendum` without changing existing agreement rows. A verified active Organizer can list, read and sign only addenda attached to their own signed managed agreement. An active administrator issues the fixed name/address-encoding correction from configured platform identity, referencing both the parent agreement and its signed-PDF SHA-256. The correction cannot change the platform legal name or tax ID. One correction-template version per parent is enforced by a unique constraint and the profile lock; retrying issuance returns the existing version.

- Admin list/issue: `GET` / `POST /api/admin/organizer-applications/{profileId}/contract/addenda`. Issue body: `{contractId, contentHash}` for the original agreement.
- Owner list: `GET /api/organizer/contract/addenda`.
- Owner OTP/sign: `POST /api/organizer/contract/addenda/otp` with `{addendumId, contentHash}`; `POST /api/organizer/contract/addenda/sign` additionally requires `{otp, consent: true}`.
- Private PDF: `GET /api/organizer/contract/addenda/{id}/pdf` or the matching administrator path `/api/admin/organizer-applications/{profileId}/contract/addenda/{id}/pdf`.

The owner reads the separate PDF, confirms authority/consent and explicitly requests email OTP. OTPs are hashed, expire after 10 minutes, permit at most five incorrect attempts, have a 60-second resend cooldown and a five-send hourly limit. SMTP failure rolls back the undelivered code. Correct signing consumes the OTP and saves a separate signed receipt; retries return the committed signed record. Issuance/signing are audited and do not change the parent's PDF, content/hash, original signature time or account role. Cloud storage uses the same private `Contracts` folder and failure-compensation rules as agreements. Issuance itself does not send email or sign on behalf of the owner.

## Verification coverage

Tests cover non-local issuance and OTP signing, both approval/signing evidence in the PDF, private cloud retrieval across two backend instances, rollback cleanup, unconfigured deployment rejection, and the existing lifecycle/ownership/OTP safeguards. They use mock mail/cloud providers; real SMTP delivery and cloud access must be checked in the configured deployment environment. The template needs the operator's legal/business review before real use; it is not an external legal certification.
