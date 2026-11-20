package base.api.feature.resource.listener;

import base.api.feature.resource.dto.response.ResourceAvailabilityEventPayloadDto;
import base.api.feature.resource.event.ResourceAvailabilityChangedEvent;
import base.api.feature.resource.mapper.ResourceAvailabilityMapper;
import base.api.feature.resource.service.ISseEmitterService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;

/**
 * Bộ lắng nghe sự kiện miền thay đổi khả dụng tài nguyên (ResourceAvailabilityChangedEvent).
 * Áp dụng TransactionPhase.AFTER_COMMIT để đảm bảo dữ liệu chỉ được phát tán tới người dùng
 * qua Server-Sent Events (SSE) sau khi giao dịch cơ sở dữ liệu đã commit thành công 100%.
 */
@Component
@RequiredArgsConstructor
@Slf4j
public class ResourceAvailabilityEventListener {

    public static final String SSE_EVENT_NAME = "RESOURCE_AVAILABILITY_CHANGED";

    private final ISseEmitterService sseEmitterService;

    /**
     * Tiếp nhận sự kiện thay đổi trạng thái chỗ và phát tán tới toàn bộ người dùng đang mở trang.
     * Sử dụng fallbackExecution = true để sự kiện vẫn được xử lý an toàn ngay cả trong các ngữ cảnh
     * chạy nền hoặc kiểm thử không bắt buộc giao dịch cha.
     *
     * @param event Sự kiện miền chứa thông tin tài nguyên và trạng thái chiếm chỗ mới
     */
    @Async
    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT, fallbackExecution = true)
    public void onResourceAvailabilityChanged(ResourceAvailabilityChangedEvent event) {
        if (event == null || event.getWorkspaceId() == null) {
            log.warn("Bỏ qua sự kiện ResourceAvailabilityChangedEvent không hợp lệ hoặc thiếu workspaceId");
            return;
        }

        log.info("Phát sự kiện SSE [{}] sau khi commit DB: workspaceId={}, resourceId={}, newStatus={}, eventType={}",
                SSE_EVENT_NAME, event.getWorkspaceId(), event.getResourceId(), event.getNewStatus(), event.getEventType());

        ResourceAvailabilityEventPayloadDto payload = ResourceAvailabilityMapper.toEventPayloadDto(event);
        sseEmitterService.broadcast(event.getWorkspaceId(), SSE_EVENT_NAME, payload);
    }
}
