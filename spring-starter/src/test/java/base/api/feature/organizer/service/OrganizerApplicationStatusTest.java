package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.OrganizerApplicationDetailsResponse;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.validation.Validator;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

class OrganizerApplicationStatusTest {
    IUserRepository users;
    IOrganizerProfileRepository profiles;
    IOrganizerDocumentRepository documents;
    PrivateOrganizerDocumentStorage storage;
    OrganizerApplicationService service;
    UserModel user;
    OrganizerProfileModel profile;

    @BeforeEach
    void setUp() {
        users = mock(IUserRepository.class);
        profiles = mock(IOrganizerProfileRepository.class);
        documents = mock(IOrganizerDocumentRepository.class);
        storage = mock(PrivateOrganizerDocumentStorage.class);
        service = new OrganizerApplicationService(users, profiles, documents, storage, Clock.systemUTC(), mock(Validator.class));
        user = new UserModel(); user.setId(7L); user.setVerified(true); user.setRoleEntity(new RoleModel("USER", null));
        profile = new OrganizerProfileModel(); profile.setId(42L); profile.setOrganizer(user);
        profile.setLegalName("Example business");
        when(users.findById(7L)).thenReturn(Optional.of(user));
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.of(profile));
    }

    @ParameterizedTest
    @EnumSource(OrganizerProfileStatus.class)
    void readsEveryRealStatusWithoutChangingDataAndRestrictsReviewFeedback(OrganizerProfileStatus status) throws Exception {
        profile.setStatus(status);
        var submitted = LocalDateTime.of(2026, 11, 4, 8, 0);
        var reviewed = LocalDateTime.of(2026, 11, 4, 9, 0);
        profile.setSubmittedAt(submitted); profile.setReviewedAt(reviewed);
        profile.setReviewFeedback("Please provide a clearer document");
        var response = service.current(7L);
        assertThat(response.id()).isEqualTo(42L);
        assertThat(response.status()).isEqualTo(status);
        assertThat(response.submittedAt()).isEqualTo(submitted);
        assertThat(response.reviewedAt()).isEqualTo(reviewed);
        boolean visible = status == OrganizerProfileStatus.REJECTED || status == OrganizerProfileStatus.REVISION_REQUESTED;
        assertThat(response.reviewFeedback()).isEqualTo(visible ? profile.getReviewFeedback() : null);
        assertThat(profile.getStatus()).isEqualTo(status);
        assertThat(user.getRole()).isEqualTo(UserRole.USER);
        verify(users).findById(7L); verify(profiles).findByOrganizerId(7L);
        verifyNoMoreInteractions(users, profiles);
        verifyNoInteractions(documents, storage);
        assertThat(OrganizerApplicationService.class.getMethod("current", Long.class).getAnnotation(Transactional.class).readOnly()).isTrue();
    }

    @Test
    void returnsNotFoundWithoutCreatingProfileAndRejectsForeignOwner() {
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.current(7L)).isInstanceOf(NotFoundException.class);
        var other = new UserModel(); other.setId(8L); profile.setOrganizer(other);
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.of(profile));
        assertThatThrownBy(() -> service.current(7L)).isInstanceOf(ForbiddenException.class);
        verify(profiles, never()).save(any()); verify(profiles, never()).saveAndFlush(any());
        verifyNoInteractions(documents, storage);
    }

    @ParameterizedTest
    @ValueSource(strings = {"missing", "locked", "unverified", "admin"})
    void rejectsIneligibleAccountsBeforeReadingProfile(String scenario) {
        if (scenario.equals("missing")) when(users.findById(7L)).thenReturn(Optional.empty());
        if (scenario.equals("locked")) user.setStatus(UserStatus.LOCKED);
        if (scenario.equals("unverified")) user.setVerified(false);
        if (scenario.equals("admin")) user.setRoleEntity(new RoleModel("ADMIN", null));
        assertThatThrownBy(() -> service.current(7L)).isInstanceOf(scenario.equals("missing") ? UnauthorizedException.class : ForbiddenException.class);
        verifyNoInteractions(profiles, documents, storage);
    }

    @Test
    void responseNeverContainsReviewerBankOrStorageDataAndDoesNotInventReviewOutcome() throws Exception {
        profile.setBankAccountNumber("private-bank-number");
        profile.setReviewedBy(user);
        profile.setReviewFeedback("internal note hidden for draft");
        var response = service.current(7L);
        var json = new ObjectMapper().findAndRegisterModules().writeValueAsString(response);
        assertThat(response.reviewedAt()).isNull();
        assertThat(response.reviewFeedback()).isNull();
        assertThat(json).doesNotContain("private-bank-number", "internal note", "reviewedBy", "fileUrl", "password", "organizerId");
        assertThat(OrganizerApplicationDetailsResponse.from(profile).status()).isEqualTo(OrganizerProfileStatus.DRAFT);
    }
}
