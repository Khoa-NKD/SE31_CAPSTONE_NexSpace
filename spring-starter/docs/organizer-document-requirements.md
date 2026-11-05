# Organizer document requirements

This is the product policy approved for NexSpace onboarding, not a statement that Vietnamese law requires these documents to be uploaded to this platform.

| Business type | Required current documents |
| --- | --- |
| JOINT_STOCK | BUSINESS_LICENSE: enterprise registration certificate |
| LIMITED_LIABILITY | BUSINESS_LICENSE: enterprise registration certificate |
| SOLE_PROPRIETOR | BUSINESS_LICENSE: enterprise registration certificate; ID_CARD_FRONT and ID_CARD_BACK of the proprietor |
| HOUSEHOLD_BUSINESS | BUSINESS_LICENSE: household business registration certificate; ID_CARD_FRONT and ID_CARD_BACK of the owner |
| OTHER | BUSINESS_LICENSE: establishment/equivalent registration document; OTHER: evidence of authority to represent the organization |

OTHER is not an alias for individual registration. TAX_CERTIFICATE remains optional and BANK_CERTIFICATE remains outside the upload flow. Evidence for an individual workspace is not made mandatory by this policy. Admins still check readable content, validity, matching owner/identity-card sides, legal name and representation manually; file validation cannot establish document authenticity.

`OrganizerDocumentRequirements` is the authoritative matrix. GET `/api/public/organizer-document-requirements` returns the five policies and bilingual labels/guidance. FE uses it for a live checklist and checks persisted document metadata before submit/resubmit. The server independently validates under the existing profile lock at draft submission, legacy multipart submission and resubmission. All required types must have exactly one current PENDING/VERIFIED document with a stored reference. Duplicate types, rejected/obsolete or empty-reference current documents prevent submission. Saving a draft remains allowed with missing required documents.

Changing business type updates the checklist and preserves all files. During REVISION_REQUESTED all business fields are read-only and the correction endpoint permits replacing only current files explicitly rejected by the administrator. Adding missing or optional types and unrequested replacements is blocked. Final REJECTED/APPROVED/PENDING_REVIEW profiles and stale revisions remain blocked. The former business correction endpoint now returns a conflict without writing any data.

Existing APPROVED profiles are not invalidated, modified or reopened. Already PENDING_REVIEW applications keep the existing approval eligibility rules to avoid retroactively demanding files they cannot edit; if returned for correction, their next explicit resubmission must satisfy the approved matrix. No automatic schema, master-data, profile-status or file changes occur. No new individual business type is introduced.

Legacy applications missing types required by the newer matrix remain blocked at resubmission; they require administrator assistance rather than an unrequested upload or a business-type change. No historical application is silently exempted from resubmission validation.
