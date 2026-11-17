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
}
