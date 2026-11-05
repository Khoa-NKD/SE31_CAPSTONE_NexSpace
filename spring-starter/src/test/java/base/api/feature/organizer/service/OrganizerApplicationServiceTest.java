package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.*;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OrganizerApplicationServiceTest {
    @TempDir Path directory;
    IUserRepository users;
    IOrganizerProfileRepository profiles;
    IOrganizerDocumentRepository documents;
    OrganizerApplicationService service;
    UserModel user;
    TransactionTemplate transaction;
    static final SubmitOrganizerApplicationRequest REQUEST = new SubmitOrganizerApplicationRequest(
            " Example Company ", BusinessType.LIMITED_LIABILITY, " TAX-123 ", " Representative ",
            " Business address ", "+84901234567", " contact@example.com ", " Offer flexible workspaces to local businesses. ");

    @BeforeEach
    void setUp() {
        users = mock(IUserRepository.class);
        profiles = mock(IOrganizerProfileRepository.class);
        documents = mock(IOrganizerDocumentRepository.class);
        service = new OrganizerApplicationService(users, profiles, documents,
                new PrivateOrganizerDocumentStorage(directory.toString()),
                Clock.fixed(Instant.parse("2026-11-03T01:00:00Z"), ZoneOffset.UTC),
                jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator());
        user = new UserModel();
        user.setId(7L);
        user.setVerified(true);
        user.setRoleEntity(new RoleModel("USER", null));
        when(users.findByIdForApplication(7L)).thenReturn(Optional.of(user));
        transaction = new TransactionTemplate(new AbstractPlatformTransactionManager() {
            protected Object doGetTransaction() { return new Object(); }
            protected void doBegin(Object tx, TransactionDefinition definition) {}
            protected void doCommit(DefaultTransactionStatus status) {}
            protected void doRollback(DefaultTransactionStatus status) {}
        });
    }

    static MockMultipartFile license() {
        return new MockMultipartFile("businessLicense", "license.pdf", "application/pdf",
                "%PDF-1.4\n1 0 obj\n<<>>\nendobj\n%%EOF".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
    }

    @Test
    void savesPendingProfileAndPrivateDocumentWithoutGrantingRole() throws Exception {
        when(profiles.saveAndFlush(any())).thenAnswer(invocation -> {
            OrganizerProfileModel profile = invocation.getArgument(0);
            profile.setId(42L);
            assertThat(profile.getLegalName()).isEqualTo("Example Company");
            assertThat(profile.getTaxId()).isEqualTo("TAX-123");
            assertThat(profile.getOrganizer()).isSameAs(user);
            return profile;
        });
        var receipt = transaction.execute(status -> service.submit(7L, REQUEST, license()));
        assertThat(receipt.id()).isEqualTo(42L);
        assertThat(receipt.status()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
        assertThat(receipt.submittedAt()).isEqualTo(LocalDateTime.of(2026, 11, 3, 1, 0));
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        var captured = org.mockito.ArgumentCaptor.forClass(OrganizerDocumentModel.class);
        verify(documents).saveAndFlush(captured.capture());
        assertThat(captured.getValue().getDocumentType()).isEqualTo(OrganizerDocumentType.BUSINESS_LICENSE);
        assertThat(captured.getValue().getStatus()).isEqualTo(OrganizerDocumentStatus.PENDING);
        assertThat(captured.getValue().getFileUrl()).doesNotContain(directory.toString(), "license.pdf");
        assertThat(Files.readAllBytes(directory.resolve(captured.getValue().getFileUrl()))).isEqualTo(license().getBytes());
    }

    @ParameterizedTest
    @EnumSource(value = OrganizerProfileStatus.class, names = "DRAFT", mode = EnumSource.Mode.EXCLUDE)
    void rejectsSubmittedProfilesWithoutReplacingFiles(OrganizerProfileStatus existingStatus) {
        var existing = new OrganizerProfileModel();
        existing.setOrganizer(user);
        existing.setStatus(existingStatus);
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.of(existing));
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, REQUEST, license())))
                .isInstanceOf(ConflictException.class);
        verifyNoInteractions(documents);
    }

    @Test
    void rejectsApprovedTaxId() {
        when(profiles.findByTaxIdAndStatus("TAX-123", OrganizerProfileStatus.APPROVED))
                .thenReturn(Optional.of(new OrganizerProfileModel()));
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, REQUEST, license())))
                .isInstanceOf(ConflictException.class);
    }

    @Test
    void rejectsUnverifiedLockedAndAdministratorAccounts() {
        user.setVerified(false);
        assertForbidden();
        user.setVerified(true);
        user.setStatus(UserStatus.LOCKED);
        assertForbidden();
        user.setStatus(UserStatus.ACTIVE);
        user.setRoleEntity(new RoleModel("ADMIN", null));
        assertForbidden();
        verifyNoInteractions(profiles, documents);
    }

    void assertForbidden() {
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, REQUEST, license())))
                .isInstanceOf(ForbiddenException.class);
    }

    @Test
    void rejectsMissingAuthenticatedAccount() {
        when(users.findByIdForApplication(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, REQUEST, license())))
                .isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void removesFileWhenPersistenceFailsAndTransactionRollsBack() throws Exception {
        when(documents.saveAndFlush(any())).thenThrow(new IllegalStateException("Simulated database failure"));
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, REQUEST, license())))
                .hasMessage("Simulated database failure");
        try (var files = Files.list(directory)) { assertThat(files).isEmpty(); }
    }

    OrganizerProfileModel draft() {
        var profile = new OrganizerProfileModel();
        profile.setId(42L);
        profile.setOrganizer(user);
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.of(profile));
        return profile;
    }

    base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest draftRequest() {
        return new base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest(REQUEST.legalName(), REQUEST.businessType(),
                REQUEST.taxId(), REQUEST.representativeName(), REQUEST.address(), REQUEST.contactPhone(), REQUEST.contactEmail(), REQUEST.registrationReason());
    }

    OrganizerDocumentModel currentLicense() {
        var document = new OrganizerDocumentModel();
        document.setFileUrl("existing-private-reference.pdf");
        document.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE);
        when(documents.findFirstByOrganizerProfileIdAndDocumentTypeAndCurrentTrueOrderByIdDesc(42L, OrganizerDocumentType.BUSINESS_LICENSE))
                .thenReturn(Optional.of(document));
        when(documents.findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(42L)).thenReturn(java.util.List.of(document));
        return document;
    }

    @Test
    void startsEmptyDraftAndRepeatedStartReturnsTheSameProfileWithoutSubmitting() {
        when(profiles.saveAndFlush(any())).thenAnswer(invocation -> {
            OrganizerProfileModel profile = invocation.getArgument(0); profile.setId(42L); return profile;
        });
        var created = transaction.execute(status -> service.startDraft(7L));
        assertThat(created.id()).isEqualTo(42L);
        assertThat(created.status()).isEqualTo(OrganizerProfileStatus.DRAFT);
        assertThat(created.submittedAt()).isNull();
        var profile = draft();
        var repeated = transaction.execute(status -> service.startDraft(7L));
        assertThat(repeated.id()).isEqualTo(profile.getId());
        verify(profiles, times(1)).saveAndFlush(any());
        verifyNoInteractions(documents);
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
    }

    @Test
    void partialDraftCanBeSavedAndBlankFieldsClearedWithoutSubmitting() {
        var profile = draft();
        profile.setLegalName("Old name");
        var partial = new base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest(" ", null, null, null, " Address ", "", "");
        var saved = transaction.execute(status -> service.saveDraft(7L, partial));
        assertThat(saved.legalName()).isNull();
        assertThat(saved.address()).isEqualTo("Address");
        assertThat(saved.contactEmail()).isNull();
        assertThat(saved.status()).isEqualTo(OrganizerProfileStatus.DRAFT);
        assertThat(saved.submittedAt()).isNull();
        verifyNoInteractions(documents);
    }

    @Test
    void invalidSuppliedDraftFieldsAreRejectedBeforeChangingExistingValues() {
        var profile = draft();
        profile.setLegalName("Keep this");
        var invalid = new base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest("Changed", null, null, null, "x".repeat(501), "abc", "bad-email");
        assertThatThrownBy(() -> transaction.execute(status -> service.saveDraft(7L, invalid)))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, ex ->
                        assertThat(ex.getErrors()).containsKeys("address", "contactPhone", "contactEmail"));
        assertThat(profile.getLegalName()).isEqualTo("Keep this");
        verify(profiles, never()).saveAndFlush(any());
    }

    @Test
    void finalSubmissionRejectsIncompletePersistedDraftWithFieldErrorsAndKeepsDraft() {
        var profile = draft();
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L)))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, ex ->
                        assertThat(ex.getErrors()).containsKeys("legalName", "businessType", "taxId", "representativeName", "address", "contactPhone", "contactEmail", "businessLicense"));
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.DRAFT);
        assertThat(profile.getSubmittedAt()).isNull();
        verify(profiles, never()).saveAndFlush(any());
    }

    @Test
    void completeDraftIsSubmittedUsingExistingLicenseExactlyOnceWithoutReupload() {
        var profile = draft();
        transaction.execute(status -> service.saveDraft(7L, draftRequest()));
        assertThat(profile.getRegistrationReason()).isEqualTo(REQUEST.registrationReason());
        currentLicense();
        var result = transaction.execute(status -> service.submitDraft(7L));
        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.status()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
        assertThat(result.submittedAt()).isEqualTo(LocalDateTime.of(2026, 11, 3, 1, 0));
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L))).isInstanceOf(ConflictException.class);
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
        verify(documents, never()).saveAndFlush(any());
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
    }

    @Test
    void blankReasonCanBeSavedButCannotBeSubmittedAndDoesNotChangeDraftState() {
        var profile = draft();
        var request = new base.api.feature.organizer.dto.request.SaveOrganizerDraftRequest(REQUEST.legalName(), REQUEST.businessType(),
                REQUEST.taxId(), REQUEST.representativeName(), REQUEST.address(), REQUEST.contactPhone(), REQUEST.contactEmail(), "  ");
        var saved = transaction.execute(status -> service.saveDraft(7L, request));
        assertThat(saved.registrationReason()).isNull();
        currentLicense();
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L)))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, failure ->
                        assertThat(failure.getErrors()).containsKey("registrationReason"));
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.DRAFT);
        assertThat(profile.getSubmittedAt()).isNull();
    }

    @Test
    void rejectedCurrentLicenseCannotBeUsedForSubmission() {
        var profile = draft();
        transaction.execute(status -> service.saveDraft(7L, draftRequest()));
        currentLicense().setStatus(OrganizerDocumentStatus.REJECTED);
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L)))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, ex -> assertThat(ex.getErrors()).containsKey("businessLicense"));
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.DRAFT);
    }

    @Test
    void legacyMultipartCanReuseDraftLicenseButCannotReplaceIt() {
        var profile = draft();
        currentLicense();
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, REQUEST, license())))
                .isInstanceOf(ConflictException.class);
        var result = transaction.execute(status -> service.submit(7L, REQUEST, null));
        assertThat(result.id()).isEqualTo(42L);
        assertThat(profile.getLegalName()).isEqualTo("Example Company");
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
        verify(documents, never()).saveAndFlush(any());
    }

    @Test
    void legacyMultipartCanAddLicenseToAnExistingDraft() {
        var profile = draft();
        var result = transaction.execute(status -> service.submit(7L, REQUEST, license()));
        assertThat(result.id()).isEqualTo(profile.getId());
        verify(documents).saveAndFlush(any());
    }

    @Test
    void householdDraftAndMultipartCannotBypassIdentityDocumentRequirements() {
        var profile = draft();
        transaction.execute(status -> service.saveDraft(7L, draftRequest()));
        profile.setBusinessType(BusinessType.HOUSEHOLD_BUSINESS);
        currentLicense();
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L)))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, error -> assertThat(error.getErrors())
                        .containsKeys("documents.ID_CARD_FRONT", "documents.ID_CARD_BACK"));
        var household = new SubmitOrganizerApplicationRequest(REQUEST.legalName(), BusinessType.HOUSEHOLD_BUSINESS,
                REQUEST.taxId(), REQUEST.representativeName(), REQUEST.address(), REQUEST.contactPhone(), REQUEST.contactEmail(), REQUEST.registrationReason());
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, household, null)))
                .isInstanceOf(OrganizerApplicationValidationException.class);
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.DRAFT);
    }

    @Test
    void legacyMissingLicenseIsStillRejectedBeforeCreatingProfile() {
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, REQUEST, null)))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, ex -> assertThat(ex.getErrors()).containsKey("businessLicense"));
        verify(profiles, never()).saveAndFlush(any());
    }

    @ParameterizedTest
    @EnumSource(value = OrganizerProfileStatus.class, names = "DRAFT", mode = EnumSource.Mode.EXCLUDE)
    void draftCommandsRejectAllNonDraftStates(OrganizerProfileStatus state) {
        var profile = draft(); profile.setStatus(state);
        assertThatThrownBy(() -> transaction.execute(status -> service.startDraft(7L))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> transaction.execute(status -> service.saveDraft(7L, draftRequest()))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L))).isInstanceOf(ConflictException.class);
        assertThat(profile.getStatus()).isEqualTo(state);
        verifyNoInteractions(documents);
        verify(profiles, never()).saveAndFlush(any());
    }

    @Test
    void rejectsForeignProfileAndMissingDraft() {
        var profile = draft();
        var other = new UserModel(); other.setId(999L); profile.setOrganizer(other);
        assertThatThrownBy(() -> transaction.execute(status -> service.saveDraft(7L, draftRequest()))).isInstanceOf(ForbiddenException.class);
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L))).isInstanceOf(base.api.shared.exception.NotFoundException.class);
    }

    @Test
    void draftSubmissionStillRejectsApprovedTaxId() {
        var profile = draft();
        transaction.execute(status -> service.saveDraft(7L, draftRequest()));
        currentLicense();
        when(profiles.findByTaxIdAndStatus(REQUEST.taxId(), OrganizerProfileStatus.APPROVED)).thenReturn(Optional.of(new OrganizerProfileModel()));
        assertThatThrownBy(() -> transaction.execute(status -> service.submitDraft(7L))).isInstanceOf(ConflictException.class);
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.DRAFT);
    }
}
