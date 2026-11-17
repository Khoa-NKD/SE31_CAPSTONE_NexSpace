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
import jakarta.validation.groups.Default;
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
    private final org.springframework.context.ApplicationEventPublisher events;
    private final OrganizerContractService contracts;
    private static final Set<OrganizerDocumentType> CORRECTION_TYPES = Set.of(OrganizerDocumentType.BUSINESS_LICENSE,
            OrganizerDocumentType.ID_CARD_FRONT, OrganizerDocumentType.ID_CARD_BACK,
            OrganizerDocumentType.TAX_CERTIFICATE, OrganizerDocumentType.WORKSPACE_OVERVIEW, OrganizerDocumentType.OTHER);

    private record DocumentState(Long id, OrganizerDocumentStatus status, boolean current, String feedback) {}
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
        contracts.issue(profile);
        current.forEach(document -> document.setStatus(OrganizerDocumentStatus.VERIFIED));
        documents.saveAll(current);
        profile.setStatus(OrganizerProfileStatus.CONTRACT_PENDING);
        profile.setReviewedBy(actor); profile.setReviewedAt(now()); profile.setReviewFeedback(request.note());
        profiles.save(profile);
        audit.write(actor, profile.getId(), "Organizer.Approve", before, snapshot(profile, current), request.note());
        notifyReview(profile, List.of());
        return context(profile, actorId, true);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext reject(Long actorId, Long applicationId, Rejection request) {
        validate(request);
        if (!request.documentFeedbacks().isEmpty()) throw new BadRequestException("Final rejection accepts one general reason only");
        return decideReview(actorId, applicationId, request, false);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext requestChanges(Long actorId, Long applicationId, Rejection request) {
        validate(request);
        if (request.documentFeedbacks().isEmpty()) throw new BadRequestException("Select at least one current document and explain the required change");
        return decideReview(actorId, applicationId, request, true);
    }

    private OrganizerLifecycleContext decideReview(Long actorId, Long applicationId, Rejection request, boolean changesRequested) {
        var actor = admin(actorId); validate(request);
        var profile = lockAdminTarget(actorId, applicationId);
        if (changesRequested || !hasUncorrectableTaxIdConflict(profile)) requirePending(profile);
        requireApplicant(profile.getOrganizer()); revision(profile, request.revision());
        var current = currentDocuments(profile); var before = snapshot(profile, current);
        var currentIds = new HashSet<>(current.stream().map(OrganizerDocumentModel::getId).toList());
        var feedbacks = new HashMap<Long, String>();
        for (var feedback : request.documentFeedbacks()) {
            if (!currentIds.contains(feedback.documentId()) || feedbacks.putIfAbsent(feedback.documentId(), feedback.feedback()) != null)
                throw new BadRequestException("Feedback must reference unique current documents belonging to this application");
        }
        if (changesRequested && current.stream().anyMatch(document -> feedbacks.containsKey(document.getId()) && !CORRECTION_TYPES.contains(document.getDocumentType())))
            throw new BadRequestException("This document type cannot be replaced through applicant corrections");
        if (changesRequested) {
            // Rejected current versions must be replaced before the existing resubmission validator accepts them.
            current.forEach(document -> {
                document.setAdminFeedback(feedbacks.get(document.getId()));
                if (feedbacks.containsKey(document.getId())) document.setStatus(OrganizerDocumentStatus.REJECTED);
            });
            documents.saveAll(current);
        }
        profile.setStatus(changesRequested ? OrganizerProfileStatus.REVISION_REQUESTED : OrganizerProfileStatus.REJECTED); profile.setReviewedBy(actor);
        profile.setReviewedAt(now()); profile.setReviewFeedback(request.reason()); profiles.save(profile);
        // A profile rejection is not a document verification result and never changes the applicant's role.
        audit.write(actor, profile.getId(), changesRequested ? "Organizer.RequestChanges" : "Organizer.Reject", before, snapshot(profile, current), request.reason());
        notifyReview(profile, changesRequested ? current.stream().filter(d -> feedbacks.containsKey(d.getId()))
                .map(d -> new OrganizerReviewNotification.DocumentChange(d.getDocumentType(), feedbacks.get(d.getId()))).toList() : List.of());
        return context(profile, actorId, true);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext saveCorrection(Long actorId, Correction request) {
        validate(request);
        var profile = lockOwnerCorrection(actorId); revision(profile, request.revision());
        throw new ConflictException("Business information is locked after submission. Only administrator-requested document replacements are allowed");
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext correctDocument(Long actorId, Long expectedRevision, OrganizerDocumentType type,
            Long expectedCurrentDocumentId, MultipartFile file) {
        if (file == null) throw new BadRequestException("Choose a replacement document");
        return changeDocuments(actorId, null, expectedRevision, type, expectedCurrentDocumentId, List.of(file), false);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext appendPages(Long actorId, Long applicationId, Long revision,
            OrganizerDocumentType type, List<MultipartFile> files) {
        return changeDocuments(actorId, applicationId, revision, type, null, files, true);
    }

    private OrganizerLifecycleContext changeDocuments(Long actorId, Long applicationId, Long expectedRevision, OrganizerDocumentType type,
            Long expectedCurrentDocumentId, List<MultipartFile> files, boolean append) {
        var profile = lockOwnerDocumentEditing(actorId);
        if (append && !profile.getId().equals(applicationId))
            throw new ConflictException("The current application changed. Reload before adding files");
        revision(profile, expectedRevision);
        if (type == null || !CORRECTION_TYPES.contains(type)) throw new BadRequestException("Unsupported correction document type");
        var current = currentDocuments(profile);
        var matching = current.stream().filter(document -> document.getDocumentType() == type).toList();
        var old = expectedCurrentDocumentId == null ? null : matching.stream()
                .filter(document -> expectedCurrentDocumentId.equals(document.getId())).findFirst()
                .orElseThrow(() -> new ConflictException("The selected page changed. Reload before replacing it"));
        if (files.isEmpty() || files.stream().anyMatch(Objects::isNull)) throw new BadRequestException("Choose a document");
        if (append && (!OrganizerDocumentRequirements.allowsPages(type) || matching.size() + files.size() > 10))
            throw new BadRequestException("This document type does not accept additional pages or would exceed 10 files");
        if (!append && old == null && !matching.isEmpty())
            throw new ConflictException("A current document already exists. Choose a file to replace or add pages");
        if (OrganizerDocumentRequirements.allowsPages(type)) {
            long remaining = matching.size() - (old == null ? 0 : 1);
            boolean existingPdf = matching.stream().filter(document -> document != old)
                    .anyMatch(document -> document.getFileName() != null && document.getFileName().toLowerCase(Locale.ROOT).endsWith(".pdf"));
            boolean incomingPdf = files.stream().anyMatch(file -> "application/pdf".equals(file.getContentType()));
            if (remaining + files.size() > 1 && (existingPdf || incomingPdf))
                throw new BadRequestException("Upload multiple images or a single PDF for each document type");
        }
        if (profile.getStatus() == OrganizerProfileStatus.REVISION_REQUESTED
                && (append ? matching.stream().noneMatch(d -> d.getStatus() == OrganizerDocumentStatus.REJECTED)
                    : old == null || old.getStatus() != OrganizerDocumentStatus.REJECTED))
            throw new ConflictException("Only documents explicitly requested for replacement can be changed");
        var before = snapshot(profile, current);
        if (old != null) { old.setCurrent(false); old.setStatus(OrganizerDocumentStatus.REPLACED); documents.save(old); }
        for (var file : files) storePage(profile, type, file, old);
        audit.write(profile.getOrganizer(), profile.getId(), "Organizer.CorrectDocument", before,
                snapshot(profile, currentDocuments(profile)), old == null ? "Added document files" : "Replaced a current file");
        return context(profile, actorId, false);
    }

    private void storePage(OrganizerProfileModel profile, OrganizerDocumentType type, MultipartFile file, OrganizerDocumentModel old) {
        PrivateOrganizerDocumentStorage.requireSupportedFormat(type, file);
        var stored = type == OrganizerDocumentType.ID_CARD_FRONT || type == OrganizerDocumentType.ID_CARD_BACK
                ? storage.store(file, profile.getId(), type) : storage.store(file, profile.getId());
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                if (old != null) {
                    try { storage.delete(new PrivateOrganizerDocumentStorage.StoredDocument(old.getFileUrl(), old.getFileName())); }
                    catch (RuntimeException ex) { log.error("Replaced organizer document cleanup pending for document {}", old.getId()); }
                }
            }
            @Override public void afterCompletion(int status) {
                if (status == STATUS_ROLLED_BACK) {
                    try { storage.delete(stored); } catch (RuntimeException ex) { log.error("Could not compensate a rolled-back correction upload"); }
                }
            }
        });
        var replacement = new OrganizerDocumentModel(); replacement.setOrganizerProfile(profile);
        replacement.setDocumentType(type); replacement.setFileUrl(stored.key()); replacement.setFileName(stored.originalName());
        documents.saveAndFlush(replacement);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext deleteDraftDocument(Long actorId, Long expectedRevision, Long documentId) {
        var profile = lockOwnerDocumentEditing(actorId);
        if (profile.getStatus() != OrganizerProfileStatus.DRAFT) throw new ConflictException("Only draft files can be deleted");
        revision(profile, expectedRevision);
        var current = currentDocuments(profile);
        var document = current.stream().filter(d -> d.getId().equals(documentId)).findFirst()
                .orElseThrow(() -> new NotFoundException("Current verification document not found"));
        var before = snapshot(profile, current);
        documents.delete(document);
        documents.flush();
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override public void afterCommit() {
                try { storage.delete(new PrivateOrganizerDocumentStorage.StoredDocument(document.getFileUrl(), document.getFileName())); }
                catch (RuntimeException ex) { log.error("Draft file cleanup pending for document {}", documentId); }
            }
        });
        audit.write(profile.getOrganizer(), profile.getId(), "Organizer.DeleteDraftDocument", before,
                snapshot(profile, currentDocuments(profile)), null);
        return context(profile, actorId, false);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerLifecycleContext resubmit(Long actorId, Revision request) {
        validate(request);
        var profile = lockOwnerCorrection(actorId); revision(profile, request.revision());
        validateBusiness(profile, Default.class, SubmitOrganizerApplicationRequest.Submission.class);
        var current = currentDocuments(profile); validateDocuments(current);
        var documentErrors = OrganizerDocumentRequirements.errors(profile.getBusinessType(), current, false);
        if (!documentErrors.isEmpty()) throw new OrganizerApplicationValidationException(documentErrors);
        availableTaxId(profile);
        var before = snapshot(profile, current);
        profile.setStatus(OrganizerProfileStatus.PENDING_REVIEW); profile.setSubmittedAt(now());
        profile.setReviewedAt(null); profile.setReviewedBy(null); profile.setReviewFeedback(null); profiles.save(profile);
        // Previous decisions/reasons remain in audit; pending review does not display an obsolete decision as current.
        audit.write(profile.getOrganizer(), profile.getId(), "Organizer.Resubmit", before, snapshot(profile, current), null);
        return context(profile, actorId, false);
    }

    private void notifyReview(OrganizerProfileModel profile, List<OrganizerReviewNotification.DocumentChange> changes) {
        var owner = profile.getOrganizer();
        String name = owner.getFullName();
        events.publishEvent(new OrganizerReviewNotification(profile.getId(), owner.getEmail(),
                name == null || name.isBlank() ? owner.getUserName() : name, profile.getLegalName(),
                profile.getStatus(), profile.getReviewFeedback(), changes));
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

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    public void checkIdentityPhoto(Long actorId, Long applicationId, OrganizerDocumentType type, MultipartFile file) {
        var user = users.findById(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        requireApplicant(user);
        var profile = profiles.findByOrganizerId(actorId).orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        owner(actorId, profile);
        if (!profile.getId().equals(applicationId))
            throw new ConflictException("The current application changed. Reload before adding files");
        if (profile.getStatus() != OrganizerProfileStatus.DRAFT &&
                !(correctable(profile) && currentDocuments(profile).stream().anyMatch(document ->
                        document.getDocumentType() == type && document.getStatus() == OrganizerDocumentStatus.REJECTED)))
            throw new ConflictException("This application does not allow the requested edit");
        storage.checkIdentityPhoto(file, type);
    }

    private OrganizerProfileModel lockOwnerCorrection(Long actorId) {
        return lockOwnerEditable(actorId, false);
    }

    private OrganizerProfileModel lockOwnerDocumentEditing(Long actorId) {
        return lockOwnerEditable(actorId, true);
    }

    private OrganizerProfileModel lockOwnerEditable(Long actorId, boolean allowDraftDocuments) {
        var user = users.findByIdForApplication(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        requireApplicant(user);
        var profile = profiles.findByOrganizerIdForUpdate(actorId).orElseThrow(() -> new NotFoundException("Organizer profile not found"));
        owner(actorId, profile);
        if ((!correctable(profile)
                && !(allowDraftDocuments && profile.getStatus() == OrganizerProfileStatus.DRAFT)))
            throw new ConflictException("This application does not allow the requested edit");
        return profile;
    }

    private OrganizerLifecycleContext context(OrganizerProfileModel profile, Long actorId, boolean administrator) {
        var user = profile.getOrganizer();
        var current = currentDocuments(profile);
        boolean eligible = user.isActive() && user.isVerified() && user.getRole() == UserRole.USER;
        boolean pending = administrator && !actorId.equals(user.getId()) && profile.getStatus() == OrganizerProfileStatus.PENDING_REVIEW && eligible;
        boolean suspend = false;
        boolean approve = false;
        if (pending) {
            try { validateBusiness(profile); validateDocuments(current); availableTaxId(profile); approve = true; }
            catch (OrganizerApplicationValidationException | ConflictException unavailable) { /* Capability only; mutations validate again under locks. */ }
        }
        return new OrganizerLifecycleContext(profile.getId(), profile.getStatus(), audit.revision(profile.getId()),
                false, null,
                approve, pending || (administrator && !actorId.equals(user.getId()) && eligible
                        && hasUncorrectableTaxIdConflict(profile)), suspend,
                !administrator && eligible && correctable(profile),
                current.stream().map(OrganizerDocumentModel::getId).toList());
    }
    private List<OrganizerDocumentModel> currentDocuments(OrganizerProfileModel profile) {
        return documents.findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(profile.getId());
    }
    private void validateBusiness(OrganizerProfileModel p, Class<?>... groups) {
        validate(new SubmitOrganizerApplicationRequest(p.getLegalName(), p.getBusinessType(), p.getTaxId(), p.getRepresentativeName(), p.getAddress(), p.getContactPhone(), p.getContactEmail(), p.getRegistrationReason()), groups);
    }
    private void validateDocuments(List<OrganizerDocumentModel> current) {
        if (current.stream().noneMatch(d -> d.getDocumentType() == OrganizerDocumentType.BUSINESS_LICENSE)
                || current.stream().anyMatch(d -> d.getFileUrl() == null || d.getFileUrl().isBlank() || d.getStatus() == OrganizerDocumentStatus.REJECTED)
                || OrganizerDocumentRequirements.hasDuplicateSingleFileTypes(current)) {
            throw new OrganizerApplicationValidationException(Map.of("documents", "Provide valid current files, including a non-rejected business license"));
        }
    }
    private void availableTaxId(OrganizerProfileModel p) {
        if (hasReservedTaxId(p))
            throw new ConflictException("This tax ID belongs to an approved or contract-pending Organizer");
    }

    private boolean hasUncorrectableTaxIdConflict(OrganizerProfileModel profile) {
        return profile.getStatus() == OrganizerProfileStatus.REVISION_REQUESTED && hasReservedTaxId(profile);
    }

    private boolean hasReservedTaxId(OrganizerProfileModel profile) {
        return profiles.existsByTaxIdAndStatusInAndIdNot(profile.getTaxId(),
                OrganizerApplicationService.TAX_ID_RESERVING_STATUSES, profile.getId());
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
    private boolean correctable(OrganizerProfileModel p) { return p.getStatus() == OrganizerProfileStatus.REVISION_REQUESTED; }
    private void requirePending(OrganizerProfileModel p) { if (p.getStatus() != OrganizerProfileStatus.PENDING_REVIEW) throw new ConflictException("Only pending applications can be reviewed"); }
    private LocalDateTime now() { return LocalDateTime.now(organizerApplicationClock); }
    private State snapshot(OrganizerProfileModel p, List<OrganizerDocumentModel> current) {
        return new State(p.getStatus(), p.getOrganizer().getRole(), p.isSuspended(), p.getSubmittedAt(),
                current.stream().map(d -> new DocumentState(d.getId(), d.getStatus(), d.isCurrent(), d.getAdminFeedback())).toList());
    }
    private void validate(Object value, Class<?>... groups) {
        if (value == null) throw new BadRequestException("Request is required");
        var errors = new LinkedHashMap<String, String>();
        validator.validate(value, groups).forEach(v -> errors.putIfAbsent(v.getPropertyPath().toString(), v.getMessage()));
        if (!errors.isEmpty()) throw new OrganizerApplicationValidationException(errors);
    }
}
