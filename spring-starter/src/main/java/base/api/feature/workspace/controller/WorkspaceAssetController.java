package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.CreateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.CreateWorkspaceAssetDto;
import base.api.feature.workspace.dto.request.UpdateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceAssetDto;
import base.api.feature.workspace.dto.response.MaintenanceLogResponseDto;
import base.api.feature.workspace.dto.response.WorkspaceAssetResponseDto;
import base.api.feature.workspace.service.IWorkspaceAssetService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.AssetStatus;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequestMapping("/api/workspaces/{workspaceId}/assets")
@RequiredArgsConstructor
@Tag(name = "Workspace Assets & Maintenance", description = "Quản lý cơ sở vật chất, trang thiết bị và lịch sử bảo trì của không gian làm việc")
public class WorkspaceAssetController extends BaseAPIController {

    private final IWorkspaceAssetService workspaceAssetService;

    @GetMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Lấy danh sách cơ sở vật chất / tài sản (có phân trang hoặc lấy tất cả để lọc tại UI)")
    public ResponseEntity<ApiResponse<PageResponseDTO<WorkspaceAssetResponseDto>>> getAssets(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "Lấy tất cả để lọc UI") @RequestParam(required = false, defaultValue = "false") boolean all,
            @Parameter(description = "Lọc theo trạng thái tài sản") @RequestParam(required = false) AssetStatus status,
            @Parameter(description = "Từ khóa tìm kiếm (theo tên hoặc mã tài sản)") @RequestParam(required = false) String search,
            @ModelAttribute PageRequestDTO pageRequest
    ) {
        Long actorId = getCurrentUserId();
        if (search != null && !search.isBlank()) {
            pageRequest.setSearch(search);
        }
        PageResponseDTO<WorkspaceAssetResponseDto> result = workspaceAssetService.getWorkspaceAssets(
                workspaceId, status, search, all, pageRequest, actorId
        );
        return success(result, "Lấy danh sách tài sản thành công");
    }

    @GetMapping("/{assetId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Lấy thông tin chi tiết một tài sản / thiết bị")
    public ResponseEntity<ApiResponse<WorkspaceAssetResponseDto>> getAssetById(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID tài sản") @PathVariable Long assetId
    ) {
        Long actorId = getCurrentUserId();
        WorkspaceAssetResponseDto asset = workspaceAssetService.getAssetById(workspaceId, assetId, actorId);
        return success(asset, "Lấy thông tin tài sản thành công");
    }

    @PostMapping
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Thêm mới một tài sản / thiết bị vào không gian làm việc")
    public ResponseEntity<ApiResponse<WorkspaceAssetResponseDto>> createAsset(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Valid @RequestBody CreateWorkspaceAssetDto dto
    ) {
        Long actorId = getCurrentUserId();
        WorkspaceAssetResponseDto created = workspaceAssetService.createAsset(workspaceId, dto, actorId);
        return created(created, "Thêm mới tài sản thành công");
    }

    @PutMapping("/{assetId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Cập nhật thông tin tài sản / thiết bị")
    public ResponseEntity<ApiResponse<WorkspaceAssetResponseDto>> updateAsset(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID tài sản") @PathVariable Long assetId,
            @Valid @RequestBody UpdateWorkspaceAssetDto dto
    ) {
        Long actorId = getCurrentUserId();
        WorkspaceAssetResponseDto updated = workspaceAssetService.updateAsset(workspaceId, assetId, dto, actorId);
        return success(updated, "Cập nhật thông tin tài sản thành công");
    }

    @DeleteMapping("/{assetId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Xóa một tài sản / thiết bị khỏi không gian làm việc")
    public ResponseEntity<ApiResponse<Void>> deleteAsset(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID tài sản") @PathVariable Long assetId
    ) {
        Long actorId = getCurrentUserId();
        workspaceAssetService.deleteAsset(workspaceId, assetId, actorId);
        return success(null, "Xóa tài sản thành công");
    }

    @GetMapping("/{assetId}/maintenance")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Lấy danh sách lịch sử bảo trì / báo hỏng của một tài sản")
    public ResponseEntity<ApiResponse<List<MaintenanceLogResponseDto>>> getMaintenanceLogs(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID tài sản") @PathVariable Long assetId
    ) {
        Long actorId = getCurrentUserId();
        List<MaintenanceLogResponseDto> logs = workspaceAssetService.getMaintenanceLogs(workspaceId, assetId, actorId);
        return success(logs, "Lấy danh sách lịch sử bảo trì thành công");
    }

    @PostMapping("/{assetId}/maintenance")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Ghi nhận lịch bảo dưỡng hoặc báo hỏng cho tài sản")
    public ResponseEntity<ApiResponse<MaintenanceLogResponseDto>> createMaintenanceLog(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID tài sản") @PathVariable Long assetId,
            @Valid @RequestBody CreateMaintenanceLogDto dto
    ) {
        Long actorId = getCurrentUserId();
        MaintenanceLogResponseDto created = workspaceAssetService.createMaintenanceLog(workspaceId, assetId, dto, actorId);
        return created(created, "Ghi nhận lịch bảo trì thành công");
    }

    @PatchMapping("/{assetId}/maintenance/{logId}")
    @PreAuthorize("hasAnyRole('ORGANIZER', 'ADMIN')")
    @Operation(summary = "Cập nhật tiến độ hoặc hoàn thành công việc bảo dưỡng / sửa chữa")
    public ResponseEntity<ApiResponse<MaintenanceLogResponseDto>> updateMaintenanceLog(
            @Parameter(description = "ID không gian làm việc") @PathVariable Long workspaceId,
            @Parameter(description = "ID tài sản") @PathVariable Long assetId,
            @Parameter(description = "ID lượt bảo trì") @PathVariable Long logId,
            @Valid @RequestBody UpdateMaintenanceLogDto dto
    ) {
        Long actorId = getCurrentUserId();
        MaintenanceLogResponseDto updated = workspaceAssetService.updateMaintenanceLog(workspaceId, assetId, logId, dto, actorId);
        return success(updated, "Cập nhật tiến độ bảo trì thành công");
    }
}

