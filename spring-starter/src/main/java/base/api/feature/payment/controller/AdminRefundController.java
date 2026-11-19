package base.api.feature.payment.controller;

import base.api.feature.payment.dto.request.ProcessRefundRequestDTO;
import base.api.feature.payment.dto.response.RefundResponseDTO;
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
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/admin/refunds", "/api/admin/refunds"})
@RequiredArgsConstructor
@Tag(name = "Admin Refunds", description = "Quản lý và xử lý các yêu cầu hoàn tiền trên sàn cho Admin")
public class AdminRefundController extends BaseAPIController {

    private final IRefundService refundService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem danh sách yêu cầu hoàn tiền toàn sàn")
    public ResponseEntity<ApiResponse<PageResponseDTO<RefundResponseDTO>>> getRefunds(
            @RequestParam(required = false) RefundStatus status,
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        Page<RefundResponseDTO> page = refundService.getRefunds(status, pageRequest);
        return successPage(page);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem chi tiết một yêu cầu hoàn tiền theo ID")
    public ResponseEntity<ApiResponse<RefundResponseDTO>> getRefundById(@PathVariable Long id) {
        RefundResponseDTO response = refundService.getRefundById(id);
        return success(response, "Lấy thông tin yêu cầu hoàn tiền thành công");
    }

    @PostMapping("/{id}/process")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xử lý duyệt và hoàn tiền cho khách hàng, tự động kích hoạt thông báo")
    public ResponseEntity<ApiResponse<RefundResponseDTO>> processRefund(
            @PathVariable Long id,
            @Valid @RequestBody(required = false) ProcessRefundRequestDTO dto) {
        Long adminUserId = getCurrentUserId();
        RefundResponseDTO response = refundService.processRefund(adminUserId, id, dto);
        return success(response, "Xử lý hoàn tiền thành công và đã gửi thông báo đến khách hàng");
    }

    @PostMapping("/{id}/reject")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Từ chối yêu cầu hoàn tiền")
    public ResponseEntity<ApiResponse<RefundResponseDTO>> rejectRefund(
            @PathVariable Long id,
            @RequestParam(required = false) String note) {
        Long adminUserId = getCurrentUserId();
        RefundResponseDTO response = refundService.rejectRefund(adminUserId, id, note);
        return success(response, "Đã từ chối yêu cầu hoàn tiền");
    }
}
