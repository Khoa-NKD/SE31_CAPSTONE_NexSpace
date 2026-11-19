package base.api.feature.resource.event;

import base.api.shared.enums.ResourceOccupancyStatus;
import lombok.Builder;
import lombok.Getter;

import java.time.LocalDateTime;

/**
 * Sự kiện miền (Domain Event) chuẩn hóa hợp nhất, biểu diễn sự thay đổi trạng thái khả dụng của tài nguyên
 * theo ngữ cảnh thời gian thực.
 * Phục vụ đồng bộ dữ liệu và phát tín hiệu Server-Sent Events (SSE) tới các máy khách kết nối.
 */
@Getter
@Builder
public class ResourceAvailabilityChangedEvent {
    /**
     * Mã không gian làm việc chủ quản.
     */
    private final Long workspaceId;

    /**
     * Mã tài nguyên bị thay đổi trạng thái (Bàn hoặc Phòng).
     */
    private final Long resourceId;

    /**
     * Tên nhãn của tài nguyên (ví dụ: D-01, R-02).
     */
    private final String resourceLabel;

    /**
     * Mã phòng cha trực thuộc (nếu tài nguyên là bàn con).
     */
    private final Long parentRoomId;

    /**
     * Mã đơn đặt chỗ liên quan (nếu có).
     */
    private final Long bookingId;

    /**
     * Mã hiển thị đơn đặt chỗ (ví dụ: BK-20261119-ABCDEF).
     */
    private final String bookingCode;

    /**
     * Mã khách hàng thực hiện hoặc sở hữu (để hỗ trợ phân biệt isOccupiedByMe trên UI).
     */
    private final Long customerId;

    /**
     * Trạng thái chiếm chỗ mới của tài nguyên.
     */
    private final ResourceOccupancyStatus newStatus;

    /**
     * Kiểu sự kiện kích hoạt thay đổi.
     */
    private final ResourceAvailabilityEventType eventType;

    /**
     * Thời điểm bắt đầu của khoảng thời gian bị ảnh hưởng.
     */
    private final LocalDateTime startTime;

    /**
     * Thời điểm kết thúc của khoảng thời gian bị ảnh hưởng.
     */
    private final LocalDateTime endTime;

    /**
     * Thời hạn hết hạn giữ chỗ tạm thời (nếu eventType = HOLD_CREATED).
     */
    private final LocalDateTime holdExpiresAt;

    /**
     * Thời điểm phát sinh sự kiện trên máy chủ.
     */
    private final LocalDateTime occurredAt;
}

