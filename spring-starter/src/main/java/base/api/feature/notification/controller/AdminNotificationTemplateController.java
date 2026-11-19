package base.api.feature.notification.controller;

import base.api.feature.notification.dto.request.CreateNotificationTemplateDto;
import base.api.feature.notification.dto.request.UpdateNotificationTemplateDto;
import base.api.feature.notification.dto.response.NotificationTemplateResponseDto;
import base.api.feature.notification.service.INotificationTemplateService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.NotificationChannel;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/admin/notification-templates", "/api/admin/notification-templates"})
@RequiredArgsConstructor
@Tag(name = "Admin Notification Templates", description = "Quản lý mẫu thông báo đa ngôn ngữ và đa kênh cho Admin")
public class AdminNotificationTemplateController extends BaseAPIController {

    private final INotificationTemplateService templateService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem danh sách mẫu thông báo với bộ lọc kênh, ngôn ngữ và từ khóa")
    public ResponseEntity<ApiResponse<PageResponseDTO<NotificationTemplateResponseDto>>> getTemplates(
            @RequestParam(required = false) NotificationChannel channel,
            @RequestParam(required = false) String language,
            @RequestParam(required = false) String search,
            @Valid @ModelAttribute PageRequestDTO pageRequest) {
        Page<NotificationTemplateResponseDto> page = templateService.getTemplates(channel, language, search, pageRequest);
        return successPage(page);
    }

    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem chi tiết một mẫu thông báo theo ID")
    public ResponseEntity<ApiResponse<NotificationTemplateResponseDto>> getTemplateById(@PathVariable Long id) {
        NotificationTemplateResponseDto detail = templateService.getTemplateById(id);
        return success(detail, "Lấy thông tin mẫu thông báo thành công");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Tạo mới một mẫu thông báo đa ngôn ngữ")
    public ResponseEntity<ApiResponse<NotificationTemplateResponseDto>> createTemplate(
            @Valid @RequestBody CreateNotificationTemplateDto dto) {
        NotificationTemplateResponseDto created = templateService.createTemplate(dto);
        return created(created, "Tạo mẫu thông báo thành công");
    }

    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Cập nhật tiêu đề, nội dung hoặc trạng thái của mẫu thông báo")
    public ResponseEntity<ApiResponse<NotificationTemplateResponseDto>> updateTemplate(
            @PathVariable Long id,
            @Valid @RequestBody UpdateNotificationTemplateDto dto) {
        NotificationTemplateResponseDto updated = templateService.updateTemplate(id, dto);
        return success(updated, "Cập nhật mẫu thông báo thành công");
    }

    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xóa một mẫu thông báo")
    public ResponseEntity<ApiResponse<Void>> deleteTemplate(@PathVariable Long id) {
        templateService.deleteTemplate(id);
        return success(null, "Xóa mẫu thông báo thành công");
    }
}
