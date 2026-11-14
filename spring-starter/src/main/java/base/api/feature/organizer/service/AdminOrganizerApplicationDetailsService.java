package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationDetailsResponse;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AdminOrganizerApplicationDetailsService {
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final IOrganizerDocumentRepository documents;
    private final OrganizerLifecycleAudit audit;

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public AdminOrganizerApplicationDetailsResponse getDetails(Long actorId, Long applicationId) {
        var actor = users.findById(actorId)
                .orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!actor.isActive() || actor.getRole() != UserRole.ADMIN) {
            throw new ForbiddenException("An active Administrator account is required");
        }
        if (applicationId == null || applicationId < 1) {
            throw new BadRequestException("Application ID must be a positive integer");
        }
        var profile = profiles.findSubmittedApplicationDetails(applicationId)
                .orElseThrow(() -> new NotFoundException("Submitted organizer application not found"));
        var applicant = profile.getOrganizer();
        // The target applicant is selected by the profile, never by a client-supplied owner ID.
        return new AdminOrganizerApplicationDetailsResponse(
                profile.getId(), profile.getLegalName(), profile.getBusinessType(), profile.getTaxId(),
                profile.getRepresentativeName(), profile.getAddress(), profile.getContactEmail(), profile.getContactPhone(),
                new AdminOrganizerApplicationDetailsResponse.Applicant(
                        applicant.getId(), applicant.getUserName(), applicant.getEmail(), applicant.getFullName()),
                profile.getStatus(), profile.getSubmittedAt(), profile.getReviewedAt(), profile.getReviewFeedback(),
                List.copyOf(documents.findAdminMetadataByProfileId(profile.getId())), profile.getRegistrationReason(),
                audit.reviewHistory(profile.getId()));
    }
}
