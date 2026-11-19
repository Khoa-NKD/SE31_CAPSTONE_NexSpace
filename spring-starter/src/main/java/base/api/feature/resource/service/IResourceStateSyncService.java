package base.api.feature.resource.service;

import base.api.shared.entity.booking.BookingModel;

/**
 * Giao diện dịch vụ đồng bộ hóa trạng thái tài nguyên đặt chỗ (State Synchronization Engine).
 * Điều phối phát sự kiện miền và cập nhật đồng bộ hai chiều ROOM - DESK trong toàn bộ vòng đời đặt chỗ.
 */
public interface IResourceStateSyncService {

    /**
     * Kích hoạt đồng bộ khi một phiên giữ chỗ tạm thời (Hold) được tạo thành công.
     *
     * @param booking Bản ghi đơn đặt chỗ ở trạng thái PENDING_PAYMENT hoặc PENDING_APPROVAL
     */
    void syncOnHoldCreated(BookingModel booking);

    /**
     * Kích hoạt đồng bộ khi khách hàng chủ động nhả phiên giữ chỗ tạm thời.
     *
     * @param booking Bản ghi đơn đặt chỗ chuyển sang trạng thái CANCELLED
     */
    void syncOnHoldReleased(BookingModel booking);

    /**
     * Kích hoạt đồng bộ khi hệ thống tự động giải phóng phiên giữ chỗ đã quá hạn 10 phút.
     *
     * @param booking Bản ghi đơn đặt chỗ chuyển sang trạng thái EXPIRED
     */
    void syncOnHoldExpired(BookingModel booking);

    /**
     * Kích hoạt đồng bộ khi đơn đặt chỗ được xác nhận (thanh toán thành công hoặc được duyệt).
     *
     * @param booking Bản ghi đơn đặt chỗ chuyển sang trạng thái CONFIRMED
     */
    void syncOnBookingConfirmed(BookingModel booking);

    /**
     * Kích hoạt đồng bộ khi đơn đặt chỗ bị hủy bởi khách hàng, chủ không gian hoặc quản trị viên.
     *
     * @param booking Bản ghi đơn đặt chỗ chuyển sang trạng thái CANCELLED
     */
    void syncOnBookingCancelled(BookingModel booking);
}

