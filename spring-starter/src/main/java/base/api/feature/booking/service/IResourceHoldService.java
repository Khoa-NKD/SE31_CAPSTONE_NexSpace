package base.api.feature.booking.service;

import base.api.feature.booking.dto.request.HoldResourceRequestDto;
import base.api.feature.booking.dto.response.HoldResourceResponseDto;

/**
 * Động cơ Giữ chỗ Tạm thời & Tái sử dụng Idempotent (Temporary Hold Engine & Idempotent Reuse).
 * <p>
 * Cung cấp cơ chế:
 * 1. Giới hạn tối đa 3 hold active đồng thời trên mỗi khách hàng (chống spam/đầu cơ giữ chỗ).
 * 2. Idempotent Active Hold Reuse: Tái sử dụng hold cũ nếu cùng khách hàng yêu cầu cùng tài nguyên và khung giờ đang hiệu lực.
 * 3. Đồng bộ hóa với IResourceLockService để bảo vệ chống Deadlock (ID ASC) và xung đột hai chiều ROOM - DESK.
 * 4. Cung cấp serverTime và ttlSeconds để đồng bộ bộ đếm ngược chống lệch giờ máy khách.
 */
public interface IResourceHoldService {

    /**
     * Thực hiện giữ chỗ tạm thời (mặc định 10 phút) cho tài nguyên đã chọn.
     *
     * @param customerId ID khách hàng yêu cầu giữ chỗ
     * @param dto Thông tin yêu cầu giữ chỗ (resourceId, startTime, endTime, ...)
     * @return Thông tin phiên giữ chỗ kèm mốc thời gian hết hạn và serverTime
     */
    HoldResourceResponseDto holdResource(Long customerId, HoldResourceRequestDto dto);

    /**
     * Lấy thông tin phiên giữ chỗ đang active của khách hàng đối với tài nguyên cụ thể.
     *
     * @param customerId ID khách hàng
     * @param resourceId ID tài nguyên
     * @return Thông tin phiên giữ chỗ
     */
    HoldResourceResponseDto getActiveHold(Long customerId, Long resourceId);

    /**
     * Tra cứu thông tin hạn mức giữ chỗ độc lập của khách hàng hiện tại (chống spam hold, hạn mức còn lại, trạng thái khóa).
     *
     * @param customerId ID khách hàng
     * @return Thông tin hạn mức và trạng thái tài khoản
     */
    HoldResourceResponseDto getCustomerHoldQuota(Long customerId);

    /**
     * Khách hàng chủ động hủy/nhả phiên giữ chỗ tạm thời (Manual Release).
     * <p>
     * Tuân thủ các nguyên tắc bảo mật cốt lõi:
     * 1. Strict Ownership Defense: Chỉ chủ sở hữu đơn đặt chỗ mới được nhả hold; nếu sai ném NotFoundException.
     * 2. State Machine Integrity: Chỉ cho phép nhả hold khi đang ở PENDING_PAYMENT hoặc PENDING_APPROVAL.
     * 3. Chuyển trạng thái sang CANCELLED, xóa holdExpiresAt và phát sự kiện nội bộ ResourceHoldReleasedEvent.
     *
     * @param customerId ID khách hàng yêu cầu nhả hold
     * @param bookingId ID đơn đặt chỗ đang giữ
     * @return Thông tin phiên giữ chỗ đã được giải phóng
     */
    HoldResourceResponseDto releaseHold(Long customerId, Long bookingId);

    /**
     * Quét và tự động giải phóng toàn bộ các phiên giữ chỗ PENDING_PAYMENT đã hết hạn thời gian giữ chỗ.
     * <p>
     * Tuân thủ các nguyên tắc:
     * 1. Kiểm tra an toàn: Bỏ qua booking có giao dịch thanh toán thành công (chống race condition với webhook).
     * 2. Cập nhật trạng thái EXPIRED, xóa holdExpiresAt, ghi audit log actor SYSTEM.
     * 3. Phát sự kiện nội bộ ResourceHoldExpiredEvent phục vụ cập nhật realtime SSE.
     *
     * @return Số lượng phiên giữ chỗ đã được giải phóng thành công
     */
    int expireOutdatedHolds();
}
