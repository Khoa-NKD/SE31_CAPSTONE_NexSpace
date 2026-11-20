package base.api.feature.payment.controller;

import base.api.feature.payment.dto.payout.ManualWithdrawalRequestDto;
import base.api.feature.payment.dto.payout.OrganizerPayoutBalanceDto;
import base.api.feature.payment.dto.payout.OrganizerPayoutSettingDto;
import base.api.feature.payment.dto.payout.OrganizerWithdrawalBatchDto;
import base.api.feature.payment.dto.payout.RequestAutoPayoutDto;
import base.api.feature.payment.dto.payout.RequestCancelAutoPayoutDto;
import base.api.feature.payment.service.IOrganizerPayoutService;
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
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/organizer/payouts", "/api/organizer/payouts"})
@RequiredArgsConstructor
@Tag(name = "Organizer Payouts", description = "Endpoints cho Organizer theo dõi số dư (Tổng/HELD/Khả dụng), rút tiền thủ công và quản lý chế độ Auto Payout")
public class OrganizerPayoutController extends BaseAPIController {

    private final IOrganizerPayoutService organizerPayoutService;

    @GetMapping("/balance")
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Xem số dư doanh thu, số tiền đang tạm giữ HELD và số tiền khả dụng có thể rút")
    public ResponseEntity<ApiResponse<OrganizerPayoutBalanceDto>> getBalance() {
        Long organizerId = getCurrentUserId();
        OrganizerPayoutBalanceDto balance = organizerPayoutService.getBalance(organizerId);
        return success(balance, "Lấy thông tin số dư thành công");
    }

    @GetMapping("/settings")
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Xem cấu hình chế độ Payout (Manual hoặc Auto Daily) và trạng thái xét duyệt")
    public ResponseEntity<ApiResponse<OrganizerPayoutSettingDto>> getSettings() {
        Long organizerId = getCurrentUserId();
        OrganizerPayoutSettingDto settings = organizerPayoutService.getSettings(organizerId);
        return success(settings, "Lấy cấu hình Payout thành công");
    }

    @PostMapping("/settings/request-auto")
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Gửi yêu cầu lên Admin để bật chế độ rút tiền tự động hàng ngày (Auto Payout)")
    public ResponseEntity<ApiResponse<OrganizerPayoutSettingDto>> requestAutoPayout(
            @Valid @RequestBody RequestAutoPayoutDto dto) {
        Long organizerId = getCurrentUserId();
        OrganizerPayoutSettingDto result = organizerPayoutService.requestAutoPayout(organizerId, dto);
        return success(result, "Đã gửi yêu cầu kích hoạt Auto Payout lên Admin");
    }

    @PostMapping("/settings/request-cancel-auto")
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Gửi yêu cầu lên Admin để hủy chế độ Auto Payout quay về Rút tiền thủ công (Manual)")
    public ResponseEntity<ApiResponse<OrganizerPayoutSettingDto>> requestCancelAutoPayout(
            @Valid @RequestBody(required = false) RequestCancelAutoPayoutDto dto) {
        Long organizerId = getCurrentUserId();
        OrganizerPayoutSettingDto result = organizerPayoutService.requestCancelAutoPayout(organizerId, dto);
        return success(result, "Đã gửi yêu cầu hủy Auto Payout lên Admin");
    }

    @PostMapping("/withdraw")
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Thực hiện rút tiền thủ công (Manual) từ số dư khả dụng về tài khoản ngân hàng")
    public ResponseEntity<ApiResponse<OrganizerWithdrawalBatchDto>> withdrawManual(
            @Valid @RequestBody ManualWithdrawalRequestDto dto) {
        Long organizerId = getCurrentUserId();
        OrganizerWithdrawalBatchDto batch = organizerPayoutService.withdrawManual(organizerId, dto);
        return success(batch, "Yêu cầu rút tiền đã được thực hiện thành công");
    }

    @GetMapping("/history")
    @PreAuthorize("hasRole('ORGANIZER')")
    @Operation(summary = "Lấy lịch sử các đợt rút tiền (thủ công & tự động)")
    public ResponseEntity<ApiResponse<PageResponseDTO<OrganizerWithdrawalBatchDto>>> getWithdrawalHistory(
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        Long organizerId = getCurrentUserId();
        PageResponseDTO<OrganizerWithdrawalBatchDto> history = organizerPayoutService.getWithdrawalHistory(organizerId, pageRequest);
        return success(history, "Lấy lịch sử rút tiền thành công");
    }
}
