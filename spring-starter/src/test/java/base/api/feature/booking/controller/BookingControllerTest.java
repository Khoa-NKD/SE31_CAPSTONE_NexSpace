package base.api.feature.booking.controller;

import base.api.feature.booking.dto.request.CalculatePriceRequestDto;
import base.api.feature.booking.dto.request.CreateBookingRequestDto;
import base.api.feature.booking.dto.response.BookingCancellationPreviewDto;
import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.service.IBookingService;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PriceType;
import base.api.shared.enums.ResourceCategory;
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
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BookingControllerTest {

    private MockMvc mockMvc;

    @Mock
    private IBookingService bookingService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private BookingController controller;

    private ObjectMapper objectMapper;

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
    @DisplayName("POST /api/v1/bookings - Tạo booking trả về HTTP 201 Created")
    void testCreateBooking_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        LocalDateTime startTime = LocalDateTime.now().plusDays(2).withHour(9).withMinute(0);
        LocalDateTime endTime = startTime.plusHours(4);

        CreateBookingRequestDto request = CreateBookingRequestDto.builder()
                .workspaceId(1L)
                .resourceId(42L)
                .startTime(startTime)
                .endTime(endTime)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .notes("Họp trực tuyến")
                .build();

        BookingResponseDto response = BookingResponseDto.builder()
                .id(999L)
                .bookingCode("BK-20261125-AB12CD")
                .status(BookingStatus.PENDING_PAYMENT)
                .workspaceId(1L)
                .workspaceName("NexSpace Central Tower")
                .resourceId(42L)
                .resourceCode("Desk A-01")
                .resourceCategory(ResourceCategory.DESK)
                .startTime(startTime)
                .endTime(endTime)
                .durationHours(new BigDecimal("4.00"))
                .baseAmount(new BigDecimal("200000.00"))
                .taxAmount(new BigDecimal("16000.00"))
                .finalPrice(new BigDecimal("216000.00"))
                .holdExpiresAt(LocalDateTime.now().plusMinutes(15))
                .build();

        when(bookingService.createBooking(eq(100L), any(CreateBookingRequestDto.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(999))
                .andExpect(jsonPath("$.data.bookingCode").value("BK-20261125-AB12CD"))
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"))
                .andExpect(jsonPath("$.data.finalPrice").value(216000.00));
    }

    @Test
    @DisplayName("POST /api/v1/bookings/calculate-price - Tạm tính chi phí trả về HTTP 200 OK")
    void testCalculatePrice_Success() throws Exception {
        LocalDateTime startTime = LocalDateTime.now().plusDays(2).withHour(9).withMinute(0);
        LocalDateTime endTime = startTime.plusHours(4);

        CalculatePriceRequestDto request = CalculatePriceRequestDto.builder()
                .workspaceId(1L)
                .resourceId(42L)
                .startTime(startTime)
                .endTime(endTime)
                .priceType(PriceType.HOURLY)
                .build();

        PriceCalculationResponseDto response = PriceCalculationResponseDto.builder()
                .resourceId(42L)
                .resourceName("Desk A-01")
                .resourceCode("A-01")
                .priceType(PriceType.HOURLY)
                .unitPrice(new BigDecimal("50000.00"))
                .durationHours(new BigDecimal("4.00"))
                .baseAmount(new BigDecimal("200000.00"))
                .surchargeAmount(BigDecimal.ZERO)
                .taxAmount(new BigDecimal("16000.00"))
                .serviceFeeAmount(BigDecimal.ZERO)
                .discountAmount(BigDecimal.ZERO)
                .finalPrice(new BigDecimal("216000.00"))
                .currency("VND")
                .build();

        when(bookingService.calculatePrice(any(CalculatePriceRequestDto.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/bookings/calculate-price")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.finalPrice").value(216000.00))
                .andExpect(jsonPath("$.data.durationHours").value(4.00));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/code/{bookingCode} - Tra cứu chi tiết đơn đặt chỗ")
    void testGetBookingByCode_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        BookingResponseDto response = BookingResponseDto.builder()
                .id(999L)
                .bookingCode("BK-20261125-AB12CD")
                .status(BookingStatus.PENDING_PAYMENT)
                .workspaceName("NexSpace Central Tower")
                .resourceCode("Desk A-01")
                .finalPrice(new BigDecimal("216000.00"))
                .build();

        when(bookingService.getBookingByCode(100L, "BK-20261125-AB12CD")).thenReturn(response);

        mockMvc.perform(get("/api/v1/bookings/code/BK-20261125-AB12CD"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingCode").value("BK-20261125-AB12CD"));
    }

    @Test
    @DisplayName("POST /api/v1/bookings - Ném BadRequest (400) khi thiếu trường bắt buộc")
    void testCreateBooking_ValidationFailure() throws Exception {
        // Missing workspaceId, resourceId, startTime, endTime
        CreateBookingRequestDto invalidRequest = CreateBookingRequestDto.builder().build();

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(invalidRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/code/{bookingCode} - Ném NotFound (404) khi không tìm thấy đơn")
    void testGetBookingByCode_NotFound() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);
        when(bookingService.getBookingByCode(100L, "BK-NONEXISTENT"))
                .thenThrow(new base.api.shared.exception.NotFoundException("Không tìm thấy đơn đặt chỗ"));

        mockMvc.perform(get("/api/v1/bookings/code/BK-NONEXISTENT"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/v1/bookings/calculate-price - Ném BadRequest (400) khi khung giờ ngoài giờ mở cửa")
    void testCalculatePrice_ThrowsBadRequest_WhenOutsideOperatingHours() throws Exception {
        LocalDateTime startTime = LocalDateTime.now().plusDays(2).withHour(6).withMinute(0);
        LocalDateTime endTime = startTime.plusHours(2);

        CalculatePriceRequestDto request = CalculatePriceRequestDto.builder()
                .workspaceId(1L)
                .resourceId(42L)
                .startTime(startTime)
                .endTime(endTime)
                .priceType(PriceType.HOURLY)
                .build();

        when(bookingService.calculatePrice(any(CalculatePriceRequestDto.class)))
                .thenThrow(new base.api.shared.exception.BadRequestException("Thời gian đặt chỗ nằm ngoài khung giờ mở cửa của không gian"));

        mockMvc.perform(post("/api/v1/bookings/calculate-price")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Thời gian đặt chỗ nằm ngoài khung giờ mở cửa của không gian"));
    }

    @Test
    @DisplayName("POST /api/v1/bookings - Ném Conflict (409) khi phát hiện trùng lịch với đặt chỗ khác")
    void testCreateBooking_ThrowsConflict_WhenResourceAlreadyBooked() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        LocalDateTime startTime = LocalDateTime.now().plusDays(2).withHour(9).withMinute(0);
        LocalDateTime endTime = startTime.plusHours(4);

        CreateBookingRequestDto request = CreateBookingRequestDto.builder()
                .workspaceId(1L)
                .resourceId(42L)
                .startTime(startTime)
                .endTime(endTime)
                .partySize(1)
                .priceType(PriceType.HOURLY)
                .build();

        when(bookingService.createBooking(eq(100L), any(CreateBookingRequestDto.class)))
                .thenThrow(new base.api.shared.exception.ConflictException("Chỗ ngồi đã được đặt hoặc đang được giữ chỗ trong khung giờ này"));

        mockMvc.perform(post("/api/v1/bookings")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Chỗ ngồi đã được đặt hoặc đang được giữ chỗ trong khung giờ này"));
    }

    @Test
    @DisplayName("POST /api/v1/bookings/{id}/cancel - Hủy booking thành công và giải phóng lock")
    void testCancelBooking_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        BookingResponseDto cancelledResponse = BookingResponseDto.builder()
                .id(999L)
                .bookingCode("BK-20261125-AB12CD")
                .status(BookingStatus.CANCELLED)
                .workspaceId(1L)
                .resourceId(42L)
                .build();

        when(bookingService.cancelBooking(eq(100L), eq(999L), any()))
                .thenReturn(cancelledResponse);

        mockMvc.perform(post("/api/v1/bookings/999/cancel")
                        .param("reason", "Customer requested cancellation"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.id").value(999L));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/{id} - Xem chi tiết đơn đặt chỗ theo ID")
    void testGetBookingById_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        BookingResponseDto response = BookingResponseDto.builder()
                .id(999L)
                .bookingCode("BK-20261125-AB12CD")
                .status(BookingStatus.CONFIRMED)
                .workspaceName("NexSpace Central Tower")
                .resourceCode("Desk A-01")
                .finalPrice(new BigDecimal("216000.00"))
                .build();

        when(bookingService.getBookingById(100L, 999L)).thenReturn(response);

        mockMvc.perform(get("/api/v1/bookings/999"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(999L))
                .andExpect(jsonPath("$.data.bookingCode").value("BK-20261125-AB12CD"));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/my - Lấy danh sách booking của khách hàng thành công")
    void testGetMyBookings_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        BookingResponseDto item1 = BookingResponseDto.builder()
                .id(1L)
                .bookingCode("BK-20261120-CONFIRMED")
                .status(BookingStatus.CONFIRMED)
                .workspaceName("NexSpace Saigon")
                .finalPrice(new BigDecimal("150000.00"))
                .build();

        PageResponseDTO<BookingResponseDto> pageResponse = new PageResponseDTO<>(
                List.of(item1), 1, 10, 1L, 1, false, false);

        when(bookingService.getMyBookings(eq(100L), any(), any())).thenReturn(pageResponse);

        mockMvc.perform(get("/api/v1/bookings/my")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("BK-20261120-CONFIRMED"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/my?status=PENDING_PAYMENT - Lọc danh sách theo trạng thái")
    void testGetMyBookings_WithStatusFilter() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        BookingResponseDto item1 = BookingResponseDto.builder()
                .id(2L)
                .bookingCode("BK-20261120-PENDING")
                .status(BookingStatus.PENDING_PAYMENT)
                .workspaceName("NexSpace Da Nang")
                .finalPrice(new BigDecimal("90000.00"))
                .build();

        PageResponseDTO<BookingResponseDto> pageResponse = new PageResponseDTO<>(
                List.of(item1), 1, 10, 1L, 1, false, false);

        when(bookingService.getMyBookings(eq(100L), eq(BookingStatus.PENDING_PAYMENT), any())).thenReturn(pageResponse);

        mockMvc.perform(get("/api/v1/bookings/my")
                        .param("status", "PENDING_PAYMENT")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].status").value("PENDING_PAYMENT"));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/organizer - Organizer xem danh sách booking theo workspace, ngày và trạng thái")
    void testGetOrganizerBookings_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(200L);

        BookingResponseDto item1 = BookingResponseDto.builder()
                .id(10L)
                .bookingCode("BK-ORG-001")
                .status(BookingStatus.CONFIRMED)
                .workspaceId(1L)
                .workspaceName("NexSpace Saigon")
                .customerName("John Doe")
                .customerEmail("john@example.com")
                .finalPrice(new BigDecimal("300000.00"))
                .build();

        PageResponseDTO<BookingResponseDto> pageResponse = new PageResponseDTO<>(
                List.of(item1), 1, 10, 1L, 1, false, false);

        when(bookingService.getOrganizerBookings(
                eq(200L), eq(1L), eq(BookingStatus.CONFIRMED), eq(LocalDate.of(2026, 11, 20)), any(), any(), any()))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/v1/bookings/organizer")
                        .param("workspaceId", "1")
                        .param("status", "CONFIRMED")
                        .param("date", "2026-11-20")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("BK-ORG-001"))
                .andExpect(jsonPath("$.data.content[0].workspaceId").value(1))
                .andExpect(jsonPath("$.data.content[0].status").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.totalElements").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/workspace/{workspaceId} - Lấy danh sách booking theo workspace có lọc status & date")
    void testGetWorkspaceBookings_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(200L);

        BookingResponseDto item1 = BookingResponseDto.builder()
                .id(11L)
                .bookingCode("BK-WS-002")
                .status(BookingStatus.PENDING_PAYMENT)
                .workspaceId(2L)
                .workspaceName("NexSpace Da Nang")
                .finalPrice(new BigDecimal("150000.00"))
                .build();

        PageResponseDTO<BookingResponseDto> pageResponse = new PageResponseDTO<>(
                List.of(item1), 1, 10, 1L, 1, false, false);

        when(bookingService.getWorkspaceBookings(
                eq(200L), eq(2L), eq(BookingStatus.PENDING_PAYMENT), eq(LocalDate.of(2026, 11, 25)), any()))
                .thenReturn(pageResponse);

        mockMvc.perform(get("/api/v1/bookings/workspace/2")
                        .param("status", "PENDING_PAYMENT")
                        .param("date", "2026-11-25")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("BK-WS-002"))
                .andExpect(jsonPath("$.data.content[0].status").value("PENDING_PAYMENT"));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/organizer/calendar - Lấy danh sách booking events cho Calendar & Gantt timeline")
    void testGetOrganizerCalendar_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(200L);

        BookingResponseDto event = BookingResponseDto.builder()
                .id(101L)
                .bookingCode("BK-CAL-001")
                .status(BookingStatus.CONFIRMED)
                .workspaceId(1L)
                .workspaceName("NexSpace Saigon Prime")
                .resourceId(42L)
                .resourceCode("DESK-A12")
                .customerName("Alice Nguyen")
                .startTime(LocalDateTime.of(2026, 11, 20, 9, 0))
                .endTime(LocalDateTime.of(2026, 11, 20, 13, 0))
                .finalPrice(new BigDecimal("216000.00"))
                .build();

        when(bookingService.getOrganizerCalendarEvents(
                eq(200L), eq(1L), eq(BookingStatus.CONFIRMED), eq(LocalDate.of(2026, 11, 20)), any(), any()))
                .thenReturn(List.of(event));

        mockMvc.perform(get("/api/v1/bookings/organizer/calendar")
                        .param("workspaceId", "1")
                        .param("status", "CONFIRMED")
                        .param("date", "2026-11-20"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].bookingCode").value("BK-CAL-001"))
                .andExpect(jsonPath("$.data[0].resourceCode").value("DESK-A12"))
                .andExpect(jsonPath("$.data[0].customerName").value("Alice Nguyen"))
                .andExpect(jsonPath("$.data[0].status").value("CONFIRMED"));
    }

    @Test
    @DisplayName("POST /api/v1/bookings/{id}/approve - Phê duyệt đơn đặt chỗ thành công")
    void testApproveBooking_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(200L);

        BookingResponseDto approved = BookingResponseDto.builder()
                .id(999L)
                .bookingCode("BK-APP-001")
                .status(BookingStatus.PENDING_PAYMENT)
                .workspaceId(1L)
                .workspaceName("NexSpace Saigon")
                .build();

        when(bookingService.approveBooking(200L, 999L)).thenReturn(approved);

        mockMvc.perform(post("/api/v1/bookings/999/approve"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingCode").value("BK-APP-001"))
                .andExpect(jsonPath("$.data.status").value("PENDING_PAYMENT"));
    }

    @Test
    @DisplayName("POST /api/v1/bookings/{id}/reject - Từ chối duyệt đơn đặt chỗ thành công")
    void testRejectBooking_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(200L);

        BookingResponseDto rejected = BookingResponseDto.builder()
                .id(999L)
                .bookingCode("BK-APP-001")
                .status(BookingStatus.CANCELLED)
                .cancelReason("Phòng đang bảo trì đột xuất")
                .workspaceId(1L)
                .workspaceName("NexSpace Saigon")
                .build();

        when(bookingService.rejectBooking(200L, 999L, "Phòng đang bảo trì đột xuất")).thenReturn(rejected);

        mockMvc.perform(post("/api/v1/bookings/999/reject")
                        .param("reason", "Phòng đang bảo trì đột xuất"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingCode").value("BK-APP-001"))
                .andExpect(jsonPath("$.data.status").value("CANCELLED"))
                .andExpect(jsonPath("$.data.cancelReason").value("Phòng đang bảo trì đột xuất"));
    }

    @Test
    @DisplayName("GET /api/v1/bookings/{id}/cancellation-preview - Lấy thông tin chính sách hủy và số tiền hoàn dự kiến thành công")
    void testGetCancellationPreview_Success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        BookingCancellationPreviewDto preview = BookingCancellationPreviewDto.builder()
                .bookingId(888L)
                .bookingCode("BK-PREVIEW-001")
                .status(BookingStatus.CONFIRMED)
                .startTime(LocalDateTime.now().plusHours(36))
                .hoursBeforeStart(36)
                .finalPrice(new BigDecimal("500000.00"))
                .refundPercent(new BigDecimal("100.00"))
                .refundAmount(new BigDecimal("500000.00"))
                .isHostCancellation(false)
                .canCancel(true)
                .cancellationPolicyExplanation("Hủy trước 36 giờ. Áp dụng hoàn 100%.")
                .rules(List.of(
                        BookingCancellationPreviewDto.CancellationRuleItemDto.builder()
                                .minHoursBeforeStart(24)
                                .refundPercent(new BigDecimal("100.00"))
                                .label("Trước 24h: hoàn 100%")
                                .build()
                ))
                .build();

        when(bookingService.getCancellationPreview(100L, 888L)).thenReturn(preview);

        mockMvc.perform(get("/api/v1/bookings/888/cancellation-preview"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingId").value(888))
                .andExpect(jsonPath("$.data.bookingCode").value("BK-PREVIEW-001"))
                .andExpect(jsonPath("$.data.refundPercent").value(100))
                .andExpect(jsonPath("$.data.refundAmount").value(500000.00))
                .andExpect(jsonPath("$.data.canCancel").value(true));
    }
}
