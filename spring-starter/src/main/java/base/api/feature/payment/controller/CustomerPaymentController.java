package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.PaymentCheckoutResponseDTO;
import base.api.feature.payment.dto.response.PaymentStatusResponseDTO;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/customer", "/api/customer"})
@RequiredArgsConstructor
@Tag(name = "Customer Payments", description = "Endpoints for initiating PayOS checkout, VietQR rendering, and tracking payment status")
public class CustomerPaymentController extends BaseAPIController {

    private final IPaymentService paymentService;

    @PostMapping("/bookings/{bookingId}/payments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Khởi tạo thanh toán PayOS và lấy mã VietQR động")
    public ResponseEntity<ApiResponse<PaymentCheckoutResponseDTO>> createPayment(
            @PathVariable Long bookingId) {
        Long actorId = getCurrentUserId();
        PaymentCheckoutResponseDTO response = paymentService.createPaymentForBooking(bookingId, actorId);
        return created(response, "Khởi tạo phiên thanh toán PayOS thành công");
    }

    @GetMapping("/bookings/{bookingId}/payment-status")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Kiểm tra trạng thái thanh toán thời gian thực")
    public ResponseEntity<ApiResponse<PaymentStatusResponseDTO>> getPaymentStatus(
            @PathVariable Long bookingId) {
        Long actorId = getCurrentUserId();
        PaymentStatusResponseDTO response = paymentService.getPaymentStatus(bookingId, actorId);
        return success(response, "Lấy trạng thái thanh toán thành công");
    }

    @PostMapping("/payments/{orderCode}/cancel")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Hủy phiên thanh toán và giải phóng giữ chỗ")
    public ResponseEntity<ApiResponse<Void>> cancelPayment(
            @PathVariable Long orderCode,
            @RequestParam(required = false, defaultValue = "Khách hàng hủy giữ chỗ") String reason) {
        Long actorId = getCurrentUserId();
        paymentService.cancelPayment(orderCode, actorId, reason);
        return success(null, "Đã hủy phiên thanh toán và giải phóng slot giữ chỗ");
    }
}

