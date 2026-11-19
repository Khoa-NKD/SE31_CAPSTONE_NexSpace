package base.api.feature.booking.event;

import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Sự kiện nội bộ được phát ra khi đơn đặt chỗ được xác nhận (thanh toán thành công hoặc phê duyệt).
 */
@Getter
@Builder
public class ResourceBookingConfirmedEvent {
    private final Long bookingId;
    private final String bookingCode;
    private final Long workspaceId;
    private final Long resourceId;
    private final Long customerId;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;
    private final LocalDateTime confirmedAt;
}

