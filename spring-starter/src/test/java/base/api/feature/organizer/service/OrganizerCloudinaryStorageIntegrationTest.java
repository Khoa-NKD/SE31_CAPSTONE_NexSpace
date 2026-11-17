package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.workspace.service.impl.CloudinaryStorageServiceImpl;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;
import org.springframework.transaction.support.TransactionTemplate;

import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Clock;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

/** Tests service/storage composition with mocked Cloudinary and repositories, never live remote services. */
class OrganizerCloudinaryStorageIntegrationTest {
    @TempDir Path directory;
    private CloudinaryStorageServiceImpl cloudinary;
    private PrivateOrganizerDocumentStorage storage;
    private IUserRepository users;
    private IOrganizerProfileRepository profiles;
    private IOrganizerDocumentRepository documents;
    private UserModel user;
    private TransactionTemplate transaction;
    private static final String REFERENCE = "cloudinary:authenticated:raw:nexspace/organizer-verification/12345678-1234-4234-8234-123456789abc.pdf";

    @BeforeEach
    void setUp() {
        cloudinary = mock(CloudinaryStorageServiceImpl.class);
        when(cloudinary.isCloudinaryConfigured()).thenReturn(true);
        when(cloudinary.uploadPrivateDocument(any(), anyString())).thenReturn(REFERENCE);
        when(cloudinary.uploadPrivateDocument(any(), anyString(), anyLong())).thenReturn(REFERENCE);
        storage = new PrivateOrganizerDocumentStorage(directory.toString(), cloudinary, true);
        users = mock(IUserRepository.class); profiles = mock(IOrganizerProfileRepository.class); documents = mock(IOrganizerDocumentRepository.class);
        user = new UserModel(); user.setId(7L); user.setVerified(true); user.setRoleEntity(new RoleModel("USER", null));
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(users.findByIdForApplication(7L)).thenReturn(Optional.of(user));
        transaction = new TransactionTemplate(new AbstractPlatformTransactionManager() {
            protected Object doGetTransaction() { return new Object(); }
            protected void doBegin(Object tx, TransactionDefinition definition) { }
            protected void doCommit(DefaultTransactionStatus status) { }
            protected void doRollback(DefaultTransactionStatus status) { }
        });
    }

