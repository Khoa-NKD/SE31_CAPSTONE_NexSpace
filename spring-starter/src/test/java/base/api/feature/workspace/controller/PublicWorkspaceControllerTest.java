package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicWorkspaceControllerTest {

    private MockMvc mockMvc;

    @Mock
    private IWorkspaceService workspaceService;

    @InjectMocks
    private PublicWorkspaceController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id} - Xem chi tiết public thành công")
    void getPublicWorkspaceDetail_success() throws Exception {
        WorkspaceDetailDto responseDto = WorkspaceDetailDto.builder()
                .id(1L)
                .name("Public Central Hub")
                .category(WorkspaceCategory.COWORKING_HUB)
                .status(WorkspaceStatus.ACTIVE)
                .isListingVisible(true)
                .build();

        when(workspaceService.getPublicWorkspaceDetail(1L)).thenReturn(responseDto);

        mockMvc.perform(get("/api/v1/public/workspaces/1")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.listingVisible").value(true));

        verify(workspaceService).getPublicWorkspaceDetail(1L);
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id} - Thất bại 404 khi workspace không tồn tại hoặc chưa ACTIVE")
    void getPublicWorkspaceDetail_notFound() throws Exception {
        when(workspaceService.getPublicWorkspaceDetail(99L))
                .thenThrow(new NotFoundException("Không tìm thấy không gian làm việc hoặc không gian chưa được kích hoạt"));

        mockMvc.perform(get("/api/v1/public/workspaces/99")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(404));

        verify(workspaceService).getPublicWorkspaceDetail(99L);
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces - Lấy danh sách không gian công khai có phân trang")
    void getPublicWorkspaces_success() throws Exception {
        WorkspaceDto dto = WorkspaceDto.builder()
                .id(1L)
                .name("Public Central Hub")
                .status(WorkspaceStatus.ACTIVE)
                .build();
        Page<WorkspaceDto> page = new PageImpl<>(List.of(dto));

        when(workspaceService.getPublicWorkspaces(any(PageRequestDTO.class))).thenReturn(page);

        mockMvc.perform(get("/api/v1/public/workspaces?page=1&size=10")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].name").value("Public Central Hub"));

        verify(workspaceService).getPublicWorkspaces(any(PageRequestDTO.class));
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id}/operating-hours - Xem giờ mở cửa công khai thành công")
    void getPublicOperatingHours_success() throws Exception {
        base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto dto = base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto.builder()
                .dayOfWeek(1)
                .openTime(java.time.LocalTime.of(7, 30))
                .closeTime(java.time.LocalTime.of(22, 30))
                .isClosed(false)
                .build();

        when(workspaceService.getPublicOperatingHours(1L)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/public/workspaces/1/operating-hours")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].dayOfWeek").value(1))
                .andExpect(jsonPath("$.data[0].openTime").value("07:30"));

        verify(workspaceService).getPublicOperatingHours(1L);
    }
}

