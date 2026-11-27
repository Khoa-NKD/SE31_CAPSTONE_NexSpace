package base.api.feature.payment.dto.refund;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class CustomerRefundKpisDto {
    long totalCount;
    long pendingCount;
    long needsBankInfoCount;
    long processedCount;
    long rejectedCount;
    BigDecimal totalRequestedAmount;
    BigDecimal totalRefundedAmount;
}
