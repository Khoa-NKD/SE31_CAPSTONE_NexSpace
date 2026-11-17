package base.api.shared.enums;

/**
 * Trạng thái khả dụng thời gian thực của tài nguyên đặt chỗ (Bookable Resource).
 * Được phân giải theo ngữ cảnh thời gian (State Resolver) phục vụ hiển thị UI và điều phối chỗ.
 */
public enum ResourceOccupancyStatus {
    /**
     * Trống hoàn toàn trong khoảng thời gian yêu cầu, có thể chọn và đặt ngay.
     */
    AVAILABLE,

    /**
     * Đang được một khách hàng giữ tạm thời (ví dụ trong 10 phút chờ thanh toán).
     */
    HOLDING,

    /**
     * Đã có khách hàng đặt chỗ được xác nhận (CONFIRMED, CHECKED_IN, hoặc PENDING_APPROVAL).
     */
    BOOKED,

    /**
     * Bị khóa lịch bảo trì, sửa chữa hoặc sự kiện riêng của chủ không gian (ResourceBlockedSlot).
     */
    BLOCKED,

    /**
     * Bị vô hiệu hóa bởi chủ không gian hoặc hệ thống (DISABLED, ARCHIVED).
     */
    DISABLED
}

