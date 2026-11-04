package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.CreateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.CreateWorkspaceAssetDto;
import base.api.feature.workspace.dto.request.UpdateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceAssetDto;
import base.api.feature.workspace.dto.response.MaintenanceLogResponseDto;
import base.api.feature.workspace.dto.response.WorkspaceAssetResponseDto;
import base.api.feature.workspace.service.IWorkspaceAssetService;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.AssetStatus;
import base.api.shared.enums.MaintenanceStatus;
import base.api.shared.enums.MaintenanceType;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WorkspaceAssetControllerTest {

    private MockMvc mockMvc;
    private IWorkspaceAssetService workspaceAssetService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        workspaceAssetService = mock(IWorkspaceAssetService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        WorkspaceAssetController controller = new WorkspaceAssetController(workspaceAssetService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private void mockAuth(Long userId) {
        when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    }

    @Test
    @DisplayName("GET /api/workspaces/{id}/assets - Trả về danh sách tài sản phân trang")
    void getAssets_Success() throws Exception {
        mockAuth(10L);
        WorkspaceAssetResponseDto assetDto = WorkspaceAssetResponseDto.builder()
                .id(1L)
                .workspaceId(1L)
                .assetCode("PRJ-001")
                .name("Máy chiếu Epson EB-X06")
                .quantity(1)
                .status(AssetStatus.IN_USE)
                .purchasePrice(BigDecimal.valueOf(12500000))
                .build();

        PageResponseDTO<WorkspaceAssetResponseDto> pageResponse = new PageResponseDTO<>(
                List.of(assetDto), 1, 20, 1L, 1, false, false
        );

        when(workspaceAssetService.getWorkspaceAssets(eq(1L), any(), any(), anyBoolean(), any(), eq(10L)))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/workspaces/1/assets"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.listObjects[0].assetCode").value("PRJ-001"))
                .andExpect(jsonPath("$.data.listObjects[0].name").value("Máy chiếu Epson EB-X06"));
    }

    @Test
    @DisplayName("GET /api/workspaces/{id}/assets/{assetId} - Lấy chi tiết tài sản")
    void getAssetById_Success() throws Exception {
        mockAuth(10L);
        WorkspaceAssetResponseDto assetDto = WorkspaceAssetResponseDto.builder()
                .id(100L)
                .workspaceId(1L)
                .assetCode("AIR-001")
                .name("Điều hòa Daikin Inverter")
                .quantity(2)
                .status(AssetStatus.IN_USE)
                .build();

        when(workspaceAssetService.getAssetById(1L, 100L, 10L)).thenReturn(assetDto);

        mockMvc.perform(get("/api/workspaces/1/assets/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(100))
                .andExpect(jsonPath("$.data.assetCode").value("AIR-001"));
    }

    @Test
    @DisplayName("POST /api/workspaces/{id}/assets - Tạo tài sản thành công trả về 201")
    void createAsset_Success() throws Exception {
        mockAuth(10L);
        CreateWorkspaceAssetDto createDto = CreateWorkspaceAssetDto.builder()
                .assetCode("DSK-001")
                .name("Bàn làm việc gỗ sồi")
                .quantity(5)
                .status(AssetStatus.IN_USE)
                .purchasePrice(BigDecimal.valueOf(5000000))
                .purchaseDate(LocalDate.of(2025, 1, 15))
                .build();

        WorkspaceAssetResponseDto responseDto = WorkspaceAssetResponseDto.builder()
                .id(200L)
                .workspaceId(1L)
                .assetCode("DSK-001")
                .name("Bàn làm việc gỗ sồi")
                .quantity(5)
                .status(AssetStatus.IN_USE)
                .build();

        when(workspaceAssetService.createAsset(eq(1L), any(CreateWorkspaceAssetDto.class), eq(10L)))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/workspaces/1/assets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(200))
                .andExpect(jsonPath("$.data.assetCode").value("DSK-001"));
    }

    @Test
    @DisplayName("POST /api/workspaces/{id}/assets - Validation lỗi khi thiếu assetCode hoặc name")
    void createAsset_ValidationError() throws Exception {
        mockAuth(10L);
        CreateWorkspaceAssetDto invalidDto = CreateWorkspaceAssetDto.builder()
                .assetCode("") // blank
                .name("") // blank
                .quantity(0) // must be > 0
                .build();

        mockMvc.perform(post("/api/workspaces/1/assets")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("PUT /api/workspaces/{id}/assets/{assetId} - Cập nhật tài sản thành công")
    void updateAsset_Success() throws Exception {
        mockAuth(10L);
        UpdateWorkspaceAssetDto updateDto = UpdateWorkspaceAssetDto.builder()
                .assetCode("PRJ-001-MOD")
                .name("Máy chiếu Epson EB-X06 Nâng cấp")
                .quantity(1)
                .status(AssetStatus.UNDER_MAINTENANCE)
                .build();

        WorkspaceAssetResponseDto updatedDto = WorkspaceAssetResponseDto.builder()
                .id(1L)
                .workspaceId(1L)
                .assetCode("PRJ-001-MOD")
                .name("Máy chiếu Epson EB-X06 Nâng cấp")
                .status(AssetStatus.UNDER_MAINTENANCE)
                .build();

        when(workspaceAssetService.updateAsset(eq(1L), eq(1L), any(UpdateWorkspaceAssetDto.class), eq(10L)))
                .thenReturn(updatedDto);

        mockMvc.perform(put("/api/workspaces/1/assets/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.assetCode").value("PRJ-001-MOD"));
    }

    @Test
    @DisplayName("DELETE /api/workspaces/{id}/assets/{assetId} - Xóa tài sản thành công")
    void deleteAsset_Success() throws Exception {
        mockAuth(10L);

        mockMvc.perform(delete("/api/workspaces/1/assets/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(workspaceAssetService).deleteAsset(1L, 1L, 10L);
    }

    @Test
    @DisplayName("GET /api/workspaces/{id}/assets/{assetId}/maintenance - Lấy lịch sử bảo trì")
    void getMaintenanceLogs_Success() throws Exception {
        mockAuth(10L);
        MaintenanceLogResponseDto logDto = MaintenanceLogResponseDto.builder()
                .id(50L)
                .assetId(1L)
                .assetCode("PRJ-001")
                .maintenanceType(MaintenanceType.REPAIR)
                .status(MaintenanceStatus.SCHEDULED)
                .description("Thay bóng đèn máy chiếu")
                .cost(BigDecimal.valueOf(1500000))
                .build();

        when(workspaceAssetService.getMaintenanceLogs(1L, 1L, 10L)).thenReturn(List.of(logDto));

        mockMvc.perform(get("/api/workspaces/1/assets/1/maintenance"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(50))
                .andExpect(jsonPath("$.data[0].maintenanceType").value("REPAIR"));
    }

    @Test
    @DisplayName("POST /api/workspaces/{id}/assets/{assetId}/maintenance - Tạo lịch bảo trì thành công trả về 201")
    void createMaintenanceLog_Success() throws Exception {
        mockAuth(10L);
        CreateMaintenanceLogDto createLogDto = CreateMaintenanceLogDto.builder()
                .maintenanceType(MaintenanceType.INSPECTION)
                .description("Kiểm tra định kỳ điều hòa")
                .performedBy("Daikin VN")
                .cost(BigDecimal.valueOf(500000))
                .build();

        MaintenanceLogResponseDto responseDto = MaintenanceLogResponseDto.builder()
                .id(60L)
                .assetId(1L)
                .assetCode("AIR-001")
                .maintenanceType(MaintenanceType.INSPECTION)
                .status(MaintenanceStatus.SCHEDULED)
                .description("Kiểm tra định kỳ điều hòa")
                .build();

        when(workspaceAssetService.createMaintenanceLog(eq(1L), eq(1L), any(CreateMaintenanceLogDto.class), eq(10L)))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/workspaces/1/assets/1/maintenance")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(createLogDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(60));
    }

    @Test
    @DisplayName("PATCH /api/workspaces/{id}/assets/{assetId}/maintenance/{logId} - Cập nhật tiến độ bảo trì")
    void updateMaintenanceLog_Success() throws Exception {
        mockAuth(10L);
        UpdateMaintenanceLogDto updateLogDto = UpdateMaintenanceLogDto.builder()
                .status(MaintenanceStatus.COMPLETED)
                .resultNote("Đã thay mới linh kiện và hoạt động tốt")
                .cost(BigDecimal.valueOf(1200000))
                .build();

        MaintenanceLogResponseDto responseDto = MaintenanceLogResponseDto.builder()
                .id(60L)
                .assetId(1L)
                .status(MaintenanceStatus.COMPLETED)
                .resultNote("Đã thay mới linh kiện và hoạt động tốt")
                .build();

        when(workspaceAssetService.updateMaintenanceLog(eq(1L), eq(1L), eq(60L), any(UpdateMaintenanceLogDto.class), eq(10L)))
                .thenReturn(responseDto);

        mockMvc.perform(patch("/api/workspaces/1/assets/1/maintenance/60")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(updateLogDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("COMPLETED"));
    }
}

