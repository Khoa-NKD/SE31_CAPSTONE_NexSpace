# Organizer review decisions

This workflow supersedes the earlier rejection-with-corrections behavior. Existing records are not rewritten.

| Action | Target state | Applicant behavior |
| --- | --- | --- |
| Approve | APPROVED | Existing document verification and role assignment remain atomic. |
| Request changes | REVISION_REQUESTED | Replace the specifically flagged documents, save corrections and explicitly resubmit. |
| Reject | REJECTED | Final decision. Read-only; corrections, replacement and resubmission are blocked. |

`POST /api/admin/organizer-applications/{id}/request-changes` accepts `revision`, a required general `reason` of 1–500 characters and a nonempty `documentFeedbacks` list. Each item has a unique, positive `documentId` referring to a current document in this application and a required `feedback` of 1–500 characters. Read-only document types cannot be targeted for replacement.

The existing profile/user locks, active verified applicant checks, pending-state check and optimistic reviewed revision apply. Selected documents become REJECTED and store their replacement instructions in `admin_feedback`. The profile stores the general summary, reviewer and review time. The transaction writes `Organizer.RequestChanges` to the existing audit log. No new table or column is needed.

Owner document lists expose these existing metadata fields. Replacing a flagged file retains its old version and instructions, creates a current PENDING version and keeps the profile REVISION_REQUESTED. Resubmission rejects any remaining current REJECTED document. Only explicit resubmission returns the profile to PENDING_REVIEW.

During REVISION_REQUESTED, only a current document marked REJECTED by the reviewer can be replaced. Unrequested types and already-resolved replacements are locked. Adding new document types through the standalone upload endpoint is limited to DRAFT.

Unapproved USER accounts remain on `/organizer/apply` for review feedback, requested replacements and explicit resubmission. They cannot enter the Organizer dashboard. Approved ORGANIZER accounts use `/dashboard/organizer/application`, a read-only application and document view within the dashboard shell. Suspended Organizers retain access to this read-only page.

The rejection endpoint now accepts a general reason only; per-document feedback is rejected. Rejection does not alter the role or document verification status. REJECTED no longer grants correction permissions. Suspension has been retired: no Suspend action or endpoint is available, and the former operational suspension interceptor is disabled. The legacy database fields and response fields remain for compatibility; lifecycle capabilities report suspension as unavailable. Normal role and ownership authorization is unchanged.

Tests use mocked services and isolated H2 only; no decision or sample data is written to the Local database automatically.
