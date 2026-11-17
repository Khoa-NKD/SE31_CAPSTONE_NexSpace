# Organizer decision email notifications

Successful Approve, Reject and Request changes decisions publish an immutable `OrganizerReviewNotification` snapshot inside the existing review transaction. `OrganizerReviewEmailNotification` receives it only AFTER_COMMIT and queues the existing `EmailService.sendHtmlEmail` / `emailExecutor`. Rolled-back or invalid decisions send nothing. Review locks and revisions remain unchanged.

Notifications go to the applicant's account email, not the editable business contact email. Vietnamese HTML templates include the application ID, business name and the decision's overall feedback. Request changes additionally lists only documents explicitly requested for replacement and each reason. Rejection remains final and offers no correction/resubmission action. Dynamic values are HTML-escaped. No document links, tokens, bank details or attachments are included.

Buttons use the existing `app.client-url` plus `/auth/sign-in?redirect=...`, then the existing login flow:

- APPROVED: `/dashboard/organizer/workspaces`.
- REVISION_REQUESTED: `/organizer/apply`, where requested files can be replaced before explicit resubmission.
- REJECTED: `/organizer/apply`, to view the final outcome.

Re-authentication refreshes the account role after approval and keeps access checks intact. Links neither authenticate users nor authorize resources. The latest application page remains authoritative if a user opens an older email.

SMTP settings and the frontend base URL use the existing configuration. The ignored Local config already points to frontend port 3000. No credentials, schema, authentication or shared data changes are introduced. Tests use a mocked mail sender and isolated H2 transactions; they do not prove real SMTP delivery.

Delivery retains the existing in-memory, asynchronous best-effort behavior. SMTP failures are handled by the existing sender; queue/configuration failures in this listener are logged by application ID and do not fail the already-committed review. No durable outbox or automatic resend is added, so an unavailable SMTP server or process restart may prevent delivery. The administrator's successful response confirms the decision, not email delivery.
