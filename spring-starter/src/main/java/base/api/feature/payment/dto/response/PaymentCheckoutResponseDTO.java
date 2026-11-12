package base.api.feature.payment.dto.response;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Immutable response payload containing live VietQR and transfer specifications from PayOS.
 */
@Value
@Builder
public class PaymentCheckoutResponseDTO {
    Long orderCode;
    Long bookingId;
    String bookingCode;
    BigDecimal amount;
    String currency;
    String qrCode;
    String bankBin;
    String bankName;
    String accountNumber;
    String accountName;
    String description;
    LocalDateTime expiresAt;
    String checkoutUrl;
}

