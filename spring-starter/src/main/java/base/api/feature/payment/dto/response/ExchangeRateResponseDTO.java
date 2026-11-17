package base.api.feature.payment.dto.response;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Currency conversion quote between USD and VND for transparent customer checkout pricing.
 */
@Value
@Builder
public class ExchangeRateResponseDTO {
    String baseCurrency;
    String targetCurrency;
    BigDecimal exchangeRate;
    LocalDateTime updatedAt;
}

