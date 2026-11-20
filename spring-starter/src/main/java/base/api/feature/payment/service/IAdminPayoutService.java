package base.api.feature.payment.service;

import base.api.feature.payment.dto.payout.OrganizerPayoutSettingDto;
import base.api.feature.payment.dto.payout.OrganizerWithdrawalBatchDto;
import base.api.feature.payment.dto.payout.ReviewPayoutRequestDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;

public interface IAdminPayoutService {

    PageResponseDTO<OrganizerPayoutSettingDto> getPendingApprovalRequests(PageRequestDTO pageRequest);

    OrganizerPayoutSettingDto reviewAutoPayoutRequest(Long adminId, Long settingId, ReviewPayoutRequestDto dto);

    PageResponseDTO<OrganizerWithdrawalBatchDto> getAllWithdrawals(PageRequestDTO pageRequest, String status, String payoutType);

    OrganizerWithdrawalBatchDto retryWithdrawal(Long adminId, Long batchId);
}
