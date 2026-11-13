package base.api.feature.resource.service;

import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Service tra cứu khả dụng của tài nguyên theo thời gian thực (Real-time Availability Engine).
 */
public interface IResourceAvailabilityService {

    /**
     * Tra cứu danh sách chỗ ngồi (Desk) và trạng thái khả dụng trong khoảng thời gian xác định.
     *
     * @param workspaceId Mã không gian làm việc
     * @param floorPlanId Mã mặt bằng tầng (tuỳ chọn)
     * @param startTime Thời gian bắt đầu
     * @param endTime Thời gian kết thúc
     * @param currentUserId Mã người dùng đang đăng nhập (hoặc null nếu là khách vãng lai)
     * @return Danh sách chỗ ngồi kèm trạng thái khả dụng
     */
    List<DeskAvailabilityResponseDto> checkDeskAvailability(
            Long workspaceId,
            Long floorPlanId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long currentUserId
    );
}

