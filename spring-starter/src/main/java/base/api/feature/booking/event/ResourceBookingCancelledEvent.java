package base.api.feature.booking.event;

import base.api.shared.enums.CancelSource;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Sự kiện nội bộ được phát ra khi đơn đặt chỗ bị hủy bởi khách hàng, chủ không gian hoặc quản trị viên.
 */
@Getter
@Builder
public class ResourceBookingCancelledEvent {
    private final Long bookingId;
    private final String bookingCode;
    private final Long workspaceId;
    private final Long resourceId;
    private final Long customerId;
    private final CancelSource cancelSource;
    private final String cancelReason;
    private final LocalDateTime startTime;
    private final LocalDateTime endTime;
    private final LocalDateTime cancelledAt;
}

