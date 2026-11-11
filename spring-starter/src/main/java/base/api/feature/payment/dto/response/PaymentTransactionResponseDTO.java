package base.api.feature.payment.dto.response;

import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class PaymentTransactionResponseDTO {
    Long id;
    Long orderCode;
    Long bookingId;
    String bookingCode;
    Long workspaceId;
    String workspaceName;
    String customerName;
    String customerEmail;
    BigDecimal amount;
    BigDecimal receivedAmount;
    String currency;
    PaymentStatus status;
    ReconciliationStatus reconciliationStatus;
    String reconciliationNote;
    String gatewayTransactionId;
    String failureReason;
    String invoiceUrl;
    LocalDateTime paidAt;
    LocalDateTime expiresAt;
    LocalDateTime createdAt;
}
