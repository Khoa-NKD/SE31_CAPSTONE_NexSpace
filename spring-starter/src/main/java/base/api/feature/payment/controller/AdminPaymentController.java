package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.BatchReconciliationResponseDTO;
import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.feature.payment.dto.response.ReconciliationResultDTO;
import base.api.feature.payment.dto.response.ReconciliationSummaryDTO;
import base.api.feature.payment.service.IPaymentReconciliationService;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
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
@RequestMapping({"/api/v1/admin/payments", "/api/admin/payments"})
@RequiredArgsConstructor
@Tag(name = "Admin Payments & Reconciliation", description = "Endpoints for platform administrators to monitor transactions, inspect details, and execute reconciliation with PayOS (Screen A09)")
public class AdminPaymentController extends BaseAPIController {

    private final IPaymentService paymentService;
    private final IPaymentReconciliationService reconciliationService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Xem danh sách toàn bộ giao dịch thanh toán trên hệ thống với bộ lọc")
    public ResponseEntity<ApiResponse<PageResponseDTO<PaymentTransactionResponseDTO>>> getTransactions(
            @RequestParam(required = false) PaymentStatus status,
            @RequestParam(required = false) ReconciliationStatus reconciliationStatus,
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        Page<PaymentTransactionResponseDTO> page = paymentService.getAdminPaymentHistory(status, reconciliationStatus, pageRequest);
        return successPage(page);
    }

    @GetMapping("/{orderCode}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Xem chi tiết một giao dịch thanh toán và thông tin đối soát")
    public ResponseEntity<ApiResponse<PaymentTransactionResponseDTO>> getTransactionDetail(
            @PathVariable Long orderCode) {
        PaymentTransactionResponseDTO detail = paymentService.getTransactionDetail(orderCode);
        return success(detail, "Lấy chi tiết giao dịch thành công");
    }

    @PostMapping("/{orderCode}/reconcile")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Thực hiện đối soát giao dịch đơn lẻ với cổng PayOS theo thời gian thực")
    public ResponseEntity<ApiResponse<ReconciliationResultDTO>> reconcileTransaction(
            @PathVariable Long orderCode) {
        ReconciliationResultDTO result = reconciliationService.reconcileTransaction(orderCode);
        return success(result, "Đối soát giao dịch thành công");
    }

    @PostMapping("/batch-reconcile")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Thực hiện đối soát tự động hàng loạt tất cả các giao dịch chưa khớp")
    public ResponseEntity<ApiResponse<BatchReconciliationResponseDTO>> batchReconcile() {
        BatchReconciliationResponseDTO result = reconciliationService.batchReconcile();
        return success(result, "Đối soát hàng loạt hoàn tất");
    }

    @GetMapping("/reconciliation-summary")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy số liệu thống kê tổng quan về đối soát giao dịch (Screen A09 KPI cards)")
    public ResponseEntity<ApiResponse<ReconciliationSummaryDTO>> getReconciliationSummary() {
        ReconciliationSummaryDTO summary = reconciliationService.getReconciliationSummary();
        return success(summary, "Lấy dữ liệu tổng hợp đối soát thành công");
    }
}

