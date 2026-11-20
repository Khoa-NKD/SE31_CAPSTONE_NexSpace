package base.api.feature.resource.service;

import base.api.feature.resource.service.impl.SseEmitterServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("SseEmitterService Unit Tests")
class SseEmitterServiceTest {

    private SseEmitterServiceImpl sseEmitterService;

    @BeforeEach
    void setUp() {
        sseEmitterService = new SseEmitterServiceImpl();
    }

    @Test
    @DisplayName("subscribe - Mở kết nối SSE thành công và tăng số lượng active emitter")
    void subscribe_Success() {
        Long workspaceId = 100L;

        SseEmitter emitter = sseEmitterService.subscribe(workspaceId);

        assertThat(emitter).isNotNull();
        assertThat(sseEmitterService.getActiveEmitterCount(workspaceId)).isEqualTo(1);
    }

    @Test
    @DisplayName("subscribe - Ném lỗi IllegalArgumentException khi workspaceId bị null")
    void subscribe_NullWorkspaceId_ThrowsException() {
        assertThatThrownBy(() -> sseEmitterService.subscribe(null))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("Mã không gian làm việc không được để trống");
    }

    @Test
    @DisplayName("broadcast - Gửi dữ liệu tới client và giữ nguyên kết nối hoạt động")
    void broadcast_SendsDataToSubscribers() {
        Long workspaceId = 200L;
        SseEmitter emitter = sseEmitterService.subscribe(workspaceId);

        sseEmitterService.broadcast(workspaceId, "RESOURCE_AVAILABILITY_CHANGED", "test-payload");

        assertThat(sseEmitterService.getActiveEmitterCount(workspaceId)).isEqualTo(1);
    }

    @Test
    @DisplayName("broadcast - Không gặp lỗi khi workspaceId không có bất kỳ client nào đăng ký")
    void broadcast_NoSubscribers_DoesNotThrow() {
        Long workspaceId = 999L;

        sseEmitterService.broadcast(workspaceId, "RESOURCE_AVAILABILITY_CHANGED", "data");

        assertThat(sseEmitterService.getActiveEmitterCount(workspaceId)).isZero();
    }
}
