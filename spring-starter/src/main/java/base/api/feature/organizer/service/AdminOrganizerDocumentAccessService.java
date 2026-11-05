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

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(readOnly = true)
    public Reference authorizeOwner(Long actorId, Long documentId) {
        var actor = users.findById(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!actor.isActive() || !actor.isVerified()
                || (actor.getRole() != UserRole.USER && actor.getRole() != UserRole.ORGANIZER))
            throw new ForbiddenException("An active, email-verified applicant account is required");
        if (documentId == null || documentId < 1) throw new BadRequestException("Document ID must be positive");
        var profile = profiles.findByOrganizerId(actorId)
                .orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        var document = documents.findByIdAndOrganizerProfileId(documentId, profile.getId())
                .filter(value -> value.isCurrent())
                .orElseThrow(() -> new NotFoundException("Current verification document not found"));
        return new Reference(document.getFileUrl(), document.getFileName());
    }

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
        if (document.getStatus() == base.api.shared.enums.OrganizerDocumentStatus.REPLACED)
            throw new NotFoundException("This document has been replaced; only its historical metadata is retained");
        return new Reference(document.getFileUrl(), document.getFileName());
    }
}
