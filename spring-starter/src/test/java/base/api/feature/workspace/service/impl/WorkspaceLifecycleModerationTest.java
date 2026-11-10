package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.workspace.dto.request.AdminFeaturedWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminModerationWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.AdminWorkspaceKpisDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceLifecycleAction;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkspaceLifecycleModerationTest {

    private IWorkspaceRepository workspaceRepository;
    private IUserRepository userRepository;
    private IWorkspaceOperatingHourRepository operatingHourRepository;
    private IBookingRepository bookingRepository;
    private WorkspaceServiceImpl service;

    private UserModel organizer;
    private UserModel adminUser;
    private WorkspaceModel workspace;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(IWorkspaceRepository.class);
        userRepository = mock(IUserRepository.class);
        operatingHourRepository = mock(IWorkspaceOperatingHourRepository.class);
        bookingRepository = mock(IBookingRepository.class);
        service = new WorkspaceServiceImpl(workspaceRepository, userRepository, operatingHourRepository, bookingRepository);

        organizer = new UserModel();
        organizer.setId(10L);
        organizer.setUserName("organizer1");
        organizer.setFirstName("Hien");
        organizer.setLastName("Nguyen");

        adminUser = new UserModel();
        adminUser.setId(99L);
        adminUser.setUserName("admin1");
        adminUser.setFirstName("Admin");
        adminUser.setLastName("System");

        workspace = new WorkspaceModel();
        workspace.setId(101L);
        workspace.setName("NexSpace Central");
        workspace.setOrganizer(organizer);
        workspace.setCategory(WorkspaceCategory.COWORKING_HUB);
        workspace.setAddress("123 Le Loi");
        workspace.setDistrict("District 1");
        workspace.setCity("Ho Chi Minh City");
        workspace.setAreaSqm(new BigDecimal("250.0"));
        workspace.setBookingConfirmationMode(BookingConfirmationMode.INSTANT);
        workspace.setStatus(WorkspaceStatus.DRAFT);
    }

    @Test
    @DisplayName("Submit: Đăng tải từ DRAFT tự động kích hoạt sang ACTIVE thành công")
    void submitWorkspace_fromDraft_autoApprovesToActive() {
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));
        when(bookingRepository.countByWorkspaceId(101L)).thenReturn(5L);

        WorkspaceDetailDto result = service.submitWorkspace(10L, 101L);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        assertThat(result.getReviewStatus()).isEqualTo("Approved");
        assertThat(result.getOperatingStatus()).isEqualTo("Active");
        assertThat(result.isListingVisible()).isTrue();
        assertThat(result.getSubmittedAt()).isNotNull();
        assertThat(result.getReviewedAt()).isNotNull();
        assertThat(result.getBookingCount()).isEqualTo(5L);
        verify(workspaceRepository).save(workspace);
    }

    @Test
    @DisplayName("Submit: Đăng tải từ PENDING tự động kích hoạt sang ACTIVE thành công")
    void submitWorkspace_fromPending_autoApprovesToActive() {
        workspace.setStatus(WorkspaceStatus.PENDING);

        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkspaceDetailDto result = service.submitWorkspace(10L, 101L);

        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        assertThat(result.getReviewStatus()).isEqualTo("Approved");
        assertThat(result.isListingVisible()).isTrue();
    }

    @Test
    @DisplayName("Submit: Thất bại khi ném NotFoundException do không phải chủ sở hữu (Strict Ownership Defense)")
    void submitWorkspace_wrongOrganizer_throwsNotFound() {
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));

        assertThatThrownBy(() -> service.submitWorkspace(999L, 101L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy không gian làm việc với ID: 101");
    }

    @Test
    @DisplayName("Submit: Ném ConflictException khi workspace đang ACTIVE")
    void submitWorkspace_alreadyActive_throwsConflict() {
        workspace.setStatus(WorkspaceStatus.ACTIVE);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));

        assertThatThrownBy(() -> service.submitWorkspace(10L, 101L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Chỉ có thể đăng kích hoạt không gian ở trạng thái DRAFT, PENDING hoặc MAINTENANCE");
    }

    @Test
    @DisplayName("Lifecycle: Chuyển đổi trạng thái giữa DRAFT -> PENDING -> ACTIVE -> MAINTENANCE -> ACTIVE")
    void updateLifecycle_organizerStatusFlow_success() {
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        // 1. DRAFT -> PENDING
        WorkspaceLifecycleDto toPending = WorkspaceLifecycleDto.builder()
                .action(WorkspaceLifecycleAction.PENDING)
                .build();
        WorkspaceDetailDto pendingResult = service.updateLifecycle(10L, 101L, toPending);
        assertThat(pendingResult.getStatus()).isEqualTo(WorkspaceStatus.PENDING);
        assertThat(pendingResult.getOperatingStatus()).isEqualTo("Pending");
        assertThat(pendingResult.isListingVisible()).isFalse();

        // 2. PENDING -> ACTIVE
        WorkspaceLifecycleDto toActive = WorkspaceLifecycleDto.builder()
                .action(WorkspaceLifecycleAction.ACTIVATE)
                .build();
        WorkspaceDetailDto activeResult = service.updateLifecycle(10L, 101L, toActive);
        assertThat(activeResult.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        assertThat(activeResult.getOperatingStatus()).isEqualTo("Active");
        assertThat(activeResult.isListingVisible()).isTrue();

        // 3. ACTIVE -> MAINTENANCE
        WorkspaceLifecycleDto toMaintenance = WorkspaceLifecycleDto.builder()
                .action(WorkspaceLifecycleAction.MAINTENANCE)
                .reason("Bảo trì định kỳ điều hòa")
                .build();
        WorkspaceDetailDto maintenanceResult = service.updateLifecycle(10L, 101L, toMaintenance);
        assertThat(maintenanceResult.getStatus()).isEqualTo(WorkspaceStatus.MAINTENANCE);
        assertThat(maintenanceResult.getOperatingStatus()).isEqualTo("Maintenance");
        assertThat(maintenanceResult.isListingVisible()).isFalse();

        // 4. MAINTENANCE -> ACTIVE (RESUME)
        WorkspaceLifecycleDto toResume = WorkspaceLifecycleDto.builder()
                .action(WorkspaceLifecycleAction.RESUME)
                .build();
        WorkspaceDetailDto resumedResult = service.updateLifecycle(10L, 101L, toResume);
        assertThat(resumedResult.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        assertThat(resumedResult.isListingVisible()).isTrue();
    }

    @Test
    @DisplayName("Admin Moderation: Suspend thành công khi workspace đang ACTIVE")
    void adminModerate_suspend_success() {
        workspace.setStatus(WorkspaceStatus.ACTIVE);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminModerationWorkspaceDto dto = new AdminModerationWorkspaceDto();
        dto.setModerationStatus("Suspended");
        dto.setReason("Phát hiện khiếu nại về an toàn vệ sinh");

        WorkspaceDetailDto result = service.adminModerateWorkspace(99L, 101L, dto);

        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.SUSPENDED);
        assertThat(result.getModerationStatus()).isEqualTo("Suspended");
        assertThat(result.isListingVisible()).isFalse();
        assertThat(workspace.getReviewFeedback()).isEqualTo("Phát hiện khiếu nại về an toàn vệ sinh");
    }

    @Test
    @DisplayName("Admin Moderation: Reactivate thành công từ SUSPENDED -> ACTIVE")
    void adminModerate_reactivate_success() {
        workspace.setStatus(WorkspaceStatus.SUSPENDED);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminModerationWorkspaceDto dto = new AdminModerationWorkspaceDto();
        dto.setModerationStatus("Normal");

        WorkspaceDetailDto result = service.adminModerateWorkspace(99L, 101L, dto);

        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        assertThat(result.getModerationStatus()).isEqualTo("Normal");
        assertThat(result.isListingVisible()).isTrue();
        assertThat(workspace.getReviewFeedback()).isNull();
    }

    @Test
    @DisplayName("Admin Featured: Ghim thành công khi workspace ACTIVE")
    void adminSetFeatured_activeWorkspace_success() {
        workspace.setStatus(WorkspaceStatus.ACTIVE);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminFeaturedWorkspaceDto dto = new AdminFeaturedWorkspaceDto();
        dto.setIsFeatured(true);
        dto.setFeaturedOrder(1);
        dto.setFeaturedUntil(LocalDateTime.now().plusDays(30));

        WorkspaceDetailDto result = service.adminSetFeatured(99L, 101L, dto);

        assertThat(result.getFeaturedOrder()).isEqualTo(1);
        assertThat(result.getFeaturedUntil()).isNotNull();
    }

    @Test
    @DisplayName("Admin Featured: Ghim thất bại (409 Conflict) khi workspace KHÔNG ACTIVE (User Rule 3)")
    void adminSetFeatured_nonActiveWorkspace_throwsConflict() {
        workspace.setStatus(WorkspaceStatus.DRAFT);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));

        AdminFeaturedWorkspaceDto dto = new AdminFeaturedWorkspaceDto();
        dto.setIsFeatured(true);
        dto.setFeaturedOrder(1);

        assertThatThrownBy(() -> service.adminSetFeatured(99L, 101L, dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Chỉ có thể đánh dấu nổi bật không gian đang hoạt động (ACTIVE)");
    }

    @Test
    @DisplayName("Admin KPIs: Thống kê số lượng hệ thống và theo trạng thái chính xác")
    void getAdminWorkspaceKpis_returnsAccurateCounts() {
        when(userRepository.count()).thenReturn(1500L);
        when(userRepository.countByRoleNameAndStatus(UserRole.ORGANIZER.name(), UserStatus.ACTIVE)).thenReturn(42L);
        when(bookingRepository.count()).thenReturn(680L);
        when(workspaceRepository.count()).thenReturn(20L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.PENDING)).thenReturn(3L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.MAINTENANCE)).thenReturn(2L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.DRAFT)).thenReturn(1L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.ACTIVE)).thenReturn(12L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.SUSPENDED)).thenReturn(2L);

        AdminWorkspaceKpisDto kpis = service.getAdminWorkspaceKpis();

        assertThat(kpis.getTotalPlatformUsers()).isEqualTo(1500L);
        assertThat(kpis.getActiveOrganizers()).isEqualTo(42L);
        assertThat(kpis.getActiveWorkspaces()).isEqualTo(12L);
        assertThat(kpis.getTotalBookings()).isEqualTo(680L);
        assertThat(kpis.getTotalWorkspaces()).isEqualTo(20L);
        assertThat(kpis.getPendingCount()).isEqualTo(3L);
        assertThat(kpis.getMaintenanceCount()).isEqualTo(2L);
        assertThat(kpis.getDraftCount()).isEqualTo(1L);
        assertThat(kpis.getActiveCount()).isEqualTo(12L);
        assertThat(kpis.getSuspendedCount()).isEqualTo(2L);
    }
}

