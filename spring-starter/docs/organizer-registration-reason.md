# Organizer registration reason

The applicant provides registrationReason to explain why they want to become an Organizer. It is distinct from the administrator's reviewFeedback.

## Agreed rules

- A draft or correction save can leave the reason empty. Blank draft values normalize to NULL.
- Explicit initial submission and resubmission require a nonblank reason, at most 2,000 characters after trimming. Invalid input returns the existing field-error envelope without changing application state.
- Existing submitted/approved applications may keep NULL. Admin viewing, approval/rejection and approved contact updates do not require invented reasons or retroactively change the application.
- Owners can edit the reason only in the existing DRAFT / REJECTED / REVISION_REQUESTED flows. Pending and approved applications remain read-only in the application form.

## Database and contract

organizer_profile.registration_reason is VARCHAR(2000) NULL. The one-column SQL in sql/organizer-registration-reason.sql was applied to the configured Local database after the user's explicit authorization. No existing reason, role, status, credentials or unrelated schema was changed. Other database targets require their own authorized rollout.

Existing endpoints are reused:

| Endpoint | Change |
| --- | --- |
| PUT /api/organizer/applications/draft | Accept optional registrationReason and return the saved value |
| POST /api/organizer/applications | Multipart application JSON requires registrationReason |
| POST /api/organizer/applications/submit | Validate registrationReason from persisted draft fields |
| GET /api/organizer/applications/current | Return nullable registrationReason to the owner |
| PUT /api/organizer/applications/current/correction | Save application.registrationReason without resubmitting |
| POST /api/organizer/applications/current/resubmit | Require the persisted registrationReason |
| GET /api/admin/organizer-applications/{id} | Return nullable registrationReason with application details |

Submission-specific Bean Validation groups enforce the required reason without making legacy approval depend on it. The maximum length applies to every write. Existing role, ownership, locking, transaction and audit behavior remains in place. The list DTO and approved business-contact DTO are unchanged.

## Frontend

The existing application form has a multiline Registration reason field, a 2,000-character limit, field errors and a description of the save/submit distinction. Loading an existing draft restores its saved reason. Correction saves can be incomplete with respect to the reason; explicit submission/resubmission validates it before making write requests.

Admin application details show the applicant's reason as plain text with preserved line breaks. Legacy NULL/empty values display “No registration reason was recorded for this application.” The UI does not substitute review feedback or sample text.

## Verification scope

Tests cover blank draft saves, missing/whitespace reasons on submission, trimming/length boundaries, mapping to owner/Admin responses, reason persistence through corrections and resubmission, and approval of legacy pending applications with NULL. Database-writing tests use isolated H2; Local schema inspection and runtime smoke checks do not create test applications in the shared database.

No new runtime dependency, authentication mechanism, role or application status was introduced. No commit or push is authorized by this implementation task.
