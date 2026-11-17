# Organizer document review feedback

The current workflow is defined in [Organizer review decisions](organizer-review-decisions.md).

- Final rejection accepts one general reason (up to 500 characters) and does not permit correction or resubmission.
- Request changes requires at least one current document, with an individual reason of 1–500 characters for each selected document and a general review summary. Document IDs must be unique and belong to the locked application.
- The profile stores the summary in review_feedback; each selected document stores its instructions in admin_feedback and becomes REJECTED. Profile, documents and audit update atomically.
- On the landing application page, the owner can replace only the requested documents, then explicitly resubmit. Approval keeps the existing document-confirmation requirement and optional review note.
- Replaced rows remain as historical metadata with is_current=false and status=REPLACED. The superseded physical file is deleted after commit. Active assets use authenticated Cloudinary storage under Organizers/{profileId}/doc.
- Suspend has been removed. No database columns or historical audit records are deleted.
