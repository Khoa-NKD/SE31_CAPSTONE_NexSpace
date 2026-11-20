package base.api.feature.payment.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class BookingHoldResponseDTO {
    Long bookingId;
    String bookingCode;
    Long workspaceId;
    Long resourceId;
    String seatCode;
    String resourceName;
    String workspaceName;
    LocalDateTime holdExpiresAt;
    Long remainingSeconds;
    LocalDateTime serverTime;
    Integer holdDurationMinutes;
    Integer remainingHoldAttempts;
    Integer maxHoldAttempts;
    Integer penaltyBlockMinutes;
    Boolean isBookingSuspended;
    LocalDateTime bookingSuspendedUntil;
}

