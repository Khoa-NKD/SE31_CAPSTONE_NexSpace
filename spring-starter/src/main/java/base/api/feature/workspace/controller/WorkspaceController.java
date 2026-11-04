package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/workspaces", "/api/workspaces"})
@RequiredArgsConstructor
@Tag(name = "Organizer - Workspaces", description = "Quản lý không gian làm việc của Organizer")
public class WorkspaceController extends BaseAPIController {

    private final IWorkspaceService workspaceService;

    @Operation(summary = "Tạo không gian làm việc mới", description = "Tạo không gian làm việc mới ở trạng thái DRAFT cho Organizer hiện tại")
    @PostMapping
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> createWorkspace(
            @Valid @RequestBody CreateWorkspaceDto dto) {
        Long organizerId = getCurrentUserId();
        WorkspaceDetailDto created = workspaceService.createWorkspace(organizerId, dto);
        return created(created, "Tạo không gian làm việc thành công");
    }

    @Operation(summary = "Cập nhật không gian làm việc (PATCH)", description = "Cập nhật từng phần thông tin không gian làm việc của Organizer")
    @PatchMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> updateWorkspace(
            @PathVariable String id,
            @Valid @RequestBody UpdateWorkspaceDto dto) {
        Long organizerId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto updated = workspaceService.updateWorkspace(organizerId, workspaceId, dto);
        return success(updated, "Cập nhật không gian làm việc thành công");
    }

    @Operation(summary = "Cập nhật không gian làm việc (PUT)", description = "Cập nhật thông tin không gian làm việc của Organizer")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> putWorkspace(
            @PathVariable String id,
            @Valid @RequestBody UpdateWorkspaceDto dto) {
        Long organizerId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto updated = workspaceService.updateWorkspace(organizerId, workspaceId, dto);
        return success(updated, "Cập nhật không gian làm việc thành công");
    }

    @Operation(summary = "Xóa mềm không gian làm việc (DELETE)", description = "Lưu trữ / ẩn không gian làm việc mà không xóa dữ liệu lịch sử")
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> deleteWorkspace(
            @PathVariable String id) {
        Long organizerId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto archived = workspaceService.archiveWorkspace(organizerId, workspaceId);
        return success(archived, "Lưu trữ không gian làm việc thành công");
    }

    @Operation(summary = "Lưu trữ không gian làm việc (POST /archive)", description = "Lưu trữ / xóa mềm không gian làm việc")
    @PostMapping("/{id}/archive")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> postArchiveWorkspace(
            @PathVariable String id) {
        Long organizerId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto archived = workspaceService.archiveWorkspace(organizerId, workspaceId);
        return success(archived, "Lưu trữ không gian làm việc thành công");
    }

    @Operation(summary = "Quản lý vòng đời vận hành (PATCH /lifecycle)", description = "Chuyển đổi trạng thái vận hành: archive, pause, resume, maintenance")
    @PatchMapping("/{id}/lifecycle")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> updateLifecycle(
            @PathVariable String id,
            @Valid @RequestBody WorkspaceLifecycleDto dto) {
        Long organizerId = getCurrentUserId();
        Long workspaceId = parseWorkspaceId(id);
        WorkspaceDetailDto result = workspaceService.updateLifecycle(organizerId, workspaceId, dto);
        return success(result, "Cập nhật vòng đời không gian làm việc thành công");
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
