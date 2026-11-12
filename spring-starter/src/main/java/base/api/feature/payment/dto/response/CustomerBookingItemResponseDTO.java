package base.api.feature.payment.dto.response;

import base.api.shared.enums.BookingStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class CustomerBookingItemResponseDTO {
    Long bookingId;
    String bookingCode;
    String workspaceName;
    String workspaceAddress;
    String seatCode;
    String resourceName;
    BookingStatus status;
    LocalDateTime startTime;
    LocalDateTime endTime;
    BigDecimal totalAmount;
    String qrTokenHash;
    String pinCode;
    LocalDateTime createdAt;
}
