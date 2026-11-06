package base.api.feature.workspace.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.workspace.dto.request.AdminFeaturedWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminModerationWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminReviewWorkspaceDto;
import base.api.feature.workspace.dto.response.AdminWorkspaceKpisDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceCategory;
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
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class WorkspaceLifecycleModerationTest {

    private IWorkspaceRepository workspaceRepository;
    private IUserRepository userRepository;
    private IWorkspaceOperatingHourRepository operatingHourRepository;
    private WorkspaceServiceImpl service;

    private UserModel organizer;
    private UserModel adminUser;
    private WorkspaceModel workspace;

    @BeforeEach
    void setUp() {
        workspaceRepository = mock(IWorkspaceRepository.class);
        userRepository = mock(IUserRepository.class);
        operatingHourRepository = mock(IWorkspaceOperatingHourRepository.class);
        service = new WorkspaceServiceImpl(workspaceRepository, userRepository, operatingHourRepository);

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
    @DisplayName("Submit: Chuyển từ DRAFT sang PENDING_REVIEW thành công")
    void submitWorkspace_fromDraft_success() {
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkspaceDetailDto result = service.submitWorkspace(10L, 101L);

        assertThat(result).isNotNull();
        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.PENDING_REVIEW);
        assertThat(result.getReviewStatus()).isEqualTo("Pending");
        assertThat(result.getSubmittedAt()).isNotNull();
        verify(workspaceRepository).save(workspace);
    }

    @Test
    @DisplayName("Submit: Chuyển từ REJECTED sang PENDING_REVIEW (Submit lại) thành công")
    void submitWorkspace_fromRejected_success() {
        workspace.setStatus(WorkspaceStatus.REJECTED);
        workspace.setReviewFeedback("Cần cập nhật lại ảnh");

        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        WorkspaceDetailDto result = service.submitWorkspace(10L, 101L);

        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.PENDING_REVIEW);
        assertThat(result.getReviewFeedback()).isNull();
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
                .hasMessageContaining("Chỉ có thể nộp duyệt không gian ở trạng thái DRAFT hoặc REJECTED");
    }

    @Test
    @DisplayName("Admin Review: Approve thành công -> ACTIVE")
    void adminReview_approve_success() {
        workspace.setStatus(WorkspaceStatus.PENDING_REVIEW);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminReviewWorkspaceDto dto = new AdminReviewWorkspaceDto();
        dto.setReviewStatus("Approved");
        dto.setReviewFeedback("Hồ sơ hợp lệ");

        WorkspaceDetailDto result = service.adminReviewWorkspace(99L, 101L, dto);

        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        assertThat(result.getReviewStatus()).isEqualTo("Approved");
        assertThat(result.isListingVisible()).isTrue();
        assertThat(workspace.getReviewedBy()).isEqualTo(adminUser);
        assertThat(workspace.getReviewedAt()).isNotNull();
    }

    @Test
    @DisplayName("Admin Review: Reject thành công -> REJECTED kèm lý do")
    void adminReview_reject_success() {
        workspace.setStatus(WorkspaceStatus.PENDING_REVIEW);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));
        when(workspaceRepository.save(any(WorkspaceModel.class))).thenAnswer(invocation -> invocation.getArgument(0));

        AdminReviewWorkspaceDto dto = new AdminReviewWorkspaceDto();
        dto.setReviewStatus("Rejected");
        dto.setReviewFeedback("Thiếu ảnh giấy phép phòng cháy chữa cháy");

        WorkspaceDetailDto result = service.adminReviewWorkspace(99L, 101L, dto);

        assertThat(result.getStatus()).isEqualTo(WorkspaceStatus.REJECTED);
        assertThat(result.getReviewStatus()).isEqualTo("Rejected");
        assertThat(result.getReviewFeedback()).isEqualTo("Thiếu ảnh giấy phép phòng cháy chữa cháy");
        assertThat(result.isListingVisible()).isFalse();
    }

    @Test
    @DisplayName("Admin Review: Reject thất bại khi lý do dưới 5 ký tự")
    void adminReview_reject_tooShortFeedback_throwsBadRequest() {
        workspace.setStatus(WorkspaceStatus.PENDING_REVIEW);
        when(workspaceRepository.findById(101L)).thenReturn(Optional.of(workspace));
        when(userRepository.findById(99L)).thenReturn(Optional.of(adminUser));

        AdminReviewWorkspaceDto dto = new AdminReviewWorkspaceDto();
        dto.setReviewStatus("Rejected");
        dto.setReviewFeedback("sai");

        assertThatThrownBy(() -> service.adminReviewWorkspace(99L, 101L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Lý do từ chối phải có ít nhất 5 ký tự");
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
    @DisplayName("Admin KPIs: Thống kê số lượng theo trạng thái chính xác")
    void getAdminWorkspaceKpis_returnsAccurateCounts() {
        when(workspaceRepository.count()).thenReturn(20L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.PENDING_REVIEW)).thenReturn(5L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.ACTIVE)).thenReturn(12L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.SUSPENDED)).thenReturn(3L);

        AdminWorkspaceKpisDto kpis = service.getAdminWorkspaceKpis();

        assertThat(kpis.getTotalWorkspaces()).isEqualTo(20L);
        assertThat(kpis.getPendingReviewCount()).isEqualTo(5L);
        assertThat(kpis.getActiveCount()).isEqualTo(12L);
        assertThat(kpis.getSuspendedCount()).isEqualTo(3L);
    }
}

