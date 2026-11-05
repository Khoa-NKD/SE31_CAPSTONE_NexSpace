package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.OrganizerVerificationDocumentResponse;
import base.api.feature.organizer.dto.response.OrganizerVerificationDocumentsResponse;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizerVerificationDocumentService {
    private static final List<OrganizerDocumentType> SUPPORTED_TYPES = List.of(
            OrganizerDocumentType.BUSINESS_LICENSE, OrganizerDocumentType.ID_CARD_FRONT,
            OrganizerDocumentType.ID_CARD_BACK, OrganizerDocumentType.TAX_CERTIFICATE, OrganizerDocumentType.OTHER);
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final IOrganizerDocumentRepository documents;
    private final PrivateOrganizerDocumentStorage storage;

    @Transactional(readOnly = true)
    public OrganizerVerificationDocumentsResponse listCurrentDocuments(Long actorId) {
        requireEligibleAccount(actorId);
        var profile = profiles.findByOrganizerId(actorId)
                .orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        requireOwnership(actorId, profile);
        var metadata = documents.findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(profile.getId()).stream()
                .map(this::toResponse).toList();
        return new OrganizerVerificationDocumentsResponse(profile.getId(), uploadAllowed(profile),
                PrivateOrganizerDocumentStorage.MAX_BYTES, SUPPORTED_TYPES, metadata);
    }

    @Transactional
    public OrganizerVerificationDocumentResponse upload(Long actorId, OrganizerDocumentType type, MultipartFile file) {
        requireEligibleAccount(actorId);
        // All document additions for one profile serialize before checking the current type.
        var profile = profiles.findByOrganizerIdForUpdate(actorId)
                .orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        requireOwnership(actorId, profile);
        if (profile.getStatus() != OrganizerProfileStatus.DRAFT) {
            throw new ConflictException("New document types can only be added to a DRAFT; use the correction flow for requested replacements");
        }
        if (type == null || !SUPPORTED_TYPES.contains(type)) {
            throw new BadRequestException("Unsupported verification document type");
        }
        if (documents.findFirstByOrganizerProfileIdAndDocumentTypeAndCurrentTrueOrderByIdDesc(profile.getId(), type).isPresent()) {
            throw new ConflictException("A current document of this type already exists. Replacement is not available here");
        }
        var stored = storage.store(file, profile.getId());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try {
                        storage.delete(stored);
                    } catch (RuntimeException ex) {
                        log.error("Could not clean up verification document after upload rollback");
                    }
                }
            }
        });
        var document = new OrganizerDocumentModel();
        document.setOrganizerProfile(profile);
        document.setDocumentType(type);
        document.setFileName(stored.originalName());
        document.setFileUrl(stored.key());
        documents.saveAndFlush(document);
        return toResponse(document);
    }

    private void requireEligibleAccount(Long actorId) {
        var user = users.findById(actorId)
                .orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!user.isActive() || !user.isVerified()
                || (user.getRole() != UserRole.USER && user.getRole() != UserRole.ORGANIZER)) {
            throw new ForbiddenException("An active, email-verified Customer or Organizer account is required");
        }
    }

    private void requireOwnership(Long actorId, OrganizerProfileModel profile) {
        if (!actorId.equals(profile.getOrganizer().getId())) {
            throw new ForbiddenException("This organizer profile belongs to another account");
        }
    }

    private boolean uploadAllowed(OrganizerProfileModel profile) {
        return profile.getStatus() == OrganizerProfileStatus.DRAFT
                || profile.getStatus() == OrganizerProfileStatus.REVISION_REQUESTED;
    }

    private OrganizerVerificationDocumentResponse toResponse(OrganizerDocumentModel document) {
        return new OrganizerVerificationDocumentResponse(document.getId(), document.getDocumentType(),
                document.getFileName(), document.getStatus(), document.getCreatedAt(), document.getAdminFeedback());
    }
}
