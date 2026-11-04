package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.CreateAmenityDto;
import base.api.feature.workspace.dto.request.UpdateAmenityDto;
import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.feature.workspace.service.IAmenityService;
import base.api.shared.enums.AmenityCategory;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AmenityControllerTest {

    private MockMvc mockMvc;
    private IAmenityService amenityService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        amenityService = mock(IAmenityService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();

        AmenityController controller = new AmenityController(amenityService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/amenities trả về danh sách tiện ích thành công")
    void getActiveAmenities_Success() throws Exception {
        AmenityResponseDto dto = AmenityResponseDto.builder()
                .id(1L)
                .name("Wi-Fi")
                .category(AmenityCategory.TECH)
                .active(true)
                .build();

        when(amenityService.getActiveAmenities()).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/amenities"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(1))
                .andExpect(jsonPath("$.data[0].name").value("Wi-Fi"));
    }

    @Test
    @DisplayName("POST /api/amenities thành công trả về HTTP 201")
    void createAmenity_Success() throws Exception {
        CreateAmenityDto request = new CreateAmenityDto();
        request.setName("Wi-Fi");
        request.setCategory(AmenityCategory.TECH);
        request.setIcon("Wifi");
        request.setDescription("Wi-Fi tốc độ cao");

        AmenityResponseDto responseDto = AmenityResponseDto.builder()
                .id(10L)
                .name("Wi-Fi")
                .category(AmenityCategory.TECH)
                .icon("Wifi")
                .active(true)
                .build();

        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);
        when(amenityService.createAmenity(eq(100L), any(CreateAmenityDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/amenities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.name").value("Wi-Fi"));
    }

    @Test
    @DisplayName("PUT /api/amenities/{id} cập nhật tiện ích thành công")
    void updateAmenity_Success() throws Exception {
        UpdateAmenityDto request = new UpdateAmenityDto();
        request.setName("Wi-Fi 6E");
        request.setCategory(AmenityCategory.TECH);

        AmenityResponseDto responseDto = AmenityResponseDto.builder()
                .id(10L)
                .name("Wi-Fi 6E")
                .category(AmenityCategory.TECH)
                .active(true)
                .build();

        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);
        when(amenityService.updateAmenity(eq(100L), eq(10L), any(UpdateAmenityDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(put("/api/amenities/10")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Wi-Fi 6E"));
    }

    @Test
    @DisplayName("GET /api/amenities/{id} thành công")
    void getAmenityById_Success() throws Exception {
        AmenityResponseDto dto = AmenityResponseDto.builder()
                .id(5L)
                .name("Bãi đỗ xe")
                .category(AmenityCategory.COMFORT)
                .build();

        when(amenityService.getAmenityById(5L)).thenReturn(dto);

        mockMvc.perform(get("/api/amenities/5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Bãi đỗ xe"));
    }
}
