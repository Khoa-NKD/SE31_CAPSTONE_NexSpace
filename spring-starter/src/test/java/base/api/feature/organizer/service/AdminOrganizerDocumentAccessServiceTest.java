package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.*;
import base.api.shared.entity.*;
import base.api.shared.entity.organizer.*;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AdminOrganizerDocumentAccessServiceTest {
    @Mock IUserRepository users;
    @Mock IOrganizerProfileRepository profiles;
    @Mock IOrganizerDocumentRepository documents;
    AdminOrganizerDocumentAccessService service;
    UserModel admin;
    @BeforeEach void setUp() {
        service = new AdminOrganizerDocumentAccessService(users, profiles, documents);
        admin = new UserModel(); admin.setRoleEntity(new RoleModel("ADMIN", null));
        when(users.findById(1L)).thenReturn(Optional.of(admin));
    }
    @Test void readsOnlyDocumentBelongingToSubmittedApplicationWithoutWrites() {
        var profile = new OrganizerProfileModel(); profile.setId(7L);
        var document = new OrganizerDocumentModel(); document.setId(9L); document.setFileUrl("internal-key");
        document.setFileName("license.pdf"); document.setCurrent(false);
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.of(profile));
        when(documents.findByIdAndOrganizerProfileId(9L, 7L)).thenReturn(Optional.of(document));
        assertThat(service.authorize(1L, 7L, 9L)).isEqualTo(new AdminOrganizerDocumentAccessService.Reference("internal-key", "license.pdf"));
        verify(profiles).findSubmittedApplicationDetails(7L); verify(documents).findByIdAndOrganizerProfileId(9L, 7L);
        verifyNoMoreInteractions(profiles, documents);
        assertThat(document.getStatus()).isEqualTo(OrganizerDocumentStatus.PENDING);
        assertThat(document.isCurrent()).isFalse();
    }
    @ParameterizedTest @ValueSource(strings={"USER", "ORGANIZER", "LOCKED", "MISSING"})
    void rejectsActorBeforeApplicationOrStorageLookup(String scenario) {
        if (scenario.equals("MISSING")) when(users.findById(1L)).thenReturn(Optional.empty());
        else if (scenario.equals("LOCKED")) admin.setStatus(UserStatus.LOCKED);
        else admin.setRoleEntity(new RoleModel(scenario, null));
        assertThatThrownBy(() -> service.authorize(1L, 7L, 9L))
                .isInstanceOf(scenario.equals("MISSING") ? UnauthorizedException.class : ForbiddenException.class);
        verifyNoInteractions(profiles, documents);
    }
    @Test void rejectsInvalidIdsBeforeQuerying() {
        for (Long invalid : new Long[]{null, 0L, -1L}) {
            assertThatThrownBy(() -> service.authorize(1L, invalid, 9L)).isInstanceOf(BadRequestException.class);
            assertThatThrownBy(() -> service.authorize(1L, 7L, invalid)).isInstanceOf(BadRequestException.class);
        }
        verifyNoInteractions(profiles, documents);
    }
    @Test void missingOrDraftApplicationDoesNotReadDocument() {
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.authorize(1L, 7L, 9L)).isInstanceOf(NotFoundException.class);
        verifyNoInteractions(documents);
    }
    @Test void foreignDocumentIsNotFound() {
        when(profiles.findSubmittedApplicationDetails(7L)).thenReturn(Optional.of(new OrganizerProfileModel()));
        when(documents.findByIdAndOrganizerProfileId(9L, 7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.authorize(1L, 7L, 9L)).isInstanceOf(NotFoundException.class);
    }
}
