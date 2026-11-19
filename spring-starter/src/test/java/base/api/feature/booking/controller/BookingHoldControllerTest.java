package base.api.feature.booking.controller;

import base.api.feature.booking.dto.request.HoldResourceRequestDto;
import base.api.feature.booking.dto.response.HoldResourceResponseDto;
import base.api.feature.booking.service.IResourceHoldService;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BookingHoldControllerTest {

    private MockMvc mockMvc;

    @Mock
    private IResourceHoldService resourceHoldService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private BookingHoldController controller;

    private ObjectMapper objectMapper;

    private static final Long CUSTOMER_ID = 42L;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/bookings/hold -> 201 Created và envelope chuẩn")
    void holdResource_ShouldReturn201() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(CUSTOMER_ID);

        LocalDateTime start = LocalDateTime.now().plusDays(1).withHour(9).withMinute(0);
        LocalDateTime end = start.plusHours(2);

        HoldResourceRequestDto request = HoldResourceRequestDto.builder()
                .resourceId(101L)
                .startTime(start)
                .endTime(end)
                .build();

        HoldResourceResponseDto responseDto = HoldResourceResponseDto.builder()
                .bookingId(999L)
                .bookingCode("BK-20261125-HOLD01")
                .resourceId(101L)
                .resourceName("Desk A-01")
                .workspaceId(1L)
                .workspaceName("NexSpace Da Nang")
                .startTime(start)
                .endTime(end)
                .holdExpiresAt(LocalDateTime.now().plusMinutes(10))
                .serverTime(LocalDateTime.now())
                .ttlSeconds(600)
                .isReused(false)
                .baseAmount(BigDecimal.valueOf(100000))
                .finalPrice(BigDecimal.valueOf(110000))
                .currency("VND")
                .build();

        when(resourceHoldService.holdResource(eq(CUSTOMER_ID), any())).thenReturn(responseDto);

        mockMvc.perform(post("/api/bookings/hold")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingId").value(999))
                .andExpect(jsonPath("$.data.bookingCode").value("BK-20261125-HOLD01"))
                .andExpect(jsonPath("$.data.ttlSeconds").value(600))
                .andExpect(jsonPath("$.data.isReused").value(false));
    }

    @Test
    @DisplayName("GET /api/bookings/hold?resourceId=101 -> 200 OK và trả về active hold")
    void getActiveHold_ShouldReturn200() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(CUSTOMER_ID);

        HoldResourceResponseDto responseDto = HoldResourceResponseDto.builder()
                .bookingId(999L)
                .bookingCode("BK-20261125-HOLD01")
                .resourceId(101L)
                .resourceName("Desk A-01")
                .workspaceId(1L)
                .workspaceName("NexSpace Da Nang")
                .ttlSeconds(450)
                .isReused(false)
                .build();

        when(resourceHoldService.getActiveHold(eq(CUSTOMER_ID), eq(101L))).thenReturn(responseDto);

        mockMvc.perform(get("/api/bookings/hold")
                        .param("resourceId", "101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingId").value(999))
                .andExpect(jsonPath("$.data.resourceId").value(101));
    }

    @Test
    @DisplayName("POST /api/bookings/{id}/release-hold -> 200 OK và giải phóng phiên giữ chỗ")
    void releaseHold_ShouldReturn200() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(CUSTOMER_ID);

        HoldResourceResponseDto responseDto = HoldResourceResponseDto.builder()
                .bookingId(999L)
                .bookingCode("BK-20261125-HOLD01")
                .resourceId(101L)
                .resourceName("Desk A-01")
                .workspaceId(1L)
                .workspaceName("NexSpace Da Nang")
                .isReused(false)
                .build();

        when(resourceHoldService.releaseHold(eq(CUSTOMER_ID), eq(999L))).thenReturn(responseDto);

        mockMvc.perform(post("/api/bookings/999/release-hold"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Giải phóng phiên giữ chỗ thành công"))
                .andExpect(jsonPath("$.data.bookingId").value(999));
    }
}
