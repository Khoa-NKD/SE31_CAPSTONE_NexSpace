package base.api.feature.organizer.dto.response;

import base.api.shared.enums.BusinessType;
import base.api.shared.enums.OrganizerProfileStatus;
import java.time.LocalDateTime;

/** Read-only list projection: no documents, banking fields, reviewer internals or account secrets. */
public record AdminOrganizerApplicationResponse(
        Long id, String legalName, BusinessType businessType,
        Long applicantId, String applicantUserName, String applicantEmail,
        OrganizerProfileStatus status, LocalDateTime submittedAt, LocalDateTime reviewedAt, boolean suspended) {
    public AdminOrganizerApplicationResponse(Long id, String legalName, BusinessType businessType,
            Long applicantId, String applicantUserName, String applicantEmail,
            OrganizerProfileStatus status, LocalDateTime submittedAt, LocalDateTime reviewedAt) {
        this(id, legalName, businessType, applicantId, applicantUserName, applicantEmail, status, submittedAt, reviewedAt, false);
    }
}
