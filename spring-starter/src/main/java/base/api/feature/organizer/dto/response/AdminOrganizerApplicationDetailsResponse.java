package base.api.feature.organizer.dto.response;

import base.api.shared.enums.BusinessType;
import base.api.shared.enums.OrganizerProfileStatus;
import java.time.LocalDateTime;
import java.util.List;

/** Explicit allowlist of submitted application information needed for administrative inspection. */
public record AdminOrganizerApplicationDetailsResponse(
        Long id, String legalName, BusinessType businessType, String taxId,
        String representativeName, String address, String contactEmail, String contactPhone,
        Applicant applicant, OrganizerProfileStatus status, LocalDateTime submittedAt,
        LocalDateTime reviewedAt, String reviewFeedback, List<AdminOrganizerDocumentResponse> documents,
        String registrationReason, List<ReviewDecision> reviewHistory) {
    public AdminOrganizerApplicationDetailsResponse(Long id, String legalName, BusinessType businessType, String taxId,
            String representativeName, String address, String contactEmail, String contactPhone,
            Applicant applicant, OrganizerProfileStatus status, LocalDateTime submittedAt,
            LocalDateTime reviewedAt, String reviewFeedback, List<AdminOrganizerDocumentResponse> documents) {
        this(id, legalName, businessType, taxId, representativeName, address, contactEmail, contactPhone,
                applicant, status, submittedAt, reviewedAt, reviewFeedback, documents, null, List.of());
    }
    public record Applicant(Long id, String userName, String email, String fullName) {
    }
    public record ReviewDecision(Long id, Decision decision, LocalDateTime reviewedAt, String reviewerName,
            String feedback, List<DocumentFeedback> documentFeedback) {
        public enum Decision { APPROVED, REJECTED, CHANGES_REQUESTED }
    }
    public record DocumentFeedback(Long documentId, String feedback) {
    }
}
