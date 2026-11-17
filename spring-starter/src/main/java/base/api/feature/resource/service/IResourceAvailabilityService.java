package base.api.feature.resource.service;

import base.api.feature.resource.dto.response.DeskAvailabilityResponseDto;
import base.api.feature.resource.dto.response.RoomAvailabilityResponseDto;

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

    /**
     * Tra cứu danh sách phòng làm việc/họp (Room) và trạng thái khả dụng trong khoảng thời gian xác định,
     * bao gồm phát hiện xung đột hai chiều với các bàn làm việc con (ROOM-DESK Conflict Check)
     * và tính toán khoảng đệm dọn dẹp phòng (Turnaround Buffer).
     *
     * @param workspaceId Mã không gian làm việc
     * @param floorPlanId Mã mặt bằng tầng (tuỳ chọn)
     * @param startTime Thời gian bắt đầu
     * @param endTime Thời gian kết thúc
     * @param minCapacity Sức chứa tối thiểu (tuỳ chọn)
     * @param currentUserId Mã người dùng đang đăng nhập (hoặc null nếu là khách vãng lai)
     * @return Danh sách phòng kèm trạng thái khả dụng và thông tin xung đột ghế con
     */
    List<RoomAvailabilityResponseDto> checkRoomAvailability(
            Long workspaceId,
            Long floorPlanId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Integer minCapacity,
            Long currentUserId
    );
}

