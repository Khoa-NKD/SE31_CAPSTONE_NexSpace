package base.api.feature.organizer.dto.response;

import base.api.shared.enums.OrganizerDocumentStatus;
import base.api.shared.enums.OrganizerDocumentType;
import java.time.LocalDateTime;

/** Administrative metadata only; private storage references never cross this boundary. */
public record AdminOrganizerDocumentResponse(
        Long id, OrganizerDocumentType documentType, String fileName,
        OrganizerDocumentStatus status, LocalDateTime uploadedAt, boolean current, String adminFeedback) {
}
