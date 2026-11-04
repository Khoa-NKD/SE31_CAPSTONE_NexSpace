package base.api.feature.organizer.dto.response;

import base.api.shared.enums.OrganizerDocumentType;
import java.util.List;

/** Minimal owner context needed to upload and refresh the document list, not an application-status API. */
public record OrganizerVerificationDocumentsResponse(
        Long profileId,
        boolean uploadAllowed,
        long maxFileSizeBytes,
        List<OrganizerDocumentType> supportedDocumentTypes,
        List<OrganizerVerificationDocumentResponse> documents) {
}
