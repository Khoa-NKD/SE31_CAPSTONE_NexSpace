package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AdminOrganizerDocumentAccessService {
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final IOrganizerDocumentRepository documents;

    /** Internal value, never serialized to an HTTP response. */
    public record Reference(String key, String fileName) {}

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public Reference authorize(Long actorId, Long applicationId, Long documentId) {
        var actor = users.findById(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!actor.isActive() || actor.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("An active Administrator account is required");
        }
        if (applicationId == null || applicationId < 1 || documentId == null || documentId < 1) {
            throw new BadRequestException("Application and document IDs must be positive integers");
        }
        profiles.findSubmittedApplicationDetails(applicationId)
                .orElseThrow(() -> new NotFoundException("Submitted organizer application not found"));
        var document = documents.findByIdAndOrganizerProfileId(documentId, applicationId)
                .orElseThrow(() -> new NotFoundException("Verification document not found in this application"));
        return new Reference(document.getFileUrl(), document.getFileName());
    }
}
