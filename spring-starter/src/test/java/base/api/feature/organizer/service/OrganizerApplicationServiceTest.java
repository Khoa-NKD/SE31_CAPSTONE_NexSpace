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
            " Business address ", "+84901234567", " contact@example.com ");

    @BeforeEach
    void setUp() {
        users = mock(IUserRepository.class);
        profiles = mock(IOrganizerProfileRepository.class);
        documents = mock(IOrganizerDocumentRepository.class);
        service = new OrganizerApplicationService(users, profiles, documents,
                new PrivateOrganizerDocumentStorage(directory.toString()),
                Clock.fixed(Instant.parse("2026-11-03T01:00:00Z"), ZoneOffset.UTC));
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
    @EnumSource(OrganizerProfileStatus.class)
    void rejectsEveryExistingProfileWithoutReplacingFiles(OrganizerProfileStatus existingStatus) {
        var existing = new OrganizerProfileModel();
        existing.setStatus(existingStatus);
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.of(existing));
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
}
