package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationResponse;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.data.domain.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

class AdminOrganizerApplicationServiceTest {
    IUserRepository users;
    IOrganizerProfileRepository profiles;
    AdminOrganizerApplicationService service;
    UserModel admin;

    @BeforeEach
    void setUp() {
        users = mock(IUserRepository.class); profiles = mock(IOrganizerProfileRepository.class);
        service = new AdminOrganizerApplicationService(users, profiles);
        admin = new UserModel(); admin.setId(1L); admin.setRoleEntity(new RoleModel("ADMIN", null));
        when(users.findById(1L)).thenReturn(Optional.of(admin));
    }

    @Test
    void returnsProjectionUsingOneBasedPaginationWithStableSortingAndNoWrites() {
        var row = new AdminOrganizerApplicationResponse(42L, "Company", BusinessType.LIMITED_LIABILITY,
                7L, "applicant", "applicant@example.test", OrganizerProfileStatus.PENDING_REVIEW, LocalDateTime.of(2026, 11, 5, 8, 0), null);
        when(profiles.findSubmittedApplications(isNull(), isNull(), any())).thenAnswer(invocation ->
                new PageImpl<>(List.of(row), invocation.getArgument(2), 31));
        var request = new PageRequestDTO(); request.setPage(2); request.setSize(10);
        var page = service.list(1L, request, null);
        assertThat(page.getTotalElements()).isEqualTo(31);
        assertThat(page.getContent()).containsExactly(row);
        assertThat(page.getNumber()).isEqualTo(1);
        assertThat(page.hasNext()).isTrue();
        verify(profiles).findSubmittedApplications(isNull(), isNull(), argThat(p ->
                p.getPageNumber() == 1 && p.getPageSize() == 10
                        && p.getSort().toList().equals(List.of(Sort.Order.desc("submittedAt"), Sort.Order.desc("id")))));
        verifyNoMoreInteractions(profiles);
        assertThat(admin.getRole()).isEqualTo(UserRole.ADMIN);
    }

    @ParameterizedTest
    @EnumSource(OrganizerProfileStatus.class)
    void forwardsStatusAndEscapesLiteralSearchCharacters(OrganizerProfileStatus status) {
        var request = new PageRequestDTO(); request.setSearch("  A!_%  "); request.setSortBy("legalName"); request.setSortDir("asc");
        when(profiles.findSubmittedApplications(eq(status), eq("%a!!!_!%%"), any())).thenReturn(Page.empty());
        assertThat(service.list(1L, request, status).isEmpty()).isTrue();
        verify(profiles).findSubmittedApplications(eq(status), eq("%a!!!_!%%"), argThat(p -> p.getSort().getOrderFor("legalName").isAscending()));
        verifyNoMoreInteractions(profiles);
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ORGANIZER", "LOCKED", "MISSING"})
    void deniesIneligibleActorsBeforeReadingApplications(String scenario) {
        if (scenario.equals("MISSING")) when(users.findById(1L)).thenReturn(Optional.empty());
        else if (scenario.equals("LOCKED")) admin.setStatus(UserStatus.LOCKED);
        else admin.setRoleEntity(new RoleModel(scenario, null));
        assertThatThrownBy(() -> service.list(1L, new PageRequestDTO(), null))
                .isInstanceOf(scenario.equals("MISSING") ? UnauthorizedException.class : ForbiddenException.class);
        verifyNoInteractions(profiles);
    }

    @Test
    void rejectsInvalidPagingSortAndOversizedSearchBeforeQuerying() {
        var request = new PageRequestDTO();
        request.setPage(0); assertInvalid(request); request.setPage(1);
        request.setSize(0); assertInvalid(request); request.setSize(101); assertInvalid(request); request.setSize(20);
        request.setSortBy("organizer.password"); assertInvalid(request); request.setSortBy("submittedAt");
        request.setSortDir("desc; delete"); assertInvalid(request); request.setSortDir("desc");
        request.setSearch("x".repeat(256)); assertInvalid(request);
        verifyNoInteractions(profiles);
    }

    @ParameterizedTest
    @ValueSource(strings = {"id", "legalName", "submittedAt", "reviewedAt", "status"})
    void supportsOnlyDocumentedSortFields(String sortBy) {
        var request = new PageRequestDTO(); request.setSortBy(sortBy);
        when(profiles.findSubmittedApplications(isNull(), isNull(), any())).thenReturn(Page.empty());
        service.list(1L, request, null);
        verify(profiles).findSubmittedApplications(isNull(), isNull(), argThat(p -> p.getSort().getOrderFor(sortBy) != null));
    }

    void assertInvalid(PageRequestDTO request) {
        assertThatThrownBy(() -> service.list(1L, request, null)).isInstanceOf(BadRequestException.class);
    }
}
