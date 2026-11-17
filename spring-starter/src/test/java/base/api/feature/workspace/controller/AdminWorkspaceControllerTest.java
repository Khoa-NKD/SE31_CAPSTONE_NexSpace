package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AdminFeaturedWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminModerationWorkspaceDto;
import base.api.feature.workspace.dto.response.AdminWorkspaceKpisDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminWorkspaceControllerTest {

    private MockMvc mockMvc;
    private IWorkspaceService workspaceService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        workspaceService = mock(IWorkspaceService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();

        AdminWorkspaceController controller = new AdminWorkspaceController(workspaceService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        when(currentUserProvider.getCurrentUserId()).thenReturn(99L);
        when(currentUserProvider.isAdmin()).thenReturn(true);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Admin GET /api/admin/workspaces trả về danh sách phân trang thành công")
    void getAdminWorkspaces_success() throws Exception {
        WorkspaceDto dto = WorkspaceDto.builder()
                .id(101L)
                .name("Saigon Central")
                .status(WorkspaceStatus.ACTIVE)
                .build();

        when(workspaceService.getAdminWorkspaces(any(), any(), any(), any(PageRequestDTO.class)))
                .thenReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/workspaces")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].id").value(101))
                .andExpect(jsonPath("$.data.content[0].name").value("Saigon Central"));
    }

    @Test
    @DisplayName("Admin GET /api/admin/workspaces/kpis trả về số lượng thống kê hệ thống và theo trạng thái")
    void getAdminWorkspaceKpis_success() throws Exception {
        AdminWorkspaceKpisDto kpis = AdminWorkspaceKpisDto.builder()
                .totalPlatformUsers(1200)
                .activeOrganizers(45)
                .activeWorkspaces(18)
                .totalBookings(350)
                .totalWorkspaces(25)
                .pendingCount(4)
                .maintenanceCount(2)
                .draftCount(1)
                .activeCount(18)
                .suspendedCount(3)
                .build();

        when(workspaceService.getAdminWorkspaceKpis()).thenReturn(kpis);

        mockMvc.perform(get("/api/admin/workspaces/kpis"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalPlatformUsers").value(1200))
                .andExpect(jsonPath("$.data.activeOrganizers").value(45))
                .andExpect(jsonPath("$.data.activeWorkspaces").value(18))
                .andExpect(jsonPath("$.data.totalBookings").value(350))
                .andExpect(jsonPath("$.data.totalWorkspaces").value(25))
                .andExpect(jsonPath("$.data.pendingCount").value(4))
                .andExpect(jsonPath("$.data.maintenanceCount").value(2))
                .andExpect(jsonPath("$.data.activeCount").value(18))
                .andExpect(jsonPath("$.data.suspendedCount").value(3));
    }

    @Test
    @DisplayName("Admin GET /api/admin/workspaces/{id} trả về chi tiết không gian làm việc thành công")
    void getAdminWorkspaceDetail_success() throws Exception {
        WorkspaceDetailDto detail = WorkspaceDetailDto.builder()
                .id(101L)
                .name("Saigon Central")
                .description("Modern workspace")
                .status(WorkspaceStatus.PENDING)
                .reviewStatus("Pending")
                .operatingStatus("Pending")
                .moderationStatus("Normal")
                .bookingCount(14L)
                .totalBookings(14L)
                .version(1)
                .build();

        when(workspaceService.getWorkspaceDetail(null, 101L)).thenReturn(detail);

        mockMvc.perform(get("/api/admin/workspaces/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(101))
                .andExpect(jsonPath("$.data.name").value("Saigon Central"))
                .andExpect(jsonPath("$.data.reviewStatus").value("Pending"))
                .andExpect(jsonPath("$.data.bookingCount").value(14));
    }

    @Test
    @DisplayName("Admin PATCH /api/admin/workspaces/{id}/moderation đình chỉ thành công")
    void adminModerateWorkspace_suspend_success() throws Exception {
        AdminModerationWorkspaceDto dto = new AdminModerationWorkspaceDto();
        dto.setModerationStatus("Suspended");
        dto.setReason("Vi phạm tiêu chuẩn PCCC");

        WorkspaceDetailDto result = WorkspaceDetailDto.builder()
                .id(101L)
                .name("Saigon Central")
                .status(WorkspaceStatus.SUSPENDED)
                .moderationStatus("Suspended")
                .build();

        when(workspaceService.adminModerateWorkspace(eq(99L), eq(101L), any(AdminModerationWorkspaceDto.class)))
                .thenReturn(result);

        mockMvc.perform(patch("/api/admin/workspaces/101/moderation")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("SUSPENDED"));
    }

    @Test
    @DisplayName("Admin PATCH /api/admin/workspaces/{id}/featured đánh dấu nổi bật thành công")
    void adminSetFeatured_success() throws Exception {
        AdminFeaturedWorkspaceDto dto = new AdminFeaturedWorkspaceDto();
        dto.setIsFeatured(true);
        dto.setFeaturedOrder(1);

        WorkspaceDetailDto result = WorkspaceDetailDto.builder()
                .id(101L)
                .name("Saigon Central")
                .status(WorkspaceStatus.ACTIVE)
                .featuredOrder(1)
                .build();

        when(workspaceService.adminSetFeatured(eq(99L), eq(101L), any(AdminFeaturedWorkspaceDto.class)))
                .thenReturn(result);

        mockMvc.perform(patch("/api/admin/workspaces/101/featured")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.featuredOrder").value(1));
    }
}

