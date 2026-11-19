package base.api.feature.payment.controller;

import base.api.feature.payment.dto.refund.ApproveRefundRequestDto;
import base.api.feature.payment.dto.refund.RefundKpisDto;
import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.feature.payment.dto.refund.RejectRefundRequestDto;
import base.api.feature.payment.service.IRefundService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.RefundStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/v1/admin/refunds", "/api/admin/refunds"})
@RequiredArgsConstructor
@Tag(name = "Admin Refunds", description = "Endpoints cho Quản trị viên kiểm tra, phê duyệt chi tiền PayOS hoặc từ chối các yêu cầu hoàn tiền")
public class AdminRefundController extends BaseAPIController {

    private final IRefundService refundService;

    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách yêu cầu hoàn tiền phân trang và lọc theo trạng thái, không gian, từ khóa")
    public ResponseEntity<ApiResponse<PageResponseDTO<RefundRequestResponseDto>>> getRefunds(
            @RequestParam(required = false) RefundStatus status,
            @RequestParam(required = false) Long workspaceId,
            @RequestParam(required = false) String search,
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        PageResponseDTO<RefundRequestResponseDto> response = refundService.getAdminRefunds(status, workspaceId, search, pageRequest);
        return success(response);
    }

    @GetMapping("/kpis")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy số liệu thống kê KPI hoàn tiền (chờ duyệt, đã xử lý, từ chối)")
    public ResponseEntity<ApiResponse<RefundKpisDto>> getRefundKpis() {
        RefundKpisDto kpis = refundService.getAdminRefundKpis();
        return success(kpis);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Xem chi tiết một yêu cầu hoàn tiền")
    public ResponseEntity<ApiResponse<RefundRequestResponseDto>> getRefundDetails(@PathVariable Long id) {
        RefundRequestResponseDto details = refundService.getRefundDetails(id);
        return success(details);
    }

    @PostMapping("/{id}/approve")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Phê duyệt yêu cầu hoàn tiền và thực hiện lệnh chi tiền qua cổng PayOS Payouts")
    public ResponseEntity<ApiResponse<RefundRequestResponseDto>> approveRefund(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ApproveRefundRequestDto dto) {
        RefundRequestResponseDto result = refundService.approveRefund(getCurrentUserId(), id, dto);
        return success(result, "Phê duyệt và chuyển tiền hoàn qua PayOS thành công");
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Từ chối yêu cầu hoàn tiền")
    public ResponseEntity<ApiResponse<RefundRequestResponseDto>> rejectRefund(
            @PathVariable Long id,
            @Valid @RequestBody RejectRefundRequestDto dto) {
        RefundRequestResponseDto result = refundService.rejectRefund(getCurrentUserId(), id, dto);
        return success(result, "Từ chối yêu cầu hoàn tiền thành công");
    }
}
