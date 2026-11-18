package base.api.feature.booking.controller;

import base.api.feature.booking.dto.request.HoldResourceRequestDto;
import base.api.feature.booking.dto.response.HoldResourceResponseDto;
import base.api.feature.booking.service.IResourceHoldService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequiredArgsConstructor
@Tag(name = "Customer - Booking Hold", description = "API Giữ chỗ tạm thời (Temporary Hold) và Tự động Giải phóng (Auto-Release)")
public class BookingHoldController extends BaseAPIController {

    private final IResourceHoldService resourceHoldService;

    @Operation(summary = "Giữ chỗ tạm thời (mặc định 10 phút) có cơ chế Idempotent Reuse và giới hạn tối đa 3 hold")
    @PostMapping({"/api/v1/bookings/hold", "/api/bookings/hold"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<HoldResourceResponseDto>> holdResource(
            @Valid @RequestBody HoldResourceRequestDto dto) {
        HoldResourceResponseDto response = resourceHoldService.holdResource(getCurrentUserId(), dto);
        String message = response.isReused()
                ? "Tái sử dụng phiên giữ chỗ hiện tại thành công"
                : "Giữ chỗ tạm thời thành công. Vui lòng hoàn tất thanh toán trước khi hết hạn.";
        return created(response, message);
    }

    @Operation(summary = "Lấy thông tin phiên giữ chỗ đang có hiệu lực của khách hàng cho tài nguyên này")
    @GetMapping({"/api/v1/bookings/hold", "/api/bookings/hold"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<HoldResourceResponseDto>> getActiveHold(
            @RequestParam Long resourceId) {
        HoldResourceResponseDto response = resourceHoldService.getActiveHold(getCurrentUserId(), resourceId);
        return success(response, "Lấy thông tin phiên giữ chỗ thành công");
    }

    @Operation(summary = "Khách hàng chủ động hủy/nhả phiên giữ chỗ tạm thời (Manual Release)")
    @PostMapping({"/api/v1/bookings/{id}/release-hold", "/api/bookings/{id}/release-hold", "/api/v1/bookings/hold/{id}/release", "/api/bookings/hold/{id}/release"})
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<HoldResourceResponseDto>> releaseHold(
            @PathVariable("id") Long bookingId) {
        HoldResourceResponseDto response = resourceHoldService.releaseHold(getCurrentUserId(), bookingId);
        return success(response, "Giải phóng phiên giữ chỗ thành công");
    }
}
