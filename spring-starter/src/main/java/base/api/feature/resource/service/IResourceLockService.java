package base.api.feature.resource.service;

import base.api.feature.resource.dto.LockedResourceContext;

import java.time.LocalDateTime;
import java.util.Collection;

/**
 * Động cơ Kiểm soát Đồng thời & Khóa Tài nguyên Nhất quán (Concurrency & Mutual Exclusion Defense Engine).
 * <p>
 * Đảm bảo các nguyên tắc cốt lõi:
 * 1. Chống Deadlock 100% bằng cách sắp xếp tất cả các ID tài nguyên cần khóa theo thứ tự tăng dần (ID ASC).
 * 2. Khóa bi quan tầng ghi (Pessimistic Write Lock: SELECT ... FOR UPDATE) trên BookableResourceModel.
 * 3. Bảo vệ quan hệ hai chiều ROOM - DESK:
 *    - Đặt Room: Khóa Room và khóa toàn bộ Desk con trực thuộc.
 *    - Đặt Desk con: Khóa Desk con và khóa luôn Parent Room cha (nếu có).
 * 4. Kiểm tra xung đột nguyên tử (Atomic Overlap Check) với booking đã xác nhận, hold đang hiệu lực, và blocked slots.
 */
public interface IResourceLockService {

    /**
     * Khóa tài nguyên mục tiêu và tất cả tài nguyên liên đới (phòng cha hoặc các bàn con),
     * sau đó kiểm tra nguyên tử xem có bị xung đột thời gian không.
     *
     * @param targetResourceId Mã tài nguyên khách hàng muốn đặt/giữ
     * @param startTime Thời gian bắt đầu
     * @param endTime Thời gian kết thúc
     * @return Ngữ cảnh chứa tài nguyên mục tiêu và danh sách các tài nguyên đã khóa bi quan
     */
    LockedResourceContext acquireResourceLock(Long targetResourceId, LocalDateTime startTime, LocalDateTime endTime);

    /**
     * Khóa tài nguyên mục tiêu và tất cả tài nguyên liên đới, loại trừ một đơn booking cụ thể
     * (dùng khi gia hạn hold hoặc cập nhật booking của chính mình).
     *
     * @param targetResourceId Mã tài nguyên khách hàng muốn đặt/giữ
     * @param startTime Thời gian bắt đầu
     * @param endTime Thời gian kết thúc
     * @param excludeBookingId Mã booking cần loại trừ (hoặc null)
     * @return Ngữ cảnh chứa tài nguyên mục tiêu và danh sách các tài nguyên đã khóa bi quan
     */
    LockedResourceContext acquireResourceLock(
            Long targetResourceId,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeBookingId
    );

    /**
     * Khóa nhiều tài nguyên đồng thời theo thứ tự ID ASC và kiểm tra xung đột nguyên tử.
     *
     * @param resourceIds Danh sách mã tài nguyên cần khóa
     * @param startTime Thời gian bắt đầu
     * @param endTime Thời gian kết thúc
     * @param excludeBookingId Mã booking cần loại trừ (hoặc null)
     * @return Ngữ cảnh chứa danh sách các tài nguyên đã khóa bi quan
     */
    LockedResourceContext acquireResourcesLock(
            Collection<Long> resourceIds,
            LocalDateTime startTime,
            LocalDateTime endTime,
            Long excludeBookingId
    );
}

