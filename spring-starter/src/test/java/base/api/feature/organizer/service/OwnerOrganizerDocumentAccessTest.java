package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.*;
import base.api.shared.entity.*;
import base.api.shared.entity.organizer.*;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import java.util.Optional;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class OwnerOrganizerDocumentAccessTest {
    @Mock IUserRepository users;
    @Mock IOrganizerProfileRepository profiles;
    @Mock IOrganizerDocumentRepository documents;
    AdminOrganizerDocumentAccessService service;
    UserModel owner;
    @BeforeEach void setup() {
        service = new AdminOrganizerDocumentAccessService(users, profiles, documents);
        owner = new UserModel(); owner.setId(1L); owner.setVerified(true);
        owner.setRoleEntity(new RoleModel("USER", null));
        when(users.findById(1L)).thenReturn(Optional.of(owner));
    }
    @Test void ownerReadsCurrentDraftDocumentWithoutExposingForeignFiles() {
        var profile = new OrganizerProfileModel(); profile.setId(7L); profile.setOrganizer(owner);
        profile.setStatus(OrganizerProfileStatus.DRAFT);
        when(profiles.findByOrganizerId(1L)).thenReturn(Optional.of(profile));
        when(documents.findByIdAndOrganizerProfileId(9L, 7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.authorizeOwner(1L, 9L)).isInstanceOf(NotFoundException.class);
        var document = new OrganizerDocumentModel(); document.setCurrent(true);
        document.setFileUrl("private.pdf"); document.setFileName("license.pdf");
        when(documents.findByIdAndOrganizerProfileId(9L, 7L)).thenReturn(Optional.of(document));
        assertThat(service.authorizeOwner(1L, 9L).key()).isEqualTo("private.pdf");
        document.setCurrent(false);
        assertThatThrownBy(() -> service.authorizeOwner(1L, 9L)).isInstanceOf(NotFoundException.class);
    }
    @Test void unverifiedInactiveAndAdminAccountsCannotReadOwnerContent() {
        owner.setVerified(false);
        assertThatThrownBy(() -> service.authorizeOwner(1L, 9L)).isInstanceOf(ForbiddenException.class);
        owner.setVerified(true); owner.setStatus(UserStatus.LOCKED);
        assertThatThrownBy(() -> service.authorizeOwner(1L, 9L)).isInstanceOf(ForbiddenException.class);
        owner.setStatus(UserStatus.ACTIVE); owner.setRoleEntity(new RoleModel("ADMIN", null));
        assertThatThrownBy(() -> service.authorizeOwner(1L, 9L)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(profiles, documents);
    }
}
