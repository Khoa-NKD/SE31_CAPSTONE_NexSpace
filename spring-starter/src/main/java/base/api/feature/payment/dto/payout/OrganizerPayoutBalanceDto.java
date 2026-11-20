package base.api.feature.payment.dto.payout;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class OrganizerPayoutBalanceDto {
    BigDecimal grossRevenue;
    BigDecimal heldBalance;
    BigDecimal withdrawableBalance;
    BigDecimal paidOutTotal;
    String bankName;
    String bankBin;
    String bankAccountNumberMasked;
    String bankAccountHolder;
    boolean hasConfiguredBank;
    boolean canWithdraw;
}
