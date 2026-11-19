package base.api.feature.notification.controller;

import base.api.feature.notification.dto.response.UserNotificationResponseDto;
import base.api.feature.notification.service.INotificationService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping({"/api/v1/customer/notifications", "/api/customer/notifications"})
@RequiredArgsConstructor
@PreAuthorize("isAuthenticated()")
@Tag(name = "Customer Notifications", description = "Endpoints for customer notification inbox, unread counts, and read status management")
public class CustomerNotificationController extends BaseAPIController {

    private final INotificationService notificationService;

    @GetMapping
    @Operation(summary = "Lấy danh sách thông báo của khách hàng cá nhân")
    public ResponseEntity<ApiResponse<PageResponseDTO<UserNotificationResponseDto>>> getMyNotifications(
            @RequestParam(required = false) Boolean unreadOnly,
            @ModelAttribute PageRequestDTO pageRequest) {
        Long userId = getCurrentUserId();
        Page<UserNotificationResponseDto> page = notificationService.getUserNotifications(userId, unreadOnly, pageRequest.toPageable());
        return successPage(page);
    }

    @GetMapping("/unread-count")
    @Operation(summary = "Lấy số lượng thông báo chưa đọc của khách hàng cá nhân")
    public ResponseEntity<ApiResponse<Map<String, Long>>> getUnreadCount() {
        Long userId = getCurrentUserId();
        long count = notificationService.getUnreadCount(userId);
        return success(Map.of("unreadCount", count), "Lấy số lượng thông báo chưa đọc thành công");
    }

    @PatchMapping("/{id}/read")
    @Operation(summary = "Đánh dấu một thông báo đã đọc")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long id) {
        Long userId = getCurrentUserId();
        notificationService.markAsRead(userId, id);
        return success(null, "Đã đánh dấu thông báo là đã đọc");
    }

    @PatchMapping("/batch-read")
    @Operation(summary = "Đánh dấu nhiều thông báo là đã đọc")
    public ResponseEntity<ApiResponse<Void>> markBatchAsRead(@RequestBody List<Long> notificationIds) {
        Long userId = getCurrentUserId();
        notificationService.markBatchAsRead(userId, notificationIds);
        return success(null, "Đã đánh dấu các thông báo đã chọn là đã đọc");
    }

    @PatchMapping("/read-all")
    @Operation(summary = "Đánh dấu tất cả thông báo của người dùng đã đọc")
    public ResponseEntity<ApiResponse<Void>> markAllAsRead() {
        Long userId = getCurrentUserId();
        notificationService.markAllAsRead(userId);
        return success(null, "Đã đánh dấu tất cả thông báo là đã đọc");
    }

    @PostMapping("/seed-demo")
    @Operation(summary = "Tạo bộ thông báo mẫu (demo) cho người dùng hiện tại")
    public ResponseEntity<ApiResponse<Void>> seedDemo() {
        Long userId = getCurrentUserId();
        notificationService.seedDemoNotifications(userId);
        return success(null, "Tạo thông báo demo thành công");
    }

    @PostMapping("/trigger-reminder/{bookingId}")
    @Operation(summary = "Kích hoạt thủ công gửi nhắc lịch booking qua email và in-app cho khách hàng")
    public ResponseEntity<ApiResponse<Void>> triggerReminder(@PathVariable Long bookingId) {
        notificationService.triggerBookingReminder(bookingId);
        return success(null, "Đã gửi thông báo nhắc lịch booking thành công");
    }
}
