package base.api.feature.payment.dto.payout;

import base.api.shared.enums.WithdrawalBatchStatus;
import base.api.shared.enums.WithdrawalType;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class OrganizerWithdrawalBatchDto {
    Long id;
    String batchCode;
    Long organizerId;
    String organizerName;
    BigDecimal amount;
    WithdrawalType payoutType;
    WithdrawalBatchStatus status;
    String bankName;
    String bankBin;
    String bankAccountNumberMasked;
    String bankAccountHolder;
    String payosReference;
    String errorReason;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}
