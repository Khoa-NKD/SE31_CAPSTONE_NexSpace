package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.repository.IAuditLogRepository;
import base.api.feature.organizer.dto.response.AdminOrganizerDocumentResponse;
import base.api.feature.organizer.repository.IOrganizerDocumentRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.governance.AuditLogModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
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
    @Mock IAuditLogRepository records;
    AdminOrganizerApplicationDetailsService service;
    UserModel admin;

    @BeforeEach
    void setUp() {
        service = new AdminOrganizerApplicationDetailsService(users, profiles, documents,
                new OrganizerLifecycleAudit(records, new ObjectMapper()));
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
        profile.setRegistrationReason("Provide flexible workspaces.\nServe local companies.");
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
        assertThat(result.registrationReason()).isEqualTo(profile.getRegistrationReason());
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
        assertThat(result.registrationReason()).isNull();
        assertThat(result.reviewHistory()).isEmpty();
    }

    @Test
    void readsPreviousDecisionsAndTheirDocumentFeedbackAfterResubmission() {
        var profile = profile();
        profile.setStatus(OrganizerProfileStatus.PENDING_REVIEW);
        profile.setReviewedAt(null);
        profile.setReviewFeedback(null);
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.of(profile));
        admin.setFirstName("Test");
        admin.setLastName("Reviewer");
        var latest = review(12L, "Replace the blurry page", """
                {"documents":[{"id":9,"status":"REJECTED","feedback":"Page is blurry"},
                              {"id":10,"status":"PENDING","feedback":null}]}
                """);
        var previous = review(10L, "Upload both pages", """
                {"documents":[{"id":8,"status":"REJECTED","feedback":"Page two is missing"}]}
                """);
        when(records.findByModuleAndEntityTypeAndEntityIdAndActionInOrderByCreatedAtDescIdDesc(
                "ORGANIZER_ONBOARDING", "OrganizerProfile", 7L,
                java.util.Set.of("Organizer.Approve", "Organizer.Reject", "Organizer.RequestChanges")))
                .thenReturn(List.of(latest, previous));

        var history = service.getDetails(1L, 7L).reviewHistory();

        assertThat(history).extracting(decision -> decision.id()).containsExactly(12L, 10L);
        assertThat(history.get(0).reviewerName()).isEqualTo("Test Reviewer");
        assertThat(history.get(0).feedback()).isEqualTo("Replace the blurry page");
        assertThat(history.get(0).documentFeedback()).singleElement()
                .satisfies(feedback -> assertThat(feedback.documentId()).isEqualTo(9L));
        assertThat(history.get(1).documentFeedback()).singleElement()
                .satisfies(feedback -> assertThat(feedback.feedback()).isEqualTo("Page two is missing"));
    }

    private AuditLogModel review(long id, String reason, String snapshot) {
        var record = new AuditLogModel();
        record.setId(id);
        record.setAction("Organizer.RequestChanges");
        record.setCreatedAt(LocalDateTime.of(2026, 11, 5, 9, (int) id));
        record.setUser(admin);
        record.setReason(reason);
        record.setNewValue(snapshot);
        return record;
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ORGANIZER", "LOCKED"})
    void deniesIneligibleActorBeforeApplicationLookup(String role) {
        if (role.equals("LOCKED")) admin.setStatus(UserStatus.LOCKED);
        else admin.setRoleEntity(new RoleModel(role, null));
        assertThatThrownBy(() -> service.getDetails(1L, 7L)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(profiles, documents, records);
    }

    @Test
    void rejectsMissingActorAndInvalidIdsBeforeLookup() {
        assertThatThrownBy(() -> service.getDetails(1L, null)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.getDetails(1L, 0L)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.getDetails(1L, -1L)).isInstanceOf(BadRequestException.class);
        when(users.findById(1L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getDetails(1L, 7L)).isInstanceOf(UnauthorizedException.class);
        verifyNoInteractions(profiles, documents, records);
    }

    @Test
    void missingOrUnsubmittedProfileDoesNotQueryDocuments() {
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getDetails(1L, 7L)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(documents, records);
    }
}
