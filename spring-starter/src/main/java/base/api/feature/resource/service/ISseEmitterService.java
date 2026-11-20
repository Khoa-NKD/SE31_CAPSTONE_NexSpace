package base.api.feature.resource.service;

import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * Giao diện dịch vụ quản lý các kết nối Server-Sent Events (SSE) theo thời gian thực.
 * Phục vụ phân phối sự kiện thay đổi khả dụng chỗ ngồi, phòng họp tới các client đang theo dõi.
 */
public interface ISseEmitterService {

    /**
     * Đăng ký một kết nối SSE mới cho một không gian làm việc xác định.
     *
     * @param workspaceId Mã không gian làm việc cần lắng nghe sự kiện
     * @return SseEmitter đại diện cho luồng kết nối HTTP truyền dữ liệu liên tục
     */
    SseEmitter subscribe(Long workspaceId);

    /**
     * Phát sự kiện tới tất cả các client đang theo dõi không gian làm việc tương ứng.
     *
     * @param workspaceId Mã không gian làm việc nhận thông báo
     * @param eventName   Tên định danh sự kiện (ví dụ: RESOURCE_AVAILABILITY_CHANGED)
     * @param data        Dữ liệu payload của sự kiện
     */
    void broadcast(Long workspaceId, String eventName, Object data);

    /**
     * Lấy số lượng kết nối client đang hoạt động của một không gian làm việc.
     *
     * @param workspaceId Mã không gian làm việc
     * @return Số lượng kết nối đang active
     */
    int getActiveEmitterCount(Long workspaceId);
}
