package base.api.feature.payment.controller;

import base.api.feature.payment.dto.payout.OrganizerPayoutSettingDto;
import base.api.feature.payment.dto.payout.OrganizerWithdrawalBatchDto;
import base.api.feature.payment.dto.payout.ReviewPayoutRequestDto;
import base.api.feature.payment.service.IAdminPayoutService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
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
@RequestMapping({"/api/v1/admin/payouts", "/api/admin/payouts"})
@RequiredArgsConstructor
@Tag(name = "Admin Payouts", description = "Endpoints cho Quản trị viên duyệt yêu cầu bật/tắt Auto Payout và quản lý sổ cái chi tiền (Payout Ledger)")
public class AdminPayoutController extends BaseAPIController {

    private final IAdminPayoutService adminPayoutService;

    @GetMapping("/requests")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Lấy danh sách các yêu cầu bật/hủy Auto Payout của Organizer đang chờ duyệt")
    public ResponseEntity<ApiResponse<PageResponseDTO<OrganizerPayoutSettingDto>>> getPendingRequests(
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        PageResponseDTO<OrganizerPayoutSettingDto> requests = adminPayoutService.getPendingApprovalRequests(pageRequest);
        return success(requests, "Lấy danh sách yêu cầu Auto Payout thành công");
    }

    @PostMapping("/requests/{id}/review")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Phê duyệt hoặc từ chối yêu cầu bật/hủy Auto Payout của Organizer")
    public ResponseEntity<ApiResponse<OrganizerPayoutSettingDto>> reviewRequest(
            @PathVariable Long id,
            @Valid @RequestBody ReviewPayoutRequestDto dto) {
        Long adminId = getCurrentUserId();
        OrganizerPayoutSettingDto result = adminPayoutService.reviewAutoPayoutRequest(adminId, id, dto);
        return success(result, "Phê duyệt yêu cầu Auto Payout thành công");
    }

    @GetMapping("/ledger")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Sổ cái toàn bộ các giao dịch chi tiền Payout (thủ công & tự động) trong hệ thống")
    public ResponseEntity<ApiResponse<PageResponseDTO<OrganizerWithdrawalBatchDto>>> getLedger(
            @Valid @ModelAttribute PageRequestDTO pageRequest,
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String payoutType) {
        PageResponseDTO<OrganizerWithdrawalBatchDto> ledger = adminPayoutService.getAllWithdrawals(pageRequest, status, payoutType);
        return success(ledger, "Lấy sổ cái chi tiền thành công");
    }

    @PostMapping("/ledger/{id}/retry")
    @PreAuthorize("hasRole('ADMIN')")
    @Operation(summary = "Thử lại một đợt chi tiền PayOS bị thất bại")
    public ResponseEntity<ApiResponse<OrganizerWithdrawalBatchDto>> retryWithdrawal(
            @PathVariable Long id) {
        Long adminId = getCurrentUserId();
        OrganizerWithdrawalBatchDto result = adminPayoutService.retryWithdrawal(adminId, id);
        return success(result, "Đã thử lại lệnh chi tiền PayOS thành công");
    }
}
