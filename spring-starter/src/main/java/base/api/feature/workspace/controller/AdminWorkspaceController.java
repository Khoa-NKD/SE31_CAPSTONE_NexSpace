package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AdminFeaturedWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminModerationWorkspaceDto;
import base.api.feature.workspace.dto.request.AdminReviewWorkspaceDto;
import base.api.feature.workspace.dto.response.AdminWorkspaceKpisDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/admin/workspaces", "/api/admin/workspaces"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
@Tag(name = "Admin Workspaces", description = "API quản trị, kiểm duyệt và điều hành không gian làm việc dành riêng cho Admin")
public class AdminWorkspaceController extends BaseAPIController {

    private final IWorkspaceService workspaceService;

    @Operation(summary = "Xem danh sách thư mục workspace của Admin", description = "Admin xem toàn bộ không gian làm việc với bộ lọc trạng thái, thành phố, tìm kiếm và phân trang")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponseDTO<WorkspaceDto>>> getAdminWorkspaces(
            @RequestParam(required = false) WorkspaceStatus status,
            @RequestParam(required = false) String city,
            @RequestParam(required = false) String search,
            @ModelAttribute PageRequestDTO pageRequest) {
        Page<WorkspaceDto> page = workspaceService.getAdminWorkspaces(status, city, search, pageRequest);
        return successPage(page);
    }

    @Operation(summary = "Lấy thống kê KPI không gian làm việc", description = "Admin xem tổng số lượng không gian theo từng trạng thái (tổng, chờ duyệt, hoạt động, đình chỉ)")
    @GetMapping("/kpis")
    public ResponseEntity<ApiResponse<AdminWorkspaceKpisDto>> getAdminWorkspaceKpis() {
        AdminWorkspaceKpisDto kpis = workspaceService.getAdminWorkspaceKpis();
        return success(kpis);
    }

    @Operation(summary = "Xem chi tiết không gian làm việc cho Admin", description = "Admin xem toàn bộ thông tin chi tiết không gian làm việc bao gồm hình ảnh, giờ làm việc, tầng và tiện ích theo ID")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> getAdminWorkspaceDetail(@PathVariable String id) {
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto result = workspaceService.getWorkspaceDetail(null, workspaceId);
        return success(result);
    }

    @Operation(summary = "Thẩm định duyệt hồ sơ không gian làm việc", description = "Admin phê duyệt (Approved -> ACTIVE) hoặc từ chối (Rejected -> REJECTED kèm lý do)")
    @PatchMapping("/{id}/review")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> adminReviewWorkspace(
            @PathVariable String id,
            @Valid @RequestBody AdminReviewWorkspaceDto dto) {
        Long adminId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto result = workspaceService.adminReviewWorkspace(adminId, workspaceId, dto);
        return success(result, "Kiểm duyệt hồ sơ không gian làm việc thành công");
    }

    @Operation(summary = "Điều hành và đình chỉ không gian làm việc", description = "Admin đình chỉ (Suspended -> SUSPENDED) hoặc khôi phục (Normal -> ACTIVE)")
    @PatchMapping("/{id}/moderation")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> adminModerateWorkspace(
            @PathVariable String id,
            @Valid @RequestBody AdminModerationWorkspaceDto dto) {
        Long adminId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto result = workspaceService.adminModerateWorkspace(adminId, workspaceId, dto);
        return success(result, "Cập nhật điều hành không gian làm việc thành công");
    }

    @Operation(summary = "Đánh dấu không gian làm việc nổi bật", description = "Admin ghim hoặc bỏ ghim không gian làm việc nổi bật lên trang chủ (chỉ áp dụng cho ACTIVE)")
    @PatchMapping("/{id}/featured")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> adminSetFeatured(
            @PathVariable String id,
            @Valid @RequestBody AdminFeaturedWorkspaceDto dto) {
        Long adminId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto result = workspaceService.adminSetFeatured(adminId, workspaceId, dto);
        return success(result, "Cập nhật trạng thái nổi bật thành công");
    }

    private Long parseWorkspaceId(String id) {
        if (id == null || id.isBlank()) {
            throw new BadRequestException("ID không gian không hợp lệ");
        }
        String cleaned = id.trim();
        if (cleaned.toUpperCase().startsWith("WS-")) {
            cleaned = cleaned.substring(3);
        }
        try {
            return Long.parseLong(cleaned);
        } catch (NumberFormatException e) {
            throw new BadRequestException("ID không gian không hợp lệ: " + id);
        }
    }
}

