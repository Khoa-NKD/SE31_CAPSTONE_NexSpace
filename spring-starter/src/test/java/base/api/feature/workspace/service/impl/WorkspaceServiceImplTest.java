package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceLifecycleAction;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkspaceServiceImplTest {

    private IWorkspaceRepository workspaceRepository;
    private IUserRepository userRepository;
    private WorkspaceServiceImpl service;

    private UserModel organizer;
    private UserModel otherOrganizer;
    private WorkspaceModel existingWorkspace;

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

        otherOrganizer = new UserModel();
        otherOrganizer.setId(20L);
        otherOrganizer.setUserName("other_organizer");
        otherOrganizer.setRoleEntity(role);

        existingWorkspace = new WorkspaceModel();
        existingWorkspace.setId(100L);
        existingWorkspace.setName("Old Name");
        existingWorkspace.setCategory(WorkspaceCategory.COWORKING_HUB);
        existingWorkspace.setDescription("Old Description");
        existingWorkspace.setAddress("Old Address");
        existingWorkspace.setDistrict("Quận 1");
        existingWorkspace.setCity("Hồ Chí Minh");
        existingWorkspace.setStatus(WorkspaceStatus.DRAFT);
        existingWorkspace.setOrganizer(organizer);
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

    @Test
    @DisplayName("Cập nhật coworking space thành công bởi chính chủ sở hữu")
    void updateWorkspace_success() {
        when(workspaceRepository.findById(100L)).thenReturn(Optional.of(existingWorkspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        UpdateWorkspaceDto dto = UpdateWorkspaceDto.builder()
                .name("NexSpace Innovation Hub")
                .category(WorkspaceCategory.CREATIVE_STUDIO)
                .description("Mô tả mới nâng cấp")
                .address("456 Nguyễn Huệ")
                .district("Quận 1")
                .city("Hồ Chí Minh")
                .areaSqm(new BigDecimal("750.00"))
                .supportPhone("0988776655")
                .bookingConfirmationMode(BookingConfirmationMode.MANUAL_APPROVAL)
                .build();

        WorkspaceDetailDto result = service.updateWorkspace(10L, 100L, dto);

        assertThat(result).isNotNull();
        assertThat(result.getName()).isEqualTo("NexSpace Innovation Hub");
        assertThat(result.getCategory()).isEqualTo(WorkspaceCategory.CREATIVE_STUDIO);
        assertThat(result.getDescription()).isEqualTo("Mô tả mới nâng cấp");
        assertThat(result.getAddress()).isEqualTo("456 Nguyễn Huệ");
        assertThat(result.getAreaSqm()).isEqualByComparingTo(new BigDecimal("750.00"));
        assertThat(result.getSupportPhone()).isEqualTo("0988776655");
        assertThat(result.getBookingConfirmationMode()).isEqualTo(BookingConfirmationMode.MANUAL_APPROVAL);

        verify(workspaceRepository).save(existingWorkspace);
    }

    @Test
    @DisplayName("Strict Ownership Defense: Cập nhật thất bại ném 404 khi không phải chủ sở hữu")
    void updateWorkspace_notOwner_throwsNotFoundException() {
        when(workspaceRepository.findById(100L)).thenReturn(Optional.of(existingWorkspace));

        UpdateWorkspaceDto dto = UpdateWorkspaceDto.builder()
                .name("Hacked Name")
                .build();

        // otherOrganizer ID = 20L khác 10L
        assertThatThrownBy(() -> service.updateWorkspace(20L, 100L, dto))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: 100");
    }

    @Test
    @DisplayName("Cập nhật thất bại khi workspace đã bị lưu trữ (ARCHIVED)")
    void updateWorkspace_archived_throwsBadRequestException() {
        existingWorkspace.setStatus(WorkspaceStatus.ARCHIVED);
        when(workspaceRepository.findById(100L)).thenReturn(Optional.of(existingWorkspace));

        UpdateWorkspaceDto dto = UpdateWorkspaceDto.builder()
                .name("New Name")
                .build();

        assertThatThrownBy(() -> service.updateWorkspace(10L, 100L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể cập nhật không gian làm việc đã bị lưu trữ");
    }

    @Test
    @DisplayName("Xóa mềm coworking space (ARCHIVED) thành công")
    void archiveWorkspace_success() {
        when(workspaceRepository.findById(100L)).thenReturn(Optional.of(existingWorkspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkspaceDetailDto result = service.archiveWorkspace(10L, 100L);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.ARCHIVED);
        assertThat(result.getOperatingStatus()).isEqualTo("Archived");
        assertThat(existingWorkspace.getStatus()).isEqualTo(WorkspaceStatus.ARCHIVED);

        verify(workspaceRepository).save(existingWorkspace);
    }

    @Test
    @DisplayName("Strict Ownership Defense: Xóa mềm thất bại ném 404 khi không sở hữu")
    void archiveWorkspace_notOwner_throwsNotFoundException() {
        when(workspaceRepository.findById(100L)).thenReturn(Optional.of(existingWorkspace));

        assertThatThrownBy(() -> service.archiveWorkspace(20L, 100L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: 100");
    }

    @Test
    @DisplayName("Cập nhật vòng đời: Archive chuyển sang trạng thái ARCHIVED")
    void updateLifecycle_archive_success() {
        when(workspaceRepository.findById(100L)).thenReturn(Optional.of(existingWorkspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkspaceLifecycleDto dto = WorkspaceLifecycleDto.builder()
                .action(WorkspaceLifecycleAction.ARCHIVE)
                .reason("Ngừng kinh doanh địa điểm")
                .build();

        WorkspaceDetailDto result = service.updateLifecycle(10L, 100L, dto);

        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.ARCHIVED);
        assertThat(result.getOperatingStatus()).isEqualTo("Archived");
    }

    @Test
    @DisplayName("Cập nhật vòng đời: Tạm dừng thất bại khi workspace chưa ACTIVE (ném 409 Conflict)")
    void updateLifecycle_pause_conflict_whenNotActive() {
        // Trạng thái hiện tại là DRAFT, không thể pause
        when(workspaceRepository.findById(100L)).thenReturn(Optional.of(existingWorkspace));

        WorkspaceLifecycleDto dto = WorkspaceLifecycleDto.builder()
                .action(WorkspaceLifecycleAction.PAUSE)
                .build();

        assertThatThrownBy(() -> service.updateLifecycle(10L, 100L, dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Chỉ có thể tạm dừng không gian đang hoạt động (ACTIVE)");
    }

    @Test
    @DisplayName("Lấy danh sách không gian của Organizer thành công có phân trang")
    void getMyWorkspaces_success() {
        Page<WorkspaceModel> mockPage = new PageImpl<>(List.of(existingWorkspace));
        when(workspaceRepository.searchByOrganizer(eq(10L), eq(WorkspaceStatus.DRAFT), eq("Old"), any(Pageable.class)))
                .thenReturn(mockPage);

        PageRequestDTO pageRequest = new PageRequestDTO();
        pageRequest.setPage(1);
        pageRequest.setSize(10);
        pageRequest.setSearch("Old");

        Page<WorkspaceDto> result = service.getMyWorkspaces(10L, WorkspaceStatus.DRAFT, pageRequest);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getName()).isEqualTo("Old Name");
        assertThat(result.getContent().get(0).getOrganizerId()).isEqualTo(10L);
    }
}
