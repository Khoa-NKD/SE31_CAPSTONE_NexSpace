package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkspaceServiceImplTest {

    private IWorkspaceRepository workspaceRepository;
    private IUserRepository userRepository;
    private WorkspaceServiceImpl service;

    private UserModel organizer;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(IWorkspaceRepository.class);
        userRepository = mock(IUserRepository.class);
        service = new WorkspaceServiceImpl(workspaceRepository, userRepository);

        RoleModel role = new RoleModel();
        role.setName(UserRole.ORGANIZER.name());

        organizer = new UserModel();
        organizer.setId(10L);
        organizer.setUserName("organizer1");
        organizer.setFirstName("Van A");
        organizer.setLastName("Nguyen");
        organizer.setEmail("organizer@nexspace.vn");
        organizer.setRoleEntity(role);
    }

    @Test
    @DisplayName("Tạo coworking space thành công với trạng thái DRAFT")
    void createWorkspace_success() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(organizer));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> {
            WorkspaceModel m = invocation.getArgument(0);
            m.setId(100L);
            return m;
        });

        CreateWorkspaceDto dto = CreateWorkspaceDto.builder()
                .name("NexSpace Saigon Hub")
                .category(WorkspaceCategory.COWORKING_HUB)
                .description("Không gian hiện đại trung tâm Quận 1")
                .address("123 Lê Lợi")
                .district("Quận 1")
                .city("Hồ Chí Minh")
                .latitude(new BigDecimal("10.776889"))
                .longitude(new BigDecimal("106.700806"))
                .areaSqm(new BigDecimal("500.50"))
                .supportPhone("0901234567")
                .entryInstructions("Lên thang máy tầng 5")
                .bookingConfirmationMode(BookingConfirmationMode.INSTANT)
                .build();

        WorkspaceDetailDto result = service.createWorkspace(10L, dto);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(100L);
        assertThat(result.getName()).isEqualTo("NexSpace Saigon Hub");
        assertThat(result.getCategory()).isEqualTo(WorkspaceCategory.COWORKING_HUB);
        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.DRAFT);
        assertThat(result.getOrganizerId()).isEqualTo(10L);
        assertThat(result.getOrganizerName()).isEqualTo("Van A Nguyen");

        verify(userRepository).findById(10L);
        verify(workspaceRepository).save(any(WorkspaceModel.class));
    }

    @Test
    @DisplayName("Tạo coworking space thất bại khi Organizer không tồn tại")
    void createWorkspace_organizerNotFound_throwsNotFoundException() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        CreateWorkspaceDto dto = CreateWorkspaceDto.builder()
                .name("Test Hub")
                .category(WorkspaceCategory.COWORKING_HUB)
                .address("123 Street")
                .district("District 1")
                .city("HCM")
                .build();

        assertThatThrownBy(() -> service.createWorkspace(99L, dto))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Organizer không tồn tại");
    }
}