    @Test
    void submitUsesAuthenticatedStorageWithoutChangingRoleOrReceipt() throws Exception {
        var service = new OrganizerApplicationService(users, profiles, documents, storage, Clock.systemUTC(), jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator());
        when(profiles.saveAndFlush(any())).thenAnswer(invocation -> { OrganizerProfileModel profile = invocation.getArgument(0); profile.setId(42L); return profile; });
        var result = transaction.execute(status -> service.submit(7L, OrganizerApplicationServiceTest.REQUEST, OrganizerApplicationServiceTest.license()));
        assertThat(result.status()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
        assertThat(new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules().writeValueAsString(result))
                .doesNotContain("cloudinary:", "fileUrl", "http");
        assertThat(user.getRole().name()).isEqualTo("USER");
        verify(documents).saveAndFlush(argThat(document -> REFERENCE.equals(document.getFileUrl()) && document.getDocumentType() == OrganizerDocumentType.BUSINESS_LICENSE));
        verify(cloudinary, never()).deletePrivateDocument(anyString());
        assertDirectoryEmpty();
    }

    @Test
    void submitMetadataFailureCompensatesOnlyItsNewCloudAsset() {
        var service = new OrganizerApplicationService(users, profiles, documents, storage, Clock.systemUTC(), jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator());
        doThrow(new IllegalStateException("Simulated persistence failure")).when(documents).saveAndFlush(any());
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, OrganizerApplicationServiceTest.REQUEST, OrganizerApplicationServiceTest.license())))
                .hasMessage("Simulated persistence failure");
        verify(cloudinary).deletePrivateDocument(REFERENCE);
    }

    @Test
    void standaloneUploadMetadataFailureCompensatesCloudWithoutChangingProfileState() {
        var profile = new OrganizerProfileModel(); profile.setId(42L); profile.setOrganizer(user); profile.setStatus(OrganizerProfileStatus.DRAFT);
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.of(profile));
        doThrow(new IllegalStateException("Simulated persistence failure")).when(documents).saveAndFlush(any());
        var service = new OrganizerVerificationDocumentService(users, profiles, documents, storage);
        assertThatThrownBy(() -> transaction.execute(status -> service.upload(7L, OrganizerDocumentType.OTHER, OrganizerApplicationServiceTest.license())))
                .hasMessage("Simulated persistence failure");
        verify(cloudinary).deletePrivateDocument(REFERENCE);
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.DRAFT);
    }

    @Test
    void standaloneUploadSuccessPersistsOnlyTheStorageReference() throws Exception {
        var profile = new OrganizerProfileModel(); profile.setId(42L); profile.setOrganizer(user);
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.of(profile));
        var service = new OrganizerVerificationDocumentService(users, profiles, documents, storage);
        var result = transaction.execute(status -> service.upload(7L, OrganizerDocumentType.OTHER, OrganizerApplicationServiceTest.license()));
        assertThat(result.fileName()).isEqualTo("license.pdf");
        assertThat(new com.fasterxml.jackson.databind.ObjectMapper().findAndRegisterModules().writeValueAsString(result))
                .doesNotContain("cloudinary:", "fileUrl", "http");
        verify(documents).saveAndFlush(argThat(document -> REFERENCE.equals(document.getFileUrl())));
        verify(cloudinary, never()).deletePrivateDocument(anyString());
        assertDirectoryEmpty();
    }

    @Test
    void invalidFileIsRejectedBeforeCallingCloudinary() {
        var file = new MockMultipartFile("file", "fake.pdf", "application/pdf", "executable content".getBytes());
        assertThatThrownBy(() -> storage.store(file)).isInstanceOf(BadRequestException.class);
        verify(cloudinary, never()).uploadPrivateDocument(any(), anyString());
    }

    @Test
    void cloudFailureDoesNotFallBackOrPersistMetadata() throws Exception {
        when(cloudinary.uploadPrivateDocument(any(), anyString())).thenThrow(new IllegalStateException("Could not store verification document"));
        var service = new OrganizerApplicationService(users, profiles, documents, storage, Clock.systemUTC(), jakarta.validation.Validation.buildDefaultValidatorFactory().getValidator());
        assertThatThrownBy(() -> transaction.execute(status -> service.submit(7L, OrganizerApplicationServiceTest.REQUEST, OrganizerApplicationServiceTest.license())))
                .hasMessage("Could not store verification document");
        verifyNoInteractions(documents);
        verify(profiles).saveAndFlush(any());
        assertDirectoryEmpty();
    }

    @Test
    void unconfiguredCloudinaryFailsClosedAndExplicitLocalModeRemainsAvailable() throws Exception {
        when(cloudinary.isCloudinaryConfigured()).thenReturn(false);
        assertThatThrownBy(() -> storage.store(OrganizerApplicationServiceTest.license()))
                .hasMessage("Private Cloudinary storage is not configured");
        when(cloudinary.isCloudinaryConfigured()).thenReturn(true);
        var localOnly = new PrivateOrganizerDocumentStorage(directory.toString(), cloudinary, false);
        var disabled = localOnly.store(OrganizerApplicationServiceTest.license());
        assertThat(directory.resolve(disabled.key())).exists();
        verify(cloudinary, never()).uploadPrivateDocument(any(), anyString());
    }

    @Test
    void legacyFilesystemKeysRemainLocalEvenWhenCloudinaryIsEnabled() throws Exception {
        var local = new PrivateOrganizerDocumentStorage(directory.toString());
        var stored = local.store(OrganizerApplicationServiceTest.license());
        storage.delete(stored);
        assertThat(directory.resolve(stored.key())).doesNotExist();
        verify(cloudinary, never()).deletePrivateDocument(anyString());
    }

    @Test
    void cloudReferencesNeverBecomeLocalPathsWhenTheFeatureFlagChanges() {
        var localOnly = new PrivateOrganizerDocumentStorage(directory.toString(), cloudinary, false);
        localOnly.delete(new PrivateOrganizerDocumentStorage.StoredDocument(REFERENCE, "license.pdf"));
        verify(cloudinary).deletePrivateDocument(REFERENCE);
        assertThatThrownBy(() -> storage.delete(new PrivateOrganizerDocumentStorage.StoredDocument("../old.pdf", "old.pdf")))
                .isInstanceOf(IllegalStateException.class);
    }

    private void assertDirectoryEmpty() throws Exception {
        try (var files = Files.list(directory)) { assertThat(files).isEmpty(); }
    }
}
