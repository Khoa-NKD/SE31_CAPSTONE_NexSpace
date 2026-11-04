package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.AdminOrganizerDocumentResponse;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOrganizerApplicationDetailsServiceTest {
    @Mock IUserRepository users;
    @Mock IOrganizerProfileRepository profiles;
    @Mock IOrganizerDocumentRepository documents;
    AdminOrganizerApplicationDetailsService service;
    UserModel admin;

    @BeforeEach
    void setUp() {
        service = new AdminOrganizerApplicationDetailsService(users, profiles, documents);
        admin = new UserModel(); admin.setId(1L); admin.setRoleEntity(new RoleModel("ADMIN", null));
        when(users.findById(1L)).thenReturn(Optional.of(admin));
    }

    OrganizerProfileModel profile() {
        var owner = new UserModel(); owner.setId(42L); owner.setUserName("applicant");
        owner.setFirstName("Test"); owner.setLastName("Applicant"); owner.setEmail("applicant@example.test");
        owner.setPassword("private-account-hash"); owner.setTwoFactorSecret("private-two-factor");
        var profile = new OrganizerProfileModel(); profile.setId(7L); profile.setOrganizer(owner);
        profile.setLegalName("Workspace Company"); profile.setTaxId("0400000123");
        profile.setBusinessType(BusinessType.LIMITED_LIABILITY); profile.setRepresentativeName("Test Representative");
        profile.setAddress("12 Test Street"); profile.setContactEmail("contact@example.test"); profile.setContactPhone("0900000123");
        profile.setStatus(OrganizerProfileStatus.REVISION_REQUESTED);
        profile.setSubmittedAt(LocalDateTime.of(2026, 11, 5, 8, 0));
        profile.setReviewedAt(LocalDateTime.of(2026, 11, 5, 9, 0)); profile.setReviewFeedback("Clarify address");
        profile.setBankAccountNumber("private-bank-account");
        return profile;
    }

    @Test
    void readsTargetApplicationAndMetadataWithoutModifyingEntities() {
        var profile = profile();
        var current = new AdminOrganizerDocumentResponse(9L, OrganizerDocumentType.BUSINESS_LICENSE,
                "license.pdf", OrganizerDocumentStatus.PENDING, profile.getSubmittedAt(), true, null);
        var previous = new AdminOrganizerDocumentResponse(8L, OrganizerDocumentType.BUSINESS_LICENSE,
                "old-license.pdf", OrganizerDocumentStatus.REJECTED, profile.getSubmittedAt(), false, "Unclear");
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.of(profile));
        when(documents.findAdminMetadataByProfileId(7L)).thenReturn(List.of(current, previous));
        var result = service.getDetails(1L, 7L);
        assertThat(result.id()).isEqualTo(7L);
        assertThat(result.applicant().id()).isEqualTo(42L);
        assertThat(result.applicant().fullName()).isEqualTo("Test Applicant");
        assertThat(result.applicant().email()).isEqualTo("applicant@example.test");
        assertThat(result.contactEmail()).isEqualTo("contact@example.test");
        assertThat(result.taxId()).isEqualTo("0400000123");
        assertThat(result.reviewFeedback()).isEqualTo("Clarify address");
        assertThat(result.documents()).containsExactly(current, previous);
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.REVISION_REQUESTED);
        assertThat(profile.getOrganizer().getPassword()).isEqualTo("private-account-hash");
        verify(profiles).findSubmittedApplicationDetails(7L);
        verify(documents).findAdminMetadataByProfileId(7L);
        verifyNoMoreInteractions(profiles, documents);
    }

    @Test
    void returnsEmptyDocumentsAndNullableReviewData() {
        var profile = profile(); profile.setReviewedAt(null); profile.setReviewFeedback(null);
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.of(profile));
        when(documents.findAdminMetadataByProfileId(7L)).thenReturn(List.of());
        var result = service.getDetails(1L, 7L);
        assertThat(result.documents()).isEmpty(); assertThat(result.reviewedAt()).isNull();
        assertThat(result.reviewFeedback()).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ORGANIZER", "LOCKED"})
    void deniesIneligibleActorBeforeApplicationLookup(String role) {
        if (role.equals("LOCKED")) admin.setStatus(UserStatus.LOCKED);
        else admin.setRoleEntity(new RoleModel(role, null));
        assertThatThrownBy(() -> service.getDetails(1L, 7L)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(profiles, documents);
    }

    @Test
    void rejectsMissingActorAndInvalidIdsBeforeLookup() {
        assertThatThrownBy(() -> service.getDetails(1L, null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.getDetails(1L, 0L)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.getDetails(1L, -1L)).isInstanceOf(BadRequestException.class);
        when(users.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getDetails(1L, 7L)).isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(profiles, documents);
    }

    @Test
    void missingOrUnsubmittedProfileDoesNotQueryDocuments() {
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getDetails(1L, 7L)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(documents);
    }
}
