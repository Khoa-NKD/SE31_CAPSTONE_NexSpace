package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AmenityFilterDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.service.IAmenityService;
import base.api.shared.enums.AmenityCategory;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminAmenityControllerTest {

    private MockMvc mockMvc;
    private IAmenityService amenityService;
    private CurrentUserProvider currentUserProvider;

    @BeforeEach
    void setUp() {
        amenityService = mock(IAmenityService.class);
        currentUserProvider = mock(CurrentUserProvider.class);

        AdminAmenityController controller = new AdminAmenityController(amenityService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Admin GET /api/admin/amenities trả về danh sách phân trang")
    void listAmenities_Success() throws Exception {
        AmenityResponseDto dto = AmenityResponseDto.builder()
                .id(1L)
                .name("Wi-Fi")
                .category(AmenityCategory.TECH)
                .active(true)
                .build();

        when(amenityService.listAmenities(any(AmenityFilterDto.class)))
                .thenReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/admin/amenities?page=1&size=20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.listObjects[0].name").value("Wi-Fi"));
    }

    @Test
    @DisplayName("Admin PATCH /api/admin/amenities/{id}/status đổi trạng thái thành công")
    void toggleAmenityStatus_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(1L);
        doNothing().when(amenityService).toggleAmenityStatus(1L, 20L, false);

        mockMvc.perform(patch("/api/admin/amenities/20/status?active=false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Vô hiệu hóa tiện ích thành công"));
    }

    @Test
    @DisplayName("Admin DELETE /api/admin/amenities/{id} xóa tiện ích thành công")
    void deleteAmenity_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(1L);
        doNothing().when(amenityService).deleteAmenity(1L, 20L);

        mockMvc.perform(delete("/api/admin/amenities/20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa tiện ích thành công"));
    }
}
