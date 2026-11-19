package base.api.feature.payment.dto.refund;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class RefundKpisDto {
    long pendingCount;
    BigDecimal pendingVolume;
    long processedCount;
    BigDecimal processedVolume;
    long rejectedCount;
    BigDecimal rejectedVolume;
}
