package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/public/workspaces", "/api/public/workspaces"})
@RequiredArgsConstructor
@Tag(name = "Public Workspaces", description = "API công khai tìm kiếm và xem chi tiết không gian làm việc đang hoạt động (không cần đăng nhập)")
public class PublicWorkspaceController extends BaseAPIController {

    private final IWorkspaceService workspaceService;

    @Operation(summary = "Xem danh sách không gian nổi bật", description = "Khách hàng xem danh sách các không gian làm việc nổi bật được tuyển chọn (chỉ workspace ACTIVE)")
    @GetMapping("/featured")
    public ResponseEntity<ApiResponse<java.util.List<WorkspaceDto>>> getFeaturedWorkspaces() {
        java.util.List<WorkspaceDto> list = workspaceService.getFeaturedWorkspaces();
        return success(list);
    }

    @Operation(summary = "Xem chi tiết không gian công khai", description = "Khách hàng xem thông tin không gian làm việc đang hoạt động (ACTIVE)")
    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> getPublicWorkspaceDetail(@PathVariable String id) {
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto detail = workspaceService.getPublicWorkspaceDetail(workspaceId);
        return success(detail);
    }

    @Operation(summary = "Xem danh sách không gian công khai", description = "Khách hàng xem danh sách không gian làm việc đang hoạt động (ACTIVE)")
    @GetMapping
    public ResponseEntity<ApiResponse<PageResponseDTO<WorkspaceDto>>> getPublicWorkspaces(@ModelAttribute PageRequestDTO pageRequest) {
        Page<WorkspaceDto> page = workspaceService.getPublicWorkspaces(pageRequest);
        return successPage(page);
    }

    @Operation(summary = "Xem giờ hoạt động công khai", description = "Khách hàng xem cấu hình giờ mở cửa của workspace ACTIVE")
    @GetMapping("/{id}/operating-hours")
    public ResponseEntity<ApiResponse<java.util.List<base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto>>> getPublicOperatingHours(
            @PathVariable String id) {
        Long workspaceId = parseWorkspaceId(id);
        java.util.List<base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto> hours = workspaceService.getPublicOperatingHours(workspaceId);
        return success(hours);
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

