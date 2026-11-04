package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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
            @PathVariable Long id,
            @Valid @RequestBody UpdateWorkspaceDto dto) {
        Long organizerId = getCurrentUserId();
        WorkspaceDetailDto updated = workspaceService.updateWorkspace(organizerId, id, dto);
        return success(updated, "Cập nhật không gian làm việc thành công");
    }

    @Operation(summary = "Cập nhật không gian làm việc (PUT)", description = "Cập nhật thông tin không gian làm việc của Organizer")
    @PutMapping("/{id}")
    @PreAuthorize("hasRole('ORGANIZER') or hasRole('ADMIN')")
    public ResponseEntity<ApiResponse<WorkspaceDetailDto>> putWorkspace(
            @PathVariable Long id,
            @Valid @RequestBody UpdateWorkspaceDto dto) {
        Long organizerId = getCurrentUserId();
        WorkspaceDetailDto updated = workspaceService.updateWorkspace(organizerId, id, dto);
        return success(updated, "Cập nhật không gian làm việc thành công");
    }
}
