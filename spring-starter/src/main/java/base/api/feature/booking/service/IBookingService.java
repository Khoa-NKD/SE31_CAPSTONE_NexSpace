package base.api.feature.booking.service;

import base.api.feature.booking.dto.request.CalculatePriceRequestDto;
import base.api.feature.booking.dto.request.CreateBookingRequestDto;
import base.api.feature.booking.dto.response.BookingResponseDto;
import base.api.feature.booking.dto.response.PriceCalculationResponseDto;
import base.api.feature.booking.dto.response.ResourceAvailabilityDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.BookingStatus;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

public interface IBookingService {

    /** Khách hàng tạo đơn đặt chỗ có bảo vệ chống Overbooking bằng Pessimistic Lock */
    BookingResponseDto createBooking(Long customerId, CreateBookingRequestDto dto);

    /** Tạm tính chi phí đặt chỗ trước khi xác nhận */
    PriceCalculationResponseDto calculatePrice(CalculatePriceRequestDto dto);

    /** Xem chi tiết đơn đặt chỗ theo ID (Bảo vệ quyền sở hữu Customer/Organizer/Admin) */
    BookingResponseDto getBookingById(Long customerId, Long bookingId);

    /** Xem chi tiết đơn đặt chỗ theo mã bookingCode */
    BookingResponseDto getBookingByCode(Long customerId, String bookingCode);

    /** Lấy danh sách lịch sử đặt chỗ của khách hàng có lọc trạng thái tùy chọn */
    PageResponseDTO<BookingResponseDto> getMyBookings(Long customerId, BookingStatus status, PageRequestDTO pageRequest);

    /** Tra cứu trạng thái chỗ trống trên sơ đồ sàn trong khung thời gian */
    List<ResourceAvailabilityDto> getFloorAvailability(Long workspaceId, Long floorId, LocalDateTime startTime, LocalDateTime endTime);

    /** Hủy đơn đặt chỗ hoặc hủy giữ chỗ (giải phóng lock ngay lập tức) */
    BookingResponseDto cancelBooking(Long customerId, Long bookingId, String cancelReason);

    /** Xem trước chính sách hủy và số tiền hoàn dự kiến trước khi xác nhận hủy */
    base.api.feature.booking.dto.response.BookingCancellationPreviewDto getCancellationPreview(Long currentUserId, Long bookingId);

    /** Quét và tự động chuyển trạng thái EXPIRED cho các đơn giữ chỗ đã quá hạn 15 phút */
    int expireOutdatedHolds();

    /** Lấy danh sách đơn đặt chỗ dành cho Organizer theo workspace, ngày và trạng thái */
    PageResponseDTO<BookingResponseDto> getOrganizerBookings(
            Long organizerId,
            Long workspaceId,
            BookingStatus status,
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate,
            PageRequestDTO pageRequest);

    /** Lấy danh sách đơn đặt chỗ thuộc về một Workspace (dành cho Organizer quản lý hoặc Admin) */
    PageResponseDTO<BookingResponseDto> getWorkspaceBookings(
            Long hostOrAdminId,
            Long workspaceId,
            BookingStatus status,
            LocalDate date,
            PageRequestDTO pageRequest);

    /** Lấy danh sách toàn bộ đơn đặt chỗ trên toàn hệ thống (dành cho Admin) */
    PageResponseDTO<BookingResponseDto> getAllBookings(Long adminId, PageRequestDTO pageRequest);

    /** Lấy danh sách sự kiện đặt chỗ cho Calendar / Gantt Timeline của Organizer */
    List<BookingResponseDto> getOrganizerCalendarEvents(
            Long currentUserId,
            Long workspaceId,
            BookingStatus status,
            LocalDate date,
            LocalDate startDate,
            LocalDate endDate);

    /** Organizer phê duyệt đơn đặt chỗ đang chờ duyệt (PENDING_APPROVAL) */
    BookingResponseDto approveBooking(Long currentUserId, Long bookingId);

    /** Organizer từ chối đơn đặt chỗ đang chờ duyệt (PENDING_APPROVAL) kèm lý do */
    BookingResponseDto rejectBooking(Long currentUserId, Long bookingId, String rejectionReason);
}
