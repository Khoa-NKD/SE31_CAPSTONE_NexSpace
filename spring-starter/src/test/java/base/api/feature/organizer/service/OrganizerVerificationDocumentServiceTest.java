package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerDocumentStatus;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.exception.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

class OrganizerVerificationDocumentServiceTest {
    @TempDir Path directory;
    private IUserRepository users;
    private IOrganizerProfileRepository profiles;
    private IOrganizerDocumentRepository documents;
    private OrganizerVerificationDocumentService service;
    private UserModel user;
    private OrganizerProfileModel profile;

    @BeforeEach
    void setUp() {
        users = mock(IUserRepository.class);
        profiles = mock(IOrganizerProfileRepository.class);
        documents = mock(IOrganizerDocumentRepository.class);
        var target = new OrganizerVerificationDocumentService(users, profiles, documents,
                new PrivateOrganizerDocumentStorage(directory.toString()));
        var manager = new AbstractPlatformTransactionManager() {
            protected Object doGetTransaction() { return new Object(); }
            protected void doBegin(Object tx, TransactionDefinition definition) { }
            protected void doCommit(DefaultTransactionStatus status) { }
            protected void doRollback(DefaultTransactionStatus status) { }
        };
        var proxy = new ProxyFactory(target);
        proxy.addAdvice(new TransactionInterceptor(manager, new AnnotationTransactionAttributeSource()));
        service = (OrganizerVerificationDocumentService) proxy.getProxy();
        user = new UserModel();
        user.setId(7L);
        user.setVerified(true);
        user.setRoleEntity(new RoleModel("USER", null));
        profile = new OrganizerProfileModel();
        profile.setId(42L);
        profile.setOrganizer(user);
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.of(profile));
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.of(profile));
        when(documents.saveAndFlush(any())).thenAnswer(invocation -> {
            OrganizerDocumentModel document = invocation.getArgument(0);
            document.setId(101L);
            document.setCreatedAt(LocalDateTime.of(2026, 11, 4, 8, 0));
            return document;
        });
    }

    private MockMultipartFile file() { return OrganizerApplicationServiceTest.license(); }

    @ParameterizedTest
    @EnumSource(value = OrganizerDocumentType.class, names = "BANK_CERTIFICATE", mode = EnumSource.Mode.EXCLUDE)
    void uploadsSupportedTypesAsNewPendingMetadataAndPrivateFiles(OrganizerDocumentType type) throws Exception {
        var result = service.upload(7L, type, file());
        var captured = org.mockito.ArgumentCaptor.forClass(OrganizerDocumentModel.class);
        verify(documents).saveAndFlush(captured.capture());
        var saved = captured.getValue();
        assertThat(result.id()).isEqualTo(101L);
        assertThat(result.documentType()).isEqualTo(type);
        assertThat(result.status()).isEqualTo(OrganizerDocumentStatus.PENDING);
        assertThat(result.uploadedAt()).isEqualTo(LocalDateTime.of(2026, 11, 4, 8, 0));
        assertThat(saved.isCurrent()).isTrue();
        assertThat(saved.getOrganizerProfile()).isSameAs(profile);
        assertThat(saved.getFileName()).isEqualTo(file().getOriginalFilename());
        assertThat(saved.getFileUrl()).matches("[a-f0-9-]+\\.pdf").doesNotContain(directory.toString());
        assertThat(Files.readAllBytes(directory.resolve(saved.getFileUrl()))).isEqualTo(file().getBytes());
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.DRAFT);
        assertThat(user.getRole().name()).isEqualTo("USER");
        verify(profiles).findByOrganizerIdForUpdate(7L);
        verify(profiles, never()).save(any());
    }

    @Test
    void organizerCanAddEvidenceForARevisionRequestedProfileWithoutResubmission() {
        user.setRoleEntity(new RoleModel("ORGANIZER", null));
        profile.setStatus(OrganizerProfileStatus.REVISION_REQUESTED);
        service.upload(7L, OrganizerDocumentType.OTHER, file());
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.REVISION_REQUESTED);
    }

    @ParameterizedTest
    @EnumSource(value = OrganizerProfileStatus.class, names = {"DRAFT", "REVISION_REQUESTED"}, mode = EnumSource.Mode.EXCLUDE)
    void lockedStatesRemainReadableButCannotAcceptUploads(OrganizerProfileStatus status) throws Exception {
        profile.setStatus(status);
        assertThat(service.listCurrentDocuments(7L).uploadAllowed()).isFalse();
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.OTHER, file())).isInstanceOf(ConflictException.class);
        verify(documents, never()).saveAndFlush(any());
        assertDirectoryEmpty();
    }

    @Test
    void duplicateCurrentTypePreservesExistingMetadataAndFiles() throws Exception {
        Path existingFile = directory.resolve("old-document.pdf");
        Files.writeString(existingFile, "Existing document content");
        when(documents.findFirstByOrganizerProfileIdAndDocumentTypeAndCurrentTrueOrderByIdDesc(42L, OrganizerDocumentType.BUSINESS_LICENSE))
                .thenReturn(Optional.of(new OrganizerDocumentModel()));
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.BUSINESS_LICENSE, file())).isInstanceOf(ConflictException.class);
        verify(documents, never()).saveAndFlush(any());
        assertThat(Files.readString(existingFile)).isEqualTo("Existing document content");
        try (var files = Files.list(directory)) { assertThat(files.toList()).containsExactly(existingFile); }
    }

    @Test
    void unsupportedBankCertificateIsRejectedBeforeStorage() throws Exception {
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.BANK_CERTIFICATE, file())).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.upload(7L, null, file())).isInstanceOf(BadRequestException.class);
        verify(documents, never()).saveAndFlush(any());
        assertDirectoryEmpty();
    }

    @Test
    void foreignProfileCannotBeReadOrWritten() throws Exception {
        var other = new UserModel(); other.setId(8L); profile.setOrganizer(other);
        assertThatThrownBy(() -> service.listCurrentDocuments(7L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.OTHER, file())).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(documents);
        assertDirectoryEmpty();
    }

    @Test
    void missingProfileDoesNotCreateAnApplication() {
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.empty());
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.listCurrentDocuments(7L)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.OTHER, file())).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(documents);
    }

    @Test
    void rejectsMissingInactiveUnverifiedAndAdministratorAccounts() {
        when(users.findById(7L)).thenReturn(Optional.empty());
        assertBothDenied(UnauthorizedException.class);
        when(users.findById(7L)).thenReturn(Optional.of(user));
        user.setVerified(false); assertBothDenied(ForbiddenException.class);
        user.setVerified(true); user.setStatus(UserStatus.LOCKED); assertBothDenied(ForbiddenException.class);
        user.setStatus(UserStatus.ACTIVE); user.setRoleEntity(new RoleModel("ADMIN", null)); assertBothDenied(ForbiddenException.class);
        verifyNoInteractions(profiles, documents);
    }

    @Test
    void metadataFailureRollsBackAndDeletesOnlyTheNewFile() throws Exception {
        Path old = directory.resolve("old.pdf"); Files.writeString(old, "Existing document");
        doThrow(new IllegalStateException("Simulated metadata failure")).when(documents).saveAndFlush(any());
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.OTHER, file())).hasMessage("Simulated metadata failure");
        try (var files = Files.list(directory)) { assertThat(files.toList()).containsExactly(old); }
    }

    @Test
    void invalidFileDoesNotPersistMetadata() {
        var invalid = new MockMultipartFile("file", "fake.pdf", "application/pdf", "invalid".getBytes());
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.OTHER, invalid)).isInstanceOf(BadRequestException.class);
        verify(documents, never()).saveAndFlush(any());
    }

    @Test
    void storageFailureDoesNotPersistMetadataOrAlterExistingFiles() throws Exception {
        Path blocked = directory.resolve("blocked");
        Files.writeString(blocked, "Existing content");
        var failingStorageService = new OrganizerVerificationDocumentService(users, profiles, documents,
                new PrivateOrganizerDocumentStorage(blocked.toString()));
        assertThatThrownBy(() -> failingStorageService.upload(7L, OrganizerDocumentType.OTHER, file()))
                .isInstanceOf(IllegalStateException.class).hasMessage("Could not store verification document");
        verify(documents, never()).saveAndFlush(any());
        assertThat(Files.readString(blocked)).isEqualTo("Existing content");
    }

    @Test
    void listsOnlyCurrentMetadataWithoutPrivateKeysOrFeedbackInTheDto() {
        var document = new OrganizerDocumentModel();
        document.setId(3L); document.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE);
        document.setFileName("license.pdf"); document.setFileUrl("private-key.pdf");
        when(documents.findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(42L)).thenReturn(List.of(document));
        var result = service.listCurrentDocuments(7L);
        assertThat(result.uploadAllowed()).isTrue();
        assertThat(result.profileId()).isEqualTo(42L);
        assertThat(result.supportedDocumentTypes()).doesNotContain(OrganizerDocumentType.BANK_CERTIFICATE).hasSize(5);
        assertThat(result.documents()).singleElement().satisfies(item -> assertThat(item.fileName()).isEqualTo("license.pdf"));
        verify(documents).findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(42L);
    }

    private void assertBothDenied(Class<? extends Exception> errorType) {
        assertThatThrownBy(() -> service.listCurrentDocuments(7L)).isInstanceOf(errorType);
        assertThatThrownBy(() -> service.upload(7L, OrganizerDocumentType.OTHER, file())).isInstanceOf(errorType);
    }

    private void assertDirectoryEmpty() throws Exception {
        try (var files = Files.list(directory)) { assertThat(files).isEmpty(); }
    }
}
