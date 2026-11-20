package base.api.feature.payment.dto.payout;

import base.api.shared.enums.PayoutApprovalStatus;
import base.api.shared.enums.PayoutMode;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class OrganizerPayoutSettingDto {
    Long id;
    Long organizerId;
    String organizerName;
    String legalName;
    PayoutMode payoutMode;
    int autoPayoutHour;
    PayoutApprovalStatus approvalStatus;
    Integer pendingAutoPayoutHour;
    String requestNote;
    String adminFeedback;
    LocalDateTime requestedAt;
    LocalDateTime reviewedAt;
    Long reviewedBy;
}
