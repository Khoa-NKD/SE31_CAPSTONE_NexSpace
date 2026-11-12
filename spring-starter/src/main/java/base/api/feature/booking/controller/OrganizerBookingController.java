package base.api.feature.booking.controller;

import base.api.feature.booking.dto.response.AdminBookingItemResponseDTO;
import base.api.feature.booking.dto.response.AdminBookingKpiResponseDTO;
import base.api.feature.booking.service.IBookingManagementService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.BookingStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/organizer/bookings", "/api/organizer/bookings"})
@RequiredArgsConstructor
@Tag(name = "Organizer Bookings", description = "Quản lý đặt chỗ của đối tác (Organizer)")
public class OrganizerBookingController extends BaseAPIController {

    private final IBookingManagementService bookingManagementService;

    @GetMapping
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Xem danh sách đặt chỗ thuộc các workspace của đối tác")
    public ResponseEntity<ApiResponse<PageResponseDTO<AdminBookingItemResponseDTO>>> getOrganizerBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String search,
            @ModelAttribute PageRequestDTO pageRequest) {
        Long actorId = getCurrentUserId();
        var page = bookingManagementService.getOrganizerBookings(actorId, status, search, pageRequest);
        return successPage(page);
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Xem thống kê KPI đặt chỗ của đối tác")
    public ResponseEntity<ApiResponse<AdminBookingKpiResponseDTO>> getOrganizerKpis() {
        Long actorId = getCurrentUserId();
        var kpis = bookingManagementService.getOrganizerBookingKpis(actorId);
        return success(kpis, "Lấy KPI đặt chỗ thành công");
    }
}
