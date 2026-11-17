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
@RequestMapping({"/api/v1/admin/bookings", "/api/admin/bookings"})
@RequiredArgsConstructor
@Tag(name = "Admin Bookings", description = "Quản lý và tra cứu đặt chỗ toàn hệ thống cho Admin")
public class AdminBookingController extends BaseAPIController {

    private final IBookingManagementService bookingManagementService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem danh sách đặt chỗ toàn sàn cho Admin")
    public ResponseEntity<ApiResponse<PageResponseDTO<AdminBookingItemResponseDTO>>> getAdminBookings(
            @RequestParam(required = false) BookingStatus status,
            @RequestParam(required = false) String search,
            @ModelAttribute PageRequestDTO pageRequest) {
        var page = bookingManagementService.getAdminBookings(status, search, pageRequest);
        return successPage(page);
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem KPI tổng hợp đặt chỗ cho Admin")
    public ResponseEntity<ApiResponse<AdminBookingKpiResponseDTO>> getAdminKpis() {
        var kpis = bookingManagementService.getAdminBookingKpis();
        return success(kpis, "Lấy KPI đặt chỗ thành công");
    }
}
