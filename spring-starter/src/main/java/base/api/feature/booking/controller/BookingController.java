package base.api.feature.booking.controller;

import base.api.feature.booking.dto.request.CalculatePriceRequestDto;
import base.api.feature.booking.dto.request.CreateBookingRequestDto;
import base.api.feature.booking.dto.response.BookingCancellationPreviewDto;
import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.service.IBookingService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.BookingStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping({"/api/v1/bookings", "/api/bookings"})
@RequiredArgsConstructor
@Tag(name = "Customer - Bookings", description = "API quản lý và tạo đơn đặt chỗ cho khách hàng")
public class BookingController extends BaseAPIController {

    private final IBookingService bookingService;

    @Operation(summary = "Tạo đơn đặt chỗ mới và giữ chỗ 15 phút")
    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingResponseDto>> createBooking(
            @Valid @RequestBody CreateBookingRequestDto dto) {
        BookingResponseDto response = bookingService.createBooking(getCurrentUserId(), dto);
        return created(response, "Tạo đơn đặt chỗ thành công. Vui lòng hoàn tất thanh toán trong vòng 15 phút.");
    }

    @Operation(summary = "Tạm tính chi phí đặt chỗ")
    @PostMapping("/calculate-price")
    public ResponseEntity<ApiResponse<PriceCalculationResponseDto>> calculatePrice(
            @Valid @RequestBody CalculatePriceRequestDto dto) {
        return success(bookingService.calculatePrice(dto));
    }

    @Operation(summary = "Lấy danh sách đơn đặt chỗ của tôi có lọc theo trạng thái")
    @GetMapping("/my")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponseDTO<BookingResponseDto>>> getMyBookings(
            @RequestParam(required = false) BookingStatus status,
            @ModelAttribute PageRequestDTO pageRequest) {
        return success(bookingService.getMyBookings(getCurrentUserId(), status, pageRequest));
    }

    @Operation(summary = "Xem chi tiết đơn đặt chỗ theo ID")
    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingResponseDto>> getBookingById(@PathVariable Long id) {
        return success(bookingService.getBookingById(getCurrentUserId(), id));
    }

    @Operation(summary = "Xem chi tiết đơn đặt chỗ theo mã Booking Code")
    @GetMapping("/code/{bookingCode}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingResponseDto>> getBookingByCode(@PathVariable String bookingCode) {
        return success(bookingService.getBookingByCode(getCurrentUserId(), bookingCode));
    }

    @Operation(summary = "Xem trước chính sách hủy và số tiền hoàn dự kiến trước khi hủy")
    @GetMapping("/{id}/cancellation-preview")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingCancellationPreviewDto>> getCancellationPreview(@PathVariable Long id) {
        BookingCancellationPreviewDto preview = bookingService.getCancellationPreview(getCurrentUserId(), id);
        return success(preview, "Lấy thông tin chính sách hủy thành công");
    }

    @Operation(summary = "Hủy đơn đặt chỗ hoặc hủy giữ chỗ 15 phút")
    @PostMapping("/{id}/cancel")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingResponseDto>> cancelBooking(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        BookingResponseDto response = bookingService.cancelBooking(getCurrentUserId(), id, reason);
        return success(response, "Đơn đặt chỗ đã được hủy thành công. Chỗ ngồi đã được giải phóng.");
    }

    @Operation(summary = "Organizer phê duyệt đơn đặt chỗ (khi workspace bật chế độ duyệt thủ công)")
    @PostMapping("/{id}/approve")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponseDto>> approveBooking(@PathVariable Long id) {
        BookingResponseDto response = bookingService.approveBooking(getCurrentUserId(), id);
        return success(response, "Đơn đặt chỗ đã được phê duyệt thành công.");
    }

    @Operation(summary = "Organizer từ chối duyệt đơn đặt chỗ (khi workspace bật chế độ duyệt thủ công)")
    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<BookingResponseDto>> rejectBooking(
            @PathVariable Long id,
            @RequestParam(required = false) String reason) {
        BookingResponseDto response = bookingService.rejectBooking(getCurrentUserId(), id, reason);
        return success(response, "Đơn đặt chỗ đã bị từ chối và vị trí chỗ ngồi đã được giải phóng.");
    }

    @Operation(summary = "Organizer xem danh sách booking theo workspace, ngày và trạng thái")
    @GetMapping("/organizer")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PageResponseDTO<BookingResponseDto>>> getOrganizerBookings(
            @RequestParam(required = false) Long workspaceId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate,
            @ModelAttribute PageRequestDTO pageRequest) {
        return success(bookingService.getOrganizerBookings(
                getCurrentUserId(), workspaceId, status, date, startDate, endDate, pageRequest));
    }

    @Operation(summary = "Organizer xem booking trên Calendar / Gantt Timeline")
    @GetMapping("/organizer/calendar")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<List<BookingResponseDto>>> getOrganizerCalendar(
            @RequestParam(required = false) Long workspaceId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate startDate,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate endDate) {
        return success(bookingService.getOrganizerCalendarEvents(
                getCurrentUserId(), workspaceId, status, date, startDate, endDate));
    }

    @Operation(summary = "Lấy danh sách đơn đặt chỗ thuộc về Workspace (dành cho Organizer/Admin)")
    @GetMapping("/workspace/{workspaceId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    public ResponseEntity<ApiResponse<PageResponseDTO<BookingResponseDto>>> getWorkspaceBookings(
            @PathVariable Long workspaceId,
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date,
            @ModelAttribute PageRequestDTO pageRequest) {
        return success(bookingService.getWorkspaceBookings(getCurrentUserId(), workspaceId, status, date, pageRequest));
    }

    @Operation(summary = "Lấy danh sách toàn bộ đơn đặt chỗ trên hệ thống (dành cho Admin)")
    @GetMapping("/admin/all")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<PageResponseDTO<BookingResponseDto>>> getAllBookings(
            @ModelAttribute PageRequestDTO pageRequest) {
        return success(bookingService.getAllBookings(getCurrentUserId(), pageRequest));
    }
}
