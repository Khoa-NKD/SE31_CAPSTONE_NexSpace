package base.api.feature.payment.dto.response;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class InvoiceResponseDTO {
    Long bookingId;
    String bookingCode;
    Long orderCode;
    String invoiceNumber;
    String invoiceUrl;
    BigDecimal totalAmount;
    String currency;
    String status;
    LocalDateTime issuedAt;
}
