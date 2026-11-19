package base.api.feature.payment.dto.response;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RefundResponseDTO {
    private Long id;
    private Long bookingId;
    private String bookingCode;
    private String workspaceName;
    private Long customerId;
    private String customerName;
    private String customerEmail;
    private String source;
    private String reason;
    private BigDecimal requestedAmount;
    private BigDecimal approvedAmount;
    private String status;
    private String adminNote;
    private String refundReference;
    private LocalDateTime createdAt;
    private LocalDateTime processedAt;
}
