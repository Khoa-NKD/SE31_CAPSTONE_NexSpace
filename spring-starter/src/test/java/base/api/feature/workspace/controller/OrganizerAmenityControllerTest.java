package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AmenityFilterDto;
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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class OrganizerAmenityControllerTest {

    private MockMvc mockMvc;
    private IAmenityService amenityService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        amenityService = mock(IAmenityService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();

        OrganizerAmenityController controller = new OrganizerAmenityController(amenityService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Organizer GET /api/organizer/amenities trả về danh sách phân trang tiện ích riêng")
    void listMyAmenities_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);

        AmenityResponseDto dto = AmenityResponseDto.builder()
                .id(101L)
                .name("Trà thảo mộc hữu cơ")
                .category(AmenityCategory.COMFORT)
                .organizerId(10L)
                .custom(true)
                .active(true)
                .build();

        when(amenityService.listOrganizerAmenities(eq(10L), any(AmenityFilterDto.class)))
                .thenReturn(new PageImpl<>(List.of(dto), PageRequest.of(0, 20), 1));

        mockMvc.perform(get("/api/organizer/amenities?page=1&size=20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.listObjects[0].name").value("Trà thảo mộc hữu cơ"))
                .andExpect(jsonPath("$.data.listObjects[0].custom").value(true));
    }

    @Test
    @DisplayName("Organizer GET /api/organizer/amenities/available trả về danh sách tiện ích khả dụng")
    void getAvailableAmenities_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);

        AmenityResponseDto standard = AmenityResponseDto.builder()
                .id(1L)
                .name("Wi-Fi chuẩn")
                .category(AmenityCategory.TECH)
                .active(true)
                .build();

        AmenityResponseDto custom = AmenityResponseDto.builder()
                .id(101L)
                .name("Phòng thu Podcast riêng")
                .category(AmenityCategory.SPACE)
                .organizerId(10L)
                .custom(true)
                .active(true)
                .build();

        when(amenityService.getAvailableAmenitiesForOrganizer(10L))
                .thenReturn(List.of(standard, custom));

        mockMvc.perform(get("/api/organizer/amenities/available"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.length()").value(2))
                .andExpect(jsonPath("$.data[1].name").value("Phòng thu Podcast riêng"));
    }

    @Test
    @DisplayName("Organizer POST /api/organizer/amenities tạo tiện ích riêng thành công")
    void createMyAmenity_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);

        CreateAmenityDto req = new CreateAmenityDto();
        req.setName("Máy pha cà phê Cold Brew");
        req.setCategory(AmenityCategory.COMFORT);
        req.setIcon("Coffee");
        req.setDescription("Pha tự động công nghệ ủ lạnh");

        AmenityResponseDto created = AmenityResponseDto.builder()
                .id(200L)
                .name(req.getName())
                .category(req.getCategory())
                .icon(req.getIcon())
                .description(req.getDescription())
                .organizerId(10L)
                .custom(true)
                .active(true)
                .build();

        when(amenityService.createOrganizerAmenity(eq(10L), any(CreateAmenityDto.class)))
                .thenReturn(created);

        mockMvc.perform(post("/api/organizer/amenities")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(200L))
                .andExpect(jsonPath("$.data.name").value("Máy pha cà phê Cold Brew"))
                .andExpect(jsonPath("$.data.custom").value(true));
    }

    @Test
    @DisplayName("Organizer PUT /api/organizer/amenities/{id} cập nhật tiện ích riêng thành công")
    void updateMyAmenity_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);

        UpdateAmenityDto req = new UpdateAmenityDto();
        req.setName("Máy pha cà phê Cold Brew Nitro");
        req.setCategory(AmenityCategory.COMFORT);
        req.setIcon("Coffee");
        req.setDescription("Pha tự động công nghệ ủ lạnh bổ sung Nitro");
        req.setActive(true);

        AmenityResponseDto updated = AmenityResponseDto.builder()
                .id(200L)
                .name(req.getName())
                .category(req.getCategory())
                .icon(req.getIcon())
                .description(req.getDescription())
                .organizerId(10L)
                .custom(true)
                .active(true)
                .build();

        when(amenityService.updateOrganizerAmenity(eq(10L), eq(200L), any(UpdateAmenityDto.class)))
                .thenReturn(updated);

        mockMvc.perform(put("/api/organizer/amenities/200")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.name").value("Máy pha cà phê Cold Brew Nitro"));
    }

    @Test
    @DisplayName("Organizer PATCH /api/organizer/amenities/{id}/status đổi trạng thái tiện ích")
    void toggleMyAmenityStatus_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);
        doNothing().when(amenityService).toggleOrganizerAmenityStatus(10L, 200L, false);

        mockMvc.perform(patch("/api/organizer/amenities/200/status?active=false"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Vô hiệu hóa tiện ích thành công"));
    }

    @Test
    @DisplayName("Organizer DELETE /api/organizer/amenities/{id} xóa tiện ích riêng")
    void deleteMyAmenity_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);
        doNothing().when(amenityService).deleteOrganizerAmenity(10L, 200L);

        mockMvc.perform(delete("/api/organizer/amenities/200"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa tiện ích đối tác thành công"));
    }
}
