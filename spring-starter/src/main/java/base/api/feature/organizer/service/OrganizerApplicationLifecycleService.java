package base.api.feature.organizer.service;

import base.api.feature.auth.repository.*;
import base.api.feature.organizer.dto.request.OrganizerLifecycleRequests.*;
import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.feature.organizer.dto.response.OrganizerLifecycleContext;
import base.api.feature.organizer.repository.*;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.*;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import jakarta.validation.Validator;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.transaction.support.*;
import org.springframework.web.multipart.MultipartFile;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class OrganizerApplicationLifecycleService {
    private final IUserRepository users;
    private final IRoleRepository roles;
    private final IOrganizerProfileRepository profiles;
    private final IOrganizerDocumentRepository documents;
    private final PrivateOrganizerDocumentStorage storage;
    private final OrganizerLifecycleAudit audit;
    private final Validator validator;
    private final Clock organizerApplicationClock;
    private static final Set<OrganizerDocumentType> CORRECTION_TYPES = Set.of(OrganizerDocumentType.BUSINESS_LICENSE,
            OrganizerDocumentType.ID_CARD_FRONT, OrganizerDocumentType.ID_CARD_BACK,
            OrganizerDocumentType.TAX_CERTIFICATE, OrganizerDocumentType.OTHER);

    private record DocumentState(Long id, OrganizerDocumentStatus status, boolean current) {}
    private record State(OrganizerProfileStatus status, UserRole role, boolean suspended,
            LocalDateTime submittedAt, List<DocumentState> documents) {}

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public OrganizerLifecycleContext adminContext(Long actorId, Long applicationId) {
        var actor = admin(actorId);
        positive(applicationId);
        var profile = profiles.findSubmittedApplicationDetails(applicationId)
                .orElseThrow(() -> new NotFoundException("Submitted organizer application not found"));
        return context(profile, actor.getId(), true);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(readOnly = true)
    public OrganizerLifecycleContext ownerContext(Long actorId) {
        eligibleReader(users.findById(actorId).orElseThrow(() -> new UnauthorizedException("Account not found")));
        var profile = profiles.findByOrganizerId(actorId).orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        owner(actorId, profile);
        return context(profile, actorId, false);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext approve(Long actorId, Long applicationId, Approval request) {
        var actor = admin(actorId); validate(request);
        // The existing role row serializes conditional tax-ID uniqueness across different applications.
        var organizerRole = roles.findByNameForOrganizerApproval("ORGANIZER")
                .orElseThrow(() -> new ConflictException("Organizer role is not configured"));
        var profile = lockAdminTarget(actorId, applicationId);
        requirePending(profile); requireApplicant(profile.getOrganizer());
        revision(profile, request.revision());
        var current = currentDocuments(profile);
        validateBusiness(profile); validateDocuments(current);
        var expected = new HashSet<>(request.documentIds());
        var actual = new HashSet<>(current.stream().map(OrganizerDocumentModel::getId).toList());
        if (!request.documentsConfirmed() || expected.size() != request.documentIds().size() || !expected.equals(actual)) {
            throw new ConflictException("Confirm the complete current document set after reviewing the latest application");
        }
        availableTaxId(profile);
        var before = snapshot(profile, current);
        current.forEach(document -> document.setStatus(OrganizerDocumentStatus.VERIFIED));
        documents.saveAll(current);
        profile.setStatus(OrganizerProfileStatus.APPROVED);
        profile.setReviewedBy(actor); profile.setReviewedAt(now()); profile.setReviewFeedback(request.note());
        profile.getOrganizer().setRoleEntity(organizerRole);
        users.save(profile.getOrganizer()); profiles.save(profile);
        audit.write(actor, profile.getId(), "Organizer.Approve", before, snapshot(profile, current), request.note());
        return context(profile, actorId, true);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext reject(Long actorId, Long applicationId, Reason request) {
        var actor = admin(actorId); validate(request);
        var profile = lockAdminTarget(actorId, applicationId);
        requirePending(profile); requireApplicant(profile.getOrganizer()); revision(profile, request.revision());
        var current = currentDocuments(profile); var before = snapshot(profile, current);
        profile.setStatus(OrganizerProfileStatus.REJECTED); profile.setReviewedBy(actor);
        profile.setReviewedAt(now()); profile.setReviewFeedback(request.reason()); profiles.save(profile);
        // A profile rejection is not a document verification result and never changes the applicant's role.
        audit.write(actor, profile.getId(), "Organizer.Reject", before, snapshot(profile, current), request.reason());
        return context(profile, actorId, true);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext suspend(Long actorId, Long applicationId, Reason request) {
        var actor = admin(actorId); validate(request);
        var profile = lockAdminTarget(actorId, applicationId); revision(profile, request.revision());
        if (profile.getStatus() != OrganizerProfileStatus.APPROVED || profile.isSuspended()
                || profile.getOrganizer().getRole() != UserRole.ORGANIZER || !profile.getOrganizer().isActive()) {
            throw new ConflictException("Only an active, approved, unsuspended Organizer can be suspended");
        }
        var current = currentDocuments(profile); var before = snapshot(profile, current);
        profile.setSuspended(true); profiles.save(profile);
        audit.write(actor, profile.getId(), "Organizer.Suspend", before, snapshot(profile, current), request.reason());
        return context(profile, actorId, true);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext saveCorrection(Long actorId, Correction request) {
        validate(request);
        var profile = lockOwnerCorrection(actorId); revision(profile, request.revision());
        var input = request.application(); var current = currentDocuments(profile); var before = snapshot(profile, current);
        profile.setLegalName(input.legalName()); profile.setBusinessType(input.businessType()); profile.setTaxId(input.taxId());
        profile.setRepresentativeName(input.representativeName()); profile.setAddress(input.address());
        profile.setContactPhone(input.contactPhone()); profile.setContactEmail(input.contactEmail()); profiles.save(profile);
        audit.write(profile.getOrganizer(), profile.getId(), "Organizer.Correct", before, snapshot(profile, current), null);
        return context(profile, actorId, false);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext correctDocument(Long actorId, Long expectedRevision, OrganizerDocumentType type,
            Long expectedCurrentDocumentId, MultipartFile file) {
        var profile = lockOwnerCorrection(actorId); revision(profile, expectedRevision);
        if (type == null || !CORRECTION_TYPES.contains(type)) throw new BadRequestException("Unsupported correction document type");
        var current = currentDocuments(profile);
        var matching = current.stream().filter(document -> document.getDocumentType() == type).toList();
        if (matching.size() > 1) throw new ConflictException("Multiple current documents require administrator investigation");
        var old = matching.isEmpty() ? null : matching.get(0);
        if (!Objects.equals(old == null ? null : old.getId(), expectedCurrentDocumentId)) {
            throw new ConflictException("The current document changed. Reload before explicitly replacing it");
        }
        if (file == null) throw new BadRequestException("Choose a replacement document");
        var before = snapshot(profile, current);
        var stored = storage.store(file);
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try { storage.delete(stored); } catch (RuntimeException ex) { log.error("Could not compensate a rolled-back correction upload"); }
                }
            }
        });
        if (old != null) { old.setCurrent(false); documents.save(old); }
        var replacement = new OrganizerDocumentModel(); replacement.setOrganizerProfile(profile);
        replacement.setDocumentType(type); replacement.setFileUrl(stored.key()); replacement.setFileName(stored.originalName());
        documents.saveAndFlush(replacement);
        audit.write(profile.getOrganizer(), profile.getId(), "Organizer.CorrectDocument", before,
                snapshot(profile, currentDocuments(profile)), old == null ? "Added missing document type" : "Explicitly replaced current document; previous version retained");
        return context(profile, actorId, false);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext resubmit(Long actorId, Revision request) {
        validate(request);
        var profile = lockOwnerCorrection(actorId); revision(profile, request.revision());
        validateBusiness(profile); var current = currentDocuments(profile); validateDocuments(current); availableTaxId(profile);
        var before = snapshot(profile, current);
        profile.setStatus(OrganizerProfileStatus.PENDING_REVIEW); profile.setSubmittedAt(now());
        profile.setReviewedAt(null); profile.setReviewedBy(null); profile.setReviewFeedback(null); profiles.save(profile);
        // Previous decisions/reasons remain in audit; pending review does not display an obsolete decision as current.
        audit.write(profile.getOrganizer(), profile.getId(), "Organizer.Resubmit", before, snapshot(profile, current), null);
        return context(profile, actorId, false);
    }

    private OrganizerProfileModel lockAdminTarget(Long actorId, Long id) {
        positive(id);
        Long applicantId = profiles.findApplicantId(id).orElseThrow(() -> new NotFoundException("Organizer application not found"));
        if (actorId.equals(applicantId)) throw new ForbiddenException("Administrators cannot review their own application");
        users.findByIdForApplication(applicantId).orElseThrow(() -> new NotFoundException("Applicant account not found"));
        var profile = profiles.findByIdForLifecycleUpdate(id).orElseThrow(() -> new NotFoundException("Organizer application not found"));
        if (profile.getSubmittedAt() == null || profile.getStatus() == OrganizerProfileStatus.DRAFT)
            throw new NotFoundException("Submitted organizer application not found");
        return profile;
    }

    private OrganizerProfileModel lockOwnerCorrection(Long actorId) {
        var user = users.findByIdForApplication(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        requireApplicant(user);
        var profile = profiles.findByOrganizerIdForUpdate(actorId).orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        owner(actorId, profile);
        if (profile.isSuspended() || !correctable(profile)) throw new ConflictException("Only rejected or revision-requested applications can be corrected or resubmitted");
        return profile;
    }

    private OrganizerLifecycleContext context(OrganizerProfileModel profile, Long actorId, boolean administrator) {
        var user = profile.getOrganizer();
        var current = currentDocuments(profile);
        boolean eligible = user.isActive() && user.isVerified() && user.getRole() == UserRole.USER;
        boolean pending = administrator && !actorId.equals(user.getId()) && profile.getStatus() == OrganizerProfileStatus.PENDING_REVIEW && !profile.isSuspended() && eligible;
        boolean suspend = administrator && !actorId.equals(user.getId()) && profile.getStatus() == OrganizerProfileStatus.APPROVED
                && !profile.isSuspended() && user.isActive() && user.getRole() == UserRole.ORGANIZER;
        boolean approve = false;
        if (pending) {
            try { validateBusiness(profile); validateDocuments(current); availableTaxId(profile); approve = true; }
            catch (OrganizerApplicationValidationException | ConflictException unavailable) { /* Capability only; mutations validate again under locks. */ }
        }
        return new OrganizerLifecycleContext(profile.getId(), profile.getStatus(), audit.revision(profile.getId()),
                profile.isSuspended(), profile.isSuspended() ? audit.suspensionReason(profile.getId()) : null,
                approve, pending, suspend, !administrator && eligible && correctable(profile) && !profile.isSuspended(),
                current.stream().map(OrganizerDocumentModel::getId).toList());
    }
    private List<OrganizerDocumentModel> currentDocuments(OrganizerProfileModel profile) {
        return documents.findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(profile.getId());
    }
    private void validateBusiness(OrganizerProfileModel p) {
        validate(new SubmitOrganizerApplicationRequest(p.getLegalName(), p.getBusinessType(), p.getTaxId(), p.getRepresentativeName(), p.getAddress(), p.getContactPhone(), p.getContactEmail()));
    }
    private void validateDocuments(List<OrganizerDocumentModel> current) {
        if (current.stream().noneMatch(d -> d.getDocumentType() == OrganizerDocumentType.BUSINESS_LICENSE)
                || current.stream().anyMatch(d -> d.getFileUrl() == null || d.getFileUrl().isBlank() || d.getStatus() == OrganizerDocumentStatus.REJECTED)
                || current.stream().map(OrganizerDocumentModel::getDocumentType).distinct().count() != current.size()) {
            throw new OrganizerApplicationValidationException(Map.of("documents", "Provide one valid current document per type, including a non-rejected business license"));
        }
    }
    private void availableTaxId(OrganizerProfileModel p) {
        if (profiles.existsByTaxIdAndStatusAndIdNot(p.getTaxId(), OrganizerProfileStatus.APPROVED, p.getId()))
            throw new ConflictException("This tax ID belongs to an approved Organizer");
    }
    private UserModel admin(Long actorId) {
        var user = users.findById(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!user.isActive() || user.getRole() != UserRole.ADMIN) throw new ForbiddenException("An active Administrator account is required");
        return user;
    }
    private void eligibleReader(UserModel user) {
        if (!user.isActive() || !user.isVerified() || (user.getRole() != UserRole.USER && user.getRole() != UserRole.ORGANIZER))
            throw new ForbiddenException("An active, email-verified applicant account is required");
    }
    private void requireApplicant(UserModel user) {
        eligibleReader(user);
        if (user.getRole() != UserRole.USER) throw new ConflictException("Applicant role is inconsistent with an unapproved application");
    }
    private void revision(OrganizerProfileModel p, Long expected) {
        if (expected == null || expected < 0) throw new BadRequestException("A nonnegative application revision is required");
        if (audit.revision(p.getId()) != expected) throw new ConflictException("Application changed. Reload the latest details before retrying");
    }
    private void positive(Long id) { if (id == null || id < 1) throw new BadRequestException("Application ID must be positive"); }
    private void owner(Long actorId, OrganizerProfileModel p) { if (!actorId.equals(p.getOrganizer().getId())) throw new ForbiddenException("This application belongs to another account"); }
    private boolean correctable(OrganizerProfileModel p) { return p.getStatus() == OrganizerProfileStatus.REJECTED || p.getStatus() == OrganizerProfileStatus.REVISION_REQUESTED; }
    private void requirePending(OrganizerProfileModel p) { if (p.getStatus() != OrganizerProfileStatus.PENDING_REVIEW || p.isSuspended()) throw new ConflictException("Only pending applications can be reviewed"); }
    private LocalDateTime now() { return LocalDateTime.now(organizerApplicationClock); }
    private State snapshot(OrganizerProfileModel p, List<OrganizerDocumentModel> current) {
        return new State(p.getStatus(), p.getOrganizer().getRole(), p.isSuspended(), p.getSubmittedAt(),
                current.stream().map(d -> new DocumentState(d.getId(), d.getStatus(), d.isCurrent())).toList());
    }
    private void validate(Object value) {
        if (value == null) throw new BadRequestException("Request is required");
        var errors = new LinkedHashMap<String, String>();
        validator.validate(value).forEach(v -> errors.putIfAbsent(v.getPropertyPath().toString(), v.getMessage()));
        if (!errors.isEmpty()) throw new OrganizerApplicationValidationException(errors);
    }
}
