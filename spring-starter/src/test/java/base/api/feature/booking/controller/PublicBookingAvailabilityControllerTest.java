package base.api.feature.booking.controller;

import base.api.feature.booking.dto.response.ResourceAvailabilityDto;
import base.api.feature.booking.service.IBookingService;
import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.shared.exception.GlobalExceptionHandler;
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
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class PublicBookingAvailabilityControllerTest {

    private MockMvc mockMvc;

    @Mock
    private IBookingService bookingService;

    @InjectMocks
    private PublicBookingAvailabilityController controller;

    @BeforeEach
    void setUp() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id}/availability - Trả về danh sách chỗ trống trên sơ đồ")
    void testGetAvailability_Success() throws Exception {
        ResourceAvailabilityDto item1 = ResourceAvailabilityDto.builder()
                .resourceId(1L)
                .code("Desk A-01")
                .name("Hot Desk Window")
                .state(AvailabilityState.AVAILABLE)
                .pricePerHour(new BigDecimal("50000.00"))
                .selectable(true)
                .build();

        ResourceAvailabilityDto item2 = ResourceAvailabilityDto.builder()
                .resourceId(2L)
                .code("Desk A-02")
                .name("Hot Desk Inner")
                .state(AvailabilityState.BOOKED)
                .pricePerHour(new BigDecimal("50000.00"))
                .selectable(false)
                .build();

        when(bookingService.getFloorAvailability(eq(1L), any(), any(), any()))
                .thenReturn(List.of(item1, item2));

        String startTime = "2026-11-20T09:00:00";
        String endTime = "2026-11-20T13:00:00";

        mockMvc.perform(get("/api/v1/public/workspaces/1/availability")
                        .param("startTime", startTime)
                        .param("endTime", endTime)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].code").value("Desk A-01"))
                .andExpect(jsonPath("$.data[0].state").value("AVAILABLE"))
                .andExpect(jsonPath("$.data[0].selectable").value(true))
                .andExpect(jsonPath("$.data[1].code").value("Desk A-02"))
                .andExpect(jsonPath("$.data[1].state").value("BOOKED"))
                .andExpect(jsonPath("$.data[1].selectable").value(false));
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id}/availability - Ném BadRequest (400) khi thiếu tham số bắt buộc")
    void testGetAvailability_ThrowsBadRequest_WhenMissingParams() throws Exception {
        // Missing endTime
        mockMvc.perform(get("/api/v1/public/workspaces/1/availability")
                        .param("startTime", "2026-11-20T09:00:00")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/v1/public/workspaces/{id}/availability - Ném BadRequest (400) khi endTime <= startTime")
    void testGetAvailability_ThrowsBadRequest_WhenEndTimeBeforeStartTime() throws Exception {
        String startTime = "2026-11-20T14:00:00";
        String endTime = "2026-11-20T10:00:00";

        when(bookingService.getFloorAvailability(eq(1L), any(), any(), any()))
                .thenThrow(new base.api.shared.exception.BadRequestException("Thời gian kết thúc phải diễn ra sau thời gian bắt đầu"));

        mockMvc.perform(get("/api/v1/public/workspaces/1/availability")
                        .param("startTime", startTime)
                        .param("endTime", endTime)
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Thời gian kết thúc phải diễn ra sau thời gian bắt đầu"));
    }
}
