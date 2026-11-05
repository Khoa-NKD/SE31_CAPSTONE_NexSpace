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
        String registrationReason) {
    public AdminOrganizerApplicationDetailsResponse(Long id, String legalName, BusinessType businessType, String taxId,
            String representativeName, String address, String contactEmail, String contactPhone,
            Applicant applicant, OrganizerProfileStatus status, LocalDateTime submittedAt,
            LocalDateTime reviewedAt, String reviewFeedback, List<AdminOrganizerDocumentResponse> documents) {
        this(id, legalName, businessType, taxId, representativeName, address, contactEmail, contactPhone,
                applicant, status, submittedAt, reviewedAt, reviewFeedback, documents, null);
    }
    public record Applicant(Long id, String userName, String email, String fullName) {
    }
}
