package base.api.feature.payment.dto.response;

import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class ReconciliationResultDTO {
    Long orderCode;
    PaymentStatus localStatus;
    String gatewayStatus;
    BigDecimal localAmount;
    BigDecimal gatewayAmount;
    ReconciliationStatus reconciliationStatus;
    String note;
    LocalDateTime reconciledAt;
}
