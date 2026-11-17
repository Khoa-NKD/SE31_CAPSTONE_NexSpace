package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.CreateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.CreateWorkspaceAssetDto;
import base.api.feature.workspace.dto.request.UpdateMaintenanceLogDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceAssetDto;
import base.api.feature.workspace.dto.response.MaintenanceLogResponseDto;
import base.api.feature.workspace.dto.response.WorkspaceAssetResponseDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.enums.AssetStatus;

import java.util.List;

public interface IWorkspaceAssetService {

    PageResponseDTO<WorkspaceAssetResponseDto> getWorkspaceAssets(
            Long workspaceId,
            AssetStatus status,
            String search,
            Boolean all,
            PageRequestDTO pageRequest,
            Long actorId
    );

    default PageResponseDTO<WorkspaceAssetResponseDto> getWorkspaceAssets(
            Long workspaceId,
            AssetStatus status,
            String search,
            PageRequestDTO pageRequest,
            Long actorId
    ) {
        return getWorkspaceAssets(workspaceId, status, search, false, pageRequest, actorId);
    }

    WorkspaceAssetResponseDto getAssetById(Long workspaceId, Long assetId, Long actorId);

    WorkspaceAssetResponseDto createAsset(Long workspaceId, CreateWorkspaceAssetDto dto, Long actorId);

    WorkspaceAssetResponseDto updateAsset(Long workspaceId, Long assetId, UpdateWorkspaceAssetDto dto, Long actorId);

    void deleteAsset(Long workspaceId, Long assetId, Long actorId);

    List<MaintenanceLogResponseDto> getMaintenanceLogs(Long workspaceId, Long assetId, Long actorId);

    MaintenanceLogResponseDto createMaintenanceLog(Long workspaceId, Long assetId, CreateMaintenanceLogDto dto, Long actorId);

    MaintenanceLogResponseDto updateMaintenanceLog(Long workspaceId, Long assetId, Long logId, UpdateMaintenanceLogDto dto, Long actorId);
}

