package base.api.feature.resource.service.impl;

import base.api.feature.resource.service.ISseEmitterService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArrayList;

/**
 * Triển khai dịch vụ quản lý luồng phát sự kiện Server-Sent Events (SSE).
 * Hỗ trợ phân nhóm kết nối theo từng workspaceId, xử lý dọn dẹp kết nối chết an toàn
 * và gửi sự kiện khởi tạo bắt tay (handshake event).
 */
@Service
@Slf4j
public class SseEmitterServiceImpl implements ISseEmitterService {

    /**
     * Thời gian tồn tại mặc định của một kết nối SSE: 30 phút.
     */
    private static final Long SSE_TIMEOUT = 30 * 60 * 1000L;

    /**
     * Bảng ánh xạ lưu danh sách kết nối SSE theo từng workspaceId.
     * Sử dụng ConcurrentHashMap kết hợp CopyOnWriteArrayList để đảm bảo an toàn đa luồng.
     */
    private final Map<Long, List<SseEmitter>> emittersByWorkspace = new ConcurrentHashMap<>();

    @Override
    public SseEmitter subscribe(Long workspaceId) {
        if (workspaceId == null) {
            throw new IllegalArgumentException("Mã không gian làm việc không được để trống khi mở kết nối SSE");
        }

        SseEmitter emitter = new SseEmitter(SSE_TIMEOUT);
        List<SseEmitter> workspaceEmitters = emittersByWorkspace.computeIfAbsent(
                workspaceId,
                k -> new CopyOnWriteArrayList<>()
        );
        workspaceEmitters.add(emitter);

        Runnable cleanup = () -> removeEmitter(workspaceId, emitter);
        emitter.onCompletion(cleanup);
        emitter.onTimeout(cleanup);
        emitter.onError(e -> {
            log.debug("Lỗi kết nối SSE cho workspaceId {}: {}", workspaceId, e.getMessage());
            cleanup.run();
        });

        // Gửi sự kiện khởi tạo (INIT) bắt tay xác nhận kết nối mở thành công
        try {
            emitter.send(SseEmitter.event()
                    .name("INIT")
                    .data("Connected successfully to availability stream for workspace " + workspaceId));
            log.info("Client kết nối SSE thành công tới workspaceId {}. Tổng kết nối active: {}",
                    workspaceId, workspaceEmitters.size());
        } catch (IOException e) {
            log.warn("Không thể gửi sự kiện INIT tới client của workspaceId {}: {}", workspaceId, e.getMessage());
            emitter.completeWithError(e);
            removeEmitter(workspaceId, emitter);
        }

        return emitter;
    }

    @Override
    public void broadcast(Long workspaceId, String eventName, Object data) {
        if (workspaceId == null) {
            return;
        }

        List<SseEmitter> workspaceEmitters = emittersByWorkspace.get(workspaceId);
        if (workspaceEmitters == null || workspaceEmitters.isEmpty()) {
            log.debug("Không có client nào đang lắng nghe SSE tại workspaceId {}", workspaceId);
            return;
        }

        List<SseEmitter> deadEmitters = new ArrayList<>();
        for (SseEmitter emitter : workspaceEmitters) {
            try {
                emitter.send(SseEmitter.event()
                        .name(eventName)
                        .data(data));
            } catch (Exception e) {
                log.debug("Client đã ngắt kết nối hoặc gặp lỗi khi gửi SSE cho workspaceId {}: {}",
                        workspaceId, e.getMessage());
                deadEmitters.add(emitter);
            }
        }

        if (!deadEmitters.isEmpty()) {
            workspaceEmitters.removeAll(deadEmitters);
            if (workspaceEmitters.isEmpty()) {
                emittersByWorkspace.remove(workspaceId);
            }
            log.info("Đã dọn dẹp {} kết nối SSE không còn khả dụng cho workspaceId {}",
                    deadEmitters.size(), workspaceId);
        }
    }

    @Override
    public int getActiveEmitterCount(Long workspaceId) {
        if (workspaceId == null) {
            return 0;
        }
        List<SseEmitter> emitters = emittersByWorkspace.get(workspaceId);
        return emitters != null ? emitters.size() : 0;
    }

    private void removeEmitter(Long workspaceId, SseEmitter emitter) {
        List<SseEmitter> workspaceEmitters = emittersByWorkspace.get(workspaceId);
        if (workspaceEmitters != null) {
            workspaceEmitters.remove(emitter);
            if (workspaceEmitters.isEmpty()) {
                emittersByWorkspace.remove(workspaceId);
            }
            log.debug("Đã ngắt và dọn dẹp kết nối SSE cho workspaceId {}", workspaceId);
        }
    }
}
