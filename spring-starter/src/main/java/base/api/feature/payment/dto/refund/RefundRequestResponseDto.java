package base.api.feature.payment.dto.refund;

import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.RefundSource;
import base.api.shared.enums.RefundStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class RefundRequestResponseDto {
    Long id;
    Long bookingId;
    String bookingCode;
    BookingStatus bookingStatus;
    LocalDateTime bookingStartTime;
    LocalDateTime bookingEndTime;
    Long customerId;
    String customerName;
    String customerEmail;
    Long workspaceId;
    String workspaceName;
    String workspaceAddress;
    String seatCode;
    String resourceName;
    Long paymentOrderCode;
    LocalDateTime paidAt;
    BigDecimal originalPaidAmount;
    BigDecimal requestedAmount;
    BigDecimal approvedAmount;
    RefundStatus status;
    RefundSource source;
    String sourceLabel;
    String reason;
    String bankName;
    String bankBin;
    String bankAccountNumber;
    String bankAccountName;
    boolean needsBankInfo;
    boolean autoRefundSupportedBank;
    String adminNote;
    String refundReference;
    Long reviewedById;
    String reviewedByName;
    LocalDateTime reviewedAt;
    LocalDateTime processedAt;
    LocalDateTime createdAt;
}
