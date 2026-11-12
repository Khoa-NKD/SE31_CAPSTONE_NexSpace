package base.api.feature.resource.controller;

import base.api.feature.resource.service.PublicFloorMapService;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;

import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicFloorMapControllerTest {

    private MockMvc mockMvc;

    @Mock
    private PublicFloorMapService floorMapService;

    @InjectMocks
    private PublicFloorMapController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id}/floor-maps - Lấy cấu trúc sơ đồ tầng, bàn và phòng họp thành công")
    void testGetFloorMaps_Success() throws Exception {
        PublicFloorMapService.ObjectView desk = new PublicFloorMapService.ObjectView(
                1L,
                "Desk A-01",
                "Hot Desk Window",
                ResourceCategory.DESK,
                new BigDecimal("100.00"),
                new BigDecimal("200.00"),
                new BigDecimal("50.00"),
                new BigDecimal("50.00"),
                BigDecimal.ZERO,
                true,
                1,
                "Hot Desk",
                new BigDecimal("2.50"),
                "Quiet Zone"
        );

        PublicFloorMapService.ObjectView room = new PublicFloorMapService.ObjectView(
                2L,
                "Room M-01",
                "Phòng Họp Sao Mai",
                ResourceCategory.ROOM,
                new BigDecimal("300.00"),
                new BigDecimal("200.00"),
                new BigDecimal("150.00"),
                new BigDecimal("100.00"),
                BigDecimal.ZERO,
                true,
                8,
                "Meeting Room",
                new BigDecimal("15.00"),
                "Collab Area"
        );

        PublicFloorMapService.FloorView floorView = new PublicFloorMapService.FloorView(
                10L,
                "Tầng 1 - Coworking Floor",
                new BigDecimal("1200.00"),
                new BigDecimal("800.00"),
                List.of(desk, room),
                Collections.emptyList(),
                null
        );

        when(floorMapService.maps(1L)).thenReturn(List.of(floorView));

        // Test dual routing (/api/v1 and /api)
        mockMvc.perform(get("/api/v1/public/workspaces/1/floor-maps")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(10))
                .andExpect(jsonPath("$.data[0].name").value("Tầng 1 - Coworking Floor"))
                .andExpect(jsonPath("$.data[0].resources[0].code").value("Desk A-01"))
                .andExpect(jsonPath("$.data[0].resources[0].category").value("DESK"))
                .andExpect(jsonPath("$.data[0].resources[0].capacity").value(1))
                .andExpect(jsonPath("$.data[0].resources[1].code").value("Room M-01"))
                .andExpect(jsonPath("$.data[0].resources[1].category").value("ROOM"))
                .andExpect(jsonPath("$.data[0].resources[1].capacity").value(8))
                .andExpect(jsonPath("$.data[0].resources[1].pricePerHour").value(15.00));

        verify(floorMapService).maps(1L);
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id}/floor-maps - Ném NotFound (404) khi không tìm thấy sơ đồ")
    void testGetFloorMaps_NotFound() throws Exception {
        when(floorMapService.maps(999L)).thenThrow(new NotFoundException("Workspace map not found"));

        mockMvc.perform(get("/api/v1/public/workspaces/999/floor-maps")
                        .accept(MediaType.APPLICATION_JSON))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));

        verify(floorMapService).maps(999L);
    }
}
