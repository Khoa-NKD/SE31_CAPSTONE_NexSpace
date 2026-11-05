package base.api.feature.organizer.service;

import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.enums.OrganizerProfileStatus;
import java.util.List;

/** Immutable decision snapshot; asynchronous delivery never reads managed entities. */
public record OrganizerReviewNotification(Long applicationId, String recipient, String applicantName,
        String legalName, OrganizerProfileStatus status, String feedback, List<DocumentChange> documentChanges) {
    public OrganizerReviewNotification { documentChanges = List.copyOf(documentChanges); }
    public record DocumentChange(OrganizerDocumentType type, String feedback) { }
    @Override public String toString() { return "OrganizerReviewNotification[applicationId=" + applicationId + ", status=" + status + "]"; }
}
