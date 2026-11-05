package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest;
import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.feature.organizer.dto.response.OrganizerApplicationDetailsResponse;
import base.api.feature.organizer.dto.response.OrganizerApplicationResponse;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.enums.OrganizerDocumentStatus;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserRole;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.UnauthorizedException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.entity.UserModel;
import jakarta.validation.Validator;
import jakarta.validation.groups.Default;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.Clock;
import java.util.LinkedHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class OrganizerApplicationService {
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final IOrganizerDocumentRepository documents;
    private final PrivateOrganizerDocumentStorage storage;
    private final Clock organizerApplicationClock;
    private final Validator validator;

    @Transactional(readOnly = true)
    public OrganizerApplicationDetailsResponse current(Long actorId) {
        requireEligible(users.findById(actorId)
                .orElseThrow(() -> new UnauthorizedException("Account not found")));
        return OrganizerApplicationDetailsResponse.from(owned(actorId, false));
    }

    /** Explicit, idempotent creation; GET requests never create profiles. */
    @Transactional
    public OrganizerApplicationDetailsResponse startDraft(Long actorId) {
        var user = lockEligibleUser(actorId);
        var existing = profiles.findByOrganizerIdForUpdate(actorId);
        if (existing.isPresent()) {
            requireOwner(actorId, existing.get());
            requireDraft(existing.get());
            return OrganizerApplicationDetailsResponse.from(existing.get());
        }
        var profile = new OrganizerProfileModel();
        profile.setOrganizer(user);
        profiles.saveAndFlush(profile);
        return OrganizerApplicationDetailsResponse.from(profile);
    }

    @Transactional
    public OrganizerApplicationDetailsResponse saveDraft(Long actorId, SaveOrganizerDraftRequest request) {
        lockEligibleUser(actorId);
        var profile = owned(actorId, true);
        requireDraft(profile);
        validate(request);
        apply(profile, new SubmitOrganizerApplicationRequest(request.legalName(), request.businessType(),
                request.taxId(), request.representativeName(), request.address(), request.contactPhone(), request.contactEmail(), request.registrationReason()));
        profiles.saveAndFlush(profile);
        return OrganizerApplicationDetailsResponse.from(profile);
    }

    /** Final submission reads persisted fields and the current document under the profile lock. */
    @Transactional
    public OrganizerApplicationResponse submitDraft(Long actorId) {
        lockEligibleUser(actorId);
        var profile = owned(actorId, true);
        requireDraft(profile);
        var request = new SubmitOrganizerApplicationRequest(profile.getLegalName(), profile.getBusinessType(),
                profile.getTaxId(), profile.getRepresentativeName(), profile.getAddress(), profile.getContactPhone(), profile.getContactEmail(), profile.getRegistrationReason());
        var errors = validationErrors(request, Default.class, SubmitOrganizerApplicationRequest.Submission.class);
        var license = documents.findFirstByOrganizerProfileIdAndDocumentTypeAndCurrentTrueOrderByIdDesc(
                profile.getId(), OrganizerDocumentType.BUSINESS_LICENSE);
        if (license.isEmpty() || license.get().getStatus() == OrganizerDocumentStatus.REJECTED
                || license.get().getFileUrl() == null || license.get().getFileUrl().isBlank()) {
            errors.put("businessLicense", "Upload a current, non-rejected business license before submitting");
        }
        if (!errors.isEmpty()) throw new OrganizerApplicationValidationException(errors);
        requireAvailableTaxId(request.taxId());
        apply(profile, request);
        return markSubmitted(profile);
    }

    /** Preserve the original multipart contract and allow a draft's existing license to be reused. */
    @Transactional
    public OrganizerApplicationResponse submit(Long actorId, SubmitOrganizerApplicationRequest request, MultipartFile file) {
        var user = lockEligibleUser(actorId);
        var errors = validationErrors(request, Default.class, SubmitOrganizerApplicationRequest.Submission.class);
        if (!errors.isEmpty()) throw new OrganizerApplicationValidationException(errors);
        var existing = profiles.findByOrganizerIdForUpdate(actorId);
        var profile = existing.orElseGet(OrganizerProfileModel::new);
        if (existing.isPresent()) {
            requireOwner(actorId, profile);
            requireDraft(profile);
        }
        requireAvailableTaxId(request.taxId());
        var currentLicense = existing.isEmpty() ? java.util.Optional.<OrganizerDocumentModel>empty()
                : documents.findFirstByOrganizerProfileIdAndDocumentTypeAndCurrentTrueOrderByIdDesc(
                        profile.getId(), OrganizerDocumentType.BUSINESS_LICENSE);
        if (currentLicense.isPresent() && file != null) {
            throw new ConflictException("A current business license already exists. Submit without uploading it again");
        }
        if (currentLicense.isPresent() && (currentLicense.get().getStatus() == OrganizerDocumentStatus.REJECTED
                || currentLicense.get().getFileUrl() == null || currentLicense.get().getFileUrl().isBlank())) {
            throw new OrganizerApplicationValidationException(java.util.Map.of("businessLicense", "A valid current business license is required"));
        }
        if (currentLicense.isEmpty() && file == null) {
            throw new OrganizerApplicationValidationException(java.util.Map.of("businessLicense", "A business license is required"));
        }
        profile.setOrganizer(user);
        apply(profile, request);
        var receipt = markSubmitted(profile);
        var stored = currentLicense.isEmpty() ? storage.store(file, profile.getId()) : null;
        if (stored != null) registerRollbackCleanup(stored);
        if (stored != null) {
            var document = new OrganizerDocumentModel();
            document.setOrganizerProfile(profile);
            document.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE);
            document.setFileName(stored.originalName());
            document.setFileUrl(stored.key());
            documents.saveAndFlush(document);
        }
        return receipt;
    }

    private void registerRollbackCleanup(PrivateOrganizerDocumentStorage.StoredDocument stored) {
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
    }

    private void apply(OrganizerProfileModel profile, SubmitOrganizerApplicationRequest request) {
        profile.setLegalName(request.legalName());
        profile.setBusinessType(request.businessType());
        profile.setTaxId(request.taxId());
        profile.setRepresentativeName(request.representativeName());
        profile.setAddress(request.address());
        profile.setContactPhone(request.contactPhone());
        profile.setContactEmail(request.contactEmail());
        profile.setRegistrationReason(request.registrationReason());
    }

    private OrganizerApplicationResponse markSubmitted(OrganizerProfileModel profile) {
        profile.setStatus(OrganizerProfileStatus.PENDING_REVIEW);
        profile.setSubmittedAt(LocalDateTime.now(organizerApplicationClock));
        profiles.saveAndFlush(profile);
        return new OrganizerApplicationResponse(profile.getId(), profile.getStatus(), profile.getSubmittedAt());
    }

    private UserModel lockEligibleUser(Long actorId) {
        var user = users.findByIdForApplication(actorId)
                .orElseThrow(() -> new UnauthorizedException("Account not found"));
        requireEligible(user);
        return user;
    }

    private void requireEligible(UserModel user) {
        if (!user.isActive() || !user.isVerified()
                || (user.getRole() != UserRole.USER && user.getRole() != UserRole.ORGANIZER)) {
            throw new ForbiddenException("An active, email-verified Customer or Organizer account is required");
        }
    }

    private OrganizerProfileModel owned(Long actorId, boolean lock) {
        var profile = (lock ? profiles.findByOrganizerIdForUpdate(actorId) : profiles.findByOrganizerId(actorId))
                .orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        requireOwner(actorId, profile);
        return profile;
    }

    private void requireOwner(Long actorId, OrganizerProfileModel profile) {
        if (!actorId.equals(profile.getOrganizer().getId())) throw new ForbiddenException("This organizer profile belongs to another account");
    }

    private void requireDraft(OrganizerProfileModel profile) {
        if (profile.getStatus() != OrganizerProfileStatus.DRAFT) {
            throw new ConflictException("Only a DRAFT application can be saved or submitted through this flow");
        }
    }

    private void requireAvailableTaxId(String taxId) {
        if (profiles.findByTaxIdAndStatus(taxId, OrganizerProfileStatus.APPROVED).isPresent()) {
            throw new ConflictException("This tax ID belongs to an approved organizer");
        }
    }

    private LinkedHashMap<String, String> validationErrors(Object request, Class<?>... groups) {
        var errors = new LinkedHashMap<String, String>();
        validator.validate(request, groups).forEach(violation -> errors.putIfAbsent(violation.getPropertyPath().toString(), violation.getMessage()));
        return errors;
    }

    private void validate(Object request) {
        var errors = validationErrors(request);
        if (!errors.isEmpty()) throw new OrganizerApplicationValidationException(errors);
    }
}
