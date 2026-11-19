package base.api.feature.resource.event;

/**
 * Kiểu sự kiện thay đổi khả dụng của tài nguyên đặt chỗ trong hệ thống thời gian thực.
 */
public enum ResourceAvailabilityEventType {
    /**
     * Phiên giữ chỗ tạm thời (Hold) vừa được tạo.
     */
    HOLD_CREATED,

    /**
     * Phiên giữ chỗ tạm thời đã hết hạn và được hệ thống tự động giải phóng.
     */
    HOLD_EXPIRED,

    /**
     * Khách hàng chủ động hủy hoặc nhả phiên giữ chỗ tạm thời.
     */
    HOLD_RELEASED,

    /**
     * Đơn đặt chỗ đã thanh toán thành công hoặc được duyệt (Chuyển sang CONFIRMED).
     */
    BOOKING_CONFIRMED,

    /**
     * Đơn đặt chỗ bị hủy bởi khách hàng, chủ không gian hoặc quản trị viên (Chuyển sang CANCELLED).
     */
    BOOKING_CANCELLED,

    /**
     * Khung giờ của tài nguyên bị khóa bảo trì hoặc sự kiện riêng.
     */
    RESOURCE_BLOCKED,

    /**
     * Khung giờ của tài nguyên được mở khóa bảo trì.
     */
    RESOURCE_UNBLOCKED,

    /**
     * Trạng thái thực thể của tài nguyên thay đổi (ACTIVE, DISABLED, ARCHIVED).
     */
    RESOURCE_STATUS_CHANGED
}

