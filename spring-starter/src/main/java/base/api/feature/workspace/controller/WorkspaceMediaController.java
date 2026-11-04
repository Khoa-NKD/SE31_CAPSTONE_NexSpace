package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AddWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.ReorderWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.SyncWorkspaceMediaDto;
import base.api.feature.workspace.dto.response.WorkspaceMediaResponseDto;
import base.api.feature.workspace.service.IWorkspaceMediaService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/media")
@RequiredArgsConstructor
@Tag(name = "Workspace Gallery", description = "Quản lý bộ sưu tập ảnh và media của không gian làm việc")
public class WorkspaceMediaController extends BaseAPIController {

    private final IWorkspaceMediaService workspaceMediaService;

    @GetMapping
    @Operation(summary = "Lấy danh sách ảnh thuộc không gian làm việc (sắp xếp theo thứ tự hiển thị)")
    public ResponseEntity<ApiResponse<List<WorkspaceMediaResponseDto>>> getWorkspaceMedia(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId
    ) {
        Long actorId = currentUserProvider.getCurrentUser()
                .map(u -> u.getId())
                .orElse(null);
        List<WorkspaceMediaResponseDto> list = workspaceMediaService.getWorkspaceMedia(workspaceId, actorId);
        return success(list, "Lấy danh sách ảnh thành công");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Thêm một ảnh vào không gian làm việc")
    public ResponseEntity<ApiResponse<WorkspaceMediaResponseDto>> addMedia(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Valid @RequestBody AddWorkspaceMediaDto dto
    ) {
        Long actorId = getCurrentUserId();
        WorkspaceMediaResponseDto created = workspaceMediaService.addMedia(workspaceId, dto, actorId);
        return created(created, "Thêm ảnh vào không gian thành công");
    }

    @PutMapping("/sync")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Đồng bộ / lưu hàng loạt bộ sưu tập ảnh của không gian làm việc")
    public ResponseEntity<ApiResponse<List<WorkspaceMediaResponseDto>>> syncMedia(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Valid @RequestBody SyncWorkspaceMediaDto dto
    ) {
        Long actorId = getCurrentUserId();
        List<WorkspaceMediaResponseDto> updated = workspaceMediaService.syncMedia(workspaceId, dto, actorId);
        return success(updated, "Đồng bộ danh sách ảnh thành công");
    }

    @PatchMapping("/{mediaId}/cover")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Đặt ảnh làm ảnh bìa chính diện (Cover Photo) cho không gian làm việc")
    public ResponseEntity<ApiResponse<WorkspaceMediaResponseDto>> setCover(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID ảnh") @PathVariable Long mediaId
    ) {
        Long actorId = getCurrentUserId();
        WorkspaceMediaResponseDto updated = workspaceMediaService.setCover(workspaceId, mediaId, actorId);
        return success(updated, "Đặt ảnh bìa thành công");
    }

    @PutMapping("/reorder")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Sắp xếp lại thứ tự hiển thị các ảnh trong không gian")
    public ResponseEntity<ApiResponse<List<WorkspaceMediaResponseDto>>> reorderMedia(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Valid @RequestBody ReorderWorkspaceMediaDto dto
    ) {
        Long actorId = getCurrentUserId();
        List<WorkspaceMediaResponseDto> reordered = workspaceMediaService.reorderMedia(workspaceId, dto, actorId);
        return success(reordered, "Sắp xếp thứ tự ảnh thành công");
    }

    @DeleteMapping("/{mediaId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Xóa một ảnh khỏi không gian làm việc")
    public ResponseEntity<ApiResponse<Void>> deleteMedia(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID ảnh") @PathVariable Long mediaId
    ) {
        Long actorId = getCurrentUserId();
        workspaceMediaService.deleteMedia(workspaceId, mediaId, actorId);
        return success(null, "Xóa ảnh thành công");
    }
}
