package base.api.feature.payment.service;

import base.api.feature.payment.dto.payout.ManualWithdrawalRequestDto;
import base.api.feature.payment.dto.payout.OrganizerPayoutBalanceDto;
import base.api.feature.payment.dto.payout.OrganizerPayoutSettingDto;
import base.api.feature.payment.dto.payout.OrganizerWithdrawalBatchDto;
import base.api.feature.payment.dto.payout.RequestAutoPayoutDto;
import base.api.feature.payment.dto.payout.RequestCancelAutoPayoutDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;

public interface IOrganizerPayoutService {

    OrganizerPayoutBalanceDto getBalance(Long organizerId);

    OrganizerPayoutSettingDto getSettings(Long organizerId);

    OrganizerPayoutSettingDto requestAutoPayout(Long organizerId, RequestAutoPayoutDto dto);

    OrganizerPayoutSettingDto requestCancelAutoPayout(Long organizerId, RequestCancelAutoPayoutDto dto);

    OrganizerWithdrawalBatchDto withdrawManual(Long organizerId, ManualWithdrawalRequestDto dto);

    PageResponseDTO<OrganizerWithdrawalBatchDto> getWithdrawalHistory(Long organizerId, PageRequestDTO pageRequest);

    void releaseEligibleHeldPayouts();

    void executeDailyAutoPayoutForCurrentHour();
}
