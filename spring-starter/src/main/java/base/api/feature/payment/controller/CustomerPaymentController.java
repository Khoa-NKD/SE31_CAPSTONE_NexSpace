package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.InvoiceResponseDTO;
import base.api.feature.payment.dto.response.PaymentCheckoutResponseDTO;
import base.api.feature.payment.dto.response.PaymentStatusResponseDTO;
import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.feature.payment.service.IInvoiceService;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.PaymentStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/customer", "/api/customer"})
@RequiredArgsConstructor
@Tag(name = "Customer Payments", description = "Endpoints for initiating PayOS checkout, VietQR rendering, payment history, and e-invoices")
public class CustomerPaymentController extends BaseAPIController {

    private final IPaymentService paymentService;
    private final IInvoiceService invoiceService;

    @GetMapping("/bookings/current-pending")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy hoặc tự động tạo phiên đặt chỗ đang chờ thanh toán của người dùng hiện tại")
    public ResponseEntity<ApiResponse<base.api.feature.payment.dto.response.BookingHoldResponseDTO>> getCurrentPendingBooking() {
        Long actorId = getCurrentUserId();
        base.api.feature.payment.dto.response.BookingHoldResponseDTO hold = paymentService.getOrCreatePendingBookingHold(actorId);
        return success(hold, "Lấy phiên đặt chỗ thành công");
    }

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

    @GetMapping("/payments")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xem lịch sử thanh toán cá nhân của khách hàng")
    public ResponseEntity<ApiResponse<PageResponseDTO<PaymentTransactionResponseDTO>>> getPaymentHistory(
            @RequestParam(required = false) PaymentStatus status,
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        Long actorId = getCurrentUserId();
        Page<PaymentTransactionResponseDTO> page = paymentService.getCustomerPaymentHistory(actorId, status, pageRequest);
        return successPage(page);
    }

    @GetMapping("/bookings/{bookingId}/receipt")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Lấy URL và thông tin hóa đơn điện tử Cloudinary cho đơn đặt chỗ")
    public ResponseEntity<ApiResponse<InvoiceResponseDTO>> getInvoice(
            @PathVariable Long bookingId) {
        Long actorId = getCurrentUserId();
        InvoiceResponseDTO invoice = invoiceService.getOrCreateInvoice(bookingId, actorId);
        return success(invoice, "Lấy thông tin hóa đơn thành công");
    }

    @GetMapping("/bookings/{bookingId}/receipt/download")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tải trực tiếp file PDF hóa đơn/biên nhận thanh toán")
    public ResponseEntity<byte[]> downloadInvoicePdf(
            @PathVariable Long bookingId) {
        Long actorId = getCurrentUserId();
        byte[] pdfBytes = invoiceService.generateInvoicePdf(bookingId, actorId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, MediaType.APPLICATION_PDF_VALUE)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"invoice_booking_" + bookingId + ".pdf\"")
                .body(pdfBytes);
    }
}

