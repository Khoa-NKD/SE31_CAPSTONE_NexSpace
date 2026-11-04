package base.api.feature.organizer.dto.response;

import base.api.shared.enums.OrganizerDocumentStatus;
import base.api.shared.enums.OrganizerDocumentType;

import java.time.LocalDateTime;

/** Owner-visible metadata without private storage keys, filesystem paths or document contents. */
public record OrganizerVerificationDocumentResponse(
        Long id,
        OrganizerDocumentType documentType,
        String fileName,
        OrganizerDocumentStatus status,
        LocalDateTime uploadedAt) {
}
