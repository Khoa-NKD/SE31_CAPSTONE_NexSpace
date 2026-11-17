package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AssignAmenityItemDto;
import base.api.feature.workspace.dto.request.AssignWorkspaceAmenitiesDto;
import base.api.feature.workspace.dto.response.WorkspaceAmenityResponseDto;
import base.api.feature.workspace.service.IWorkspaceAmenityService;
import base.api.shared.dto.ApiResponse;
import base.api.shared.base.BaseAPIController;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/amenities")
@RequiredArgsConstructor
@Tag(name = "Workspace Amenities", description = "Quản lý tiện ích gán cho không gian làm việc")
public class WorkspaceAmenityController extends BaseAPIController {

    private final IWorkspaceAmenityService workspaceAmenityService;

    @GetMapping
    @Operation(summary = "Lấy danh sách tiện ích của không gian làm việc")
    public ResponseEntity<ApiResponse<List<WorkspaceAmenityResponseDto>>> getWorkspaceAmenities(
            @PathVariable Long workspaceId
    ) {
        Long actorId = currentUserProvider.getCurrentUser()
                .map(u -> u.getId())
                .orElse(null);
        return success(
                workspaceAmenityService.getWorkspaceAmenities(workspaceId, actorId),
                "Lấy danh sách tiện ích của không gian thành công"
        );
    }

    @PutMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Đồng bộ / Gán toàn bộ danh sách tiện ích cho không gian làm việc")
    public ResponseEntity<ApiResponse<List<WorkspaceAmenityResponseDto>>> syncWorkspaceAmenities(
            @PathVariable Long workspaceId,
            @Valid @RequestBody AssignWorkspaceAmenitiesDto dto
    ) {
        Long actorId = getCurrentUserId();
        return success(
                workspaceAmenityService.syncWorkspaceAmenities(workspaceId, actorId, dto),
                "Cập nhật danh sách tiện ích cho không gian thành công"
        );
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Gán thêm một tiện ích vào không gian làm việc")
    public ResponseEntity<ApiResponse<WorkspaceAmenityResponseDto>> addAmenityToWorkspace(
            @PathVariable Long workspaceId,
            @Valid @RequestBody AssignAmenityItemDto dto
    ) {
        Long actorId = getCurrentUserId();
        return created(
                workspaceAmenityService.addAmenityToWorkspace(workspaceId, actorId, dto),
                "Gán tiện ích cho không gian thành công"
        );
    }

    @DeleteMapping("/{amenityId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Gỡ bỏ một tiện ích khỏi không gian làm việc")
    public ResponseEntity<ApiResponse<Void>> removeAmenityFromWorkspace(
            @PathVariable Long workspaceId,
            @PathVariable Long amenityId
    ) {
        Long actorId = getCurrentUserId();
        workspaceAmenityService.removeAmenityFromWorkspace(workspaceId, amenityId, actorId);
        return success(null, "Gỡ bỏ tiện ích khỏi không gian thành công");
    }
}
