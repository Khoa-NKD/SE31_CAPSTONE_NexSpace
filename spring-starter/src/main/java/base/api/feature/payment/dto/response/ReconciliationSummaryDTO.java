package base.api.feature.payment.dto.response;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class ReconciliationSummaryDTO {
    long totalTransactions;
    long matchedCount;
    long mismatchCount;
    long unreconciledCount;
    long resolvedCount;
    BigDecimal totalGrossVolume;
    BigDecimal totalPlatformFee;
    BigDecimal totalPayoutAmount;
}
