package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.feature.organizer.dto.response.OrganizerApplicationResponse;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Clock;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizerApplicationService {
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final IOrganizerDocumentRepository documents;
    private final PrivateOrganizerDocumentStorage storage;
    private final Clock organizerApplicationClock;

    /** Initial submission only. Row locking plus the existing unique organizer FK prevent concurrent duplicates. */
    @Transactional
    public OrganizerApplicationResponse submit(Long actorId, SubmitOrganizerApplicationRequest request, MultipartFile file) {
        var user = users.findByIdForApplication(actorId)
                .orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!user.isActive() || !user.isVerified()
                || (user.getRole() != UserRole.USER && user.getRole() != UserRole.ORGANIZER)) {
            throw new ForbiddenException("An active, email-verified Customer or Organizer account is required");
        }
        if (profiles.findByOrganizerId(actorId).isPresent()) {
            throw new ConflictException("An organizer profile already exists. Initial submission cannot be repeated");
        }
        if (profiles.findByTaxIdAndStatus(request.taxId(), OrganizerProfileStatus.APPROVED).isPresent()) {
            throw new ConflictException("This tax ID belongs to an approved organizer");
        }
        var stored = storage.store(file);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try {
                        storage.delete(stored);
                    } catch (RuntimeException ex) {
                        log.error("Could not clean up document after application rollback");
                    }
                }
            }
        });
        var profile = new OrganizerProfileModel();
        profile.setOrganizer(user);
        profile.setLegalName(request.legalName());
        profile.setBusinessType(request.businessType());
        profile.setTaxId(request.taxId());
        profile.setRepresentativeName(request.representativeName());
        profile.setAddress(request.address());
        profile.setContactPhone(request.contactPhone());
        profile.setContactEmail(request.contactEmail());
        profile.setStatus(OrganizerProfileStatus.PENDING_REVIEW);
        profile.setSubmittedAt(LocalDateTime.now(organizerApplicationClock));
        profiles.saveAndFlush(profile);
        var document = new OrganizerDocumentModel();
        document.setOrganizerProfile(profile);
        document.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE);
        document.setFileName(stored.originalName());
        document.setFileUrl(stored.key());
        documents.saveAndFlush(document);
        return new OrganizerApplicationResponse(profile.getId(), profile.getStatus(), profile.getSubmittedAt());
    }
}
