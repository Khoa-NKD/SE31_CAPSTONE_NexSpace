package base.api.feature.booking.dto.response;

import base.api.shared.enums.BookingStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class AdminBookingItemResponseDTO {
    Long id;
    String bookingCode;
    Long customerId;
    String customerName;
    String customerEmail;
    String customerPhone;
    Long workspaceId;
    String workspaceName;
    String workspaceAddress;
    Long resourceId;
    String resourceName;
    String resourceCategory;
    String resourceZone;
    LocalDateTime startTime;
    LocalDateTime endTime;
    BigDecimal amount;
    BigDecimal platformFee;
    BookingStatus status;
    String qrTokenHash;
    String pinCode;
    LocalDateTime checkedInAt;
    LocalDateTime checkedOutAt;
    LocalDateTime createdAt;
}
