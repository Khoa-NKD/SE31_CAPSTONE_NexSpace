package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AssignAmenityItemDto;
import base.api.feature.workspace.dto.request.AssignWorkspaceAmenitiesDto;
import base.api.feature.workspace.dto.response.WorkspaceAmenityResponseDto;
import base.api.feature.workspace.service.IWorkspaceAmenityService;
import base.api.shared.enums.AmenityCategory;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WorkspaceAmenityControllerTest {

    private MockMvc mockMvc;
    private IWorkspaceAmenityService workspaceAmenityService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        workspaceAmenityService = mock(IWorkspaceAmenityService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();

        WorkspaceAmenityController controller = new WorkspaceAmenityController(workspaceAmenityService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/workspaces/{workspaceId}/amenities trả về danh sách tiện ích thành công")
    void getWorkspaceAmenities_Success() throws Exception {
        WorkspaceAmenityResponseDto dto = WorkspaceAmenityResponseDto.builder()
                .id(1L)
                .workspaceId(10L)
                .amenityId(100L)
                .name("High-speed Wi-Fi")
                .category(AmenityCategory.TECH)
                .icon("Wifi")
                .addonPricePerHour(BigDecimal.ZERO)
                .isComplimentary(true)
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(Optional.empty());
        when(workspaceAmenityService.getWorkspaceAmenities(10L, null)).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/workspaces/10/amenities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].amenityId").value(100))
                .andExpect(jsonPath("$.data[0].name").value("High-speed Wi-Fi"))
                .andExpect(jsonPath("$.data[0].complimentary").value(true));
    }

    @Test
    @DisplayName("PUT /api/workspaces/{workspaceId}/amenities đồng bộ tiện ích thành công")
    void syncWorkspaceAmenities_Success() throws Exception {
        AssignAmenityItemDto item = new AssignAmenityItemDto();
        item.setAmenityId(100L);
        item.setAddonPricePerHour(new BigDecimal("20000"));

        AssignWorkspaceAmenitiesDto request = new AssignWorkspaceAmenitiesDto();
        request.setAmenities(List.of(item));

        WorkspaceAmenityResponseDto responseDto = WorkspaceAmenityResponseDto.builder()
                .id(1L)
                .workspaceId(10L)
                .amenityId(100L)
                .name("High-speed Wi-Fi")
                .addonPricePerHour(new BigDecimal("20000"))
                .isComplimentary(false)
                .build();

        when(currentUserProvider.getCurrentUserId()).thenReturn(5L);
        when(workspaceAmenityService.syncWorkspaceAmenities(eq(10L), eq(5L), any(AssignWorkspaceAmenitiesDto.class)))
                .thenReturn(List.of(responseDto));

        mockMvc.perform(put("/api/workspaces/10/amenities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].amenityId").value(100))
                .andExpect(jsonPath("$.data[0].addonPricePerHour").value(20000))
                .andExpect(jsonPath("$.data[0].complimentary").value(false));
    }

    @Test
    @DisplayName("POST /api/workspaces/{workspaceId}/amenities thêm tiện ích thành công")
    void addAmenityToWorkspace_Success() throws Exception {
        AssignAmenityItemDto request = new AssignAmenityItemDto();
        request.setAmenityId(100L);
        request.setAddonPricePerHour(BigDecimal.ZERO);

        WorkspaceAmenityResponseDto responseDto = WorkspaceAmenityResponseDto.builder()
                .id(1L)
                .workspaceId(10L)
                .amenityId(100L)
                .name("High-speed Wi-Fi")
                .addonPricePerHour(BigDecimal.ZERO)
                .isComplimentary(true)
                .build();

        when(currentUserProvider.getCurrentUserId()).thenReturn(5L);
        when(workspaceAmenityService.addAmenityToWorkspace(eq(10L), eq(5L), any(AssignAmenityItemDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/workspaces/10/amenities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.amenityId").value(100));
    }

    @Test
    @DisplayName("POST /api/workspaces/{workspaceId}/amenities thiếu amenityId ném 400 Bad Request")
    void addAmenityToWorkspace_MissingAmenityId_Returns400() throws Exception {
        AssignAmenityItemDto request = new AssignAmenityItemDto();

        mockMvc.perform(post("/api/workspaces/10/amenities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("DELETE /api/workspaces/{workspaceId}/amenities/{amenityId} xóa tiện ích thành công")
    void removeAmenityFromWorkspace_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(5L);

        mockMvc.perform(delete("/api/workspaces/10/amenities/100"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(workspaceAmenityService).removeAmenityFromWorkspace(10L, 100L, 5L);
    }
}
