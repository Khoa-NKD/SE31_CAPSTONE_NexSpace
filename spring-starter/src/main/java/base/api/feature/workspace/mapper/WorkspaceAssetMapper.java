package base.api.feature.workspace.mapper;

import base.api.feature.workspace.dto.response.MaintenanceLogResponseDto;
import base.api.feature.workspace.dto.response.WorkspaceAssetResponseDto;
import base.api.shared.entity.workspace.AssetMaintenanceLogModel;
import base.api.shared.entity.workspace.WorkspaceAssetModel;

public final class WorkspaceAssetMapper {

    private WorkspaceAssetMapper() {}

    public static WorkspaceAssetResponseDto toDto(WorkspaceAssetModel model) {
        if (model == null) {
            return null;
        }
        return WorkspaceAssetResponseDto.builder()
                .id(model.getId())
                .workspaceId(model.getWorkspace() != null ? model.getWorkspace().getId() : null)
                .assetCode(model.getAssetCode())
                .name(model.getName())
                .quantity(model.getQuantity())
                .status(model.getStatus())
                .resourceId(model.getResource() != null ? model.getResource().getId() : null)
                .resourceName(model.getResource() != null ? model.getResource().getLabel() : null)
                .amenityId(model.getAmenity() != null ? model.getAmenity().getId() : null)
                .amenityName(model.getAmenity() != null ? model.getAmenity().getName() : null)
                .purchaseDate(model.getPurchaseDate())
                .purchasePrice(model.getPurchasePrice())
                .warrantyUntil(model.getWarrantyUntil())
                .nextMaintenanceDate(model.getNextMaintenanceDate())
                .note(model.getNote())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }

    public static MaintenanceLogResponseDto toLogDto(AssetMaintenanceLogModel model) {
        if (model == null) {
            return null;
        }
        return MaintenanceLogResponseDto.builder()
                .id(model.getId())
                .assetId(model.getAsset() != null ? model.getAsset().getId() : null)
                .assetCode(model.getAsset() != null ? model.getAsset().getAssetCode() : null)
                .assetName(model.getAsset() != null ? model.getAsset().getName() : null)
                .maintenanceType(model.getMaintenanceType())
                .status(model.getStatus())
                .description(model.getDescription())
                .reportedById(model.getReportedBy() != null ? model.getReportedBy().getId() : null)
                .reportedByName(model.getReportedBy() != null ? model.getReportedBy().getFullName() : null)
                .performedBy(model.getPerformedBy())
                .cost(model.getCost())
                .scheduledAt(model.getScheduledAt())
                .startedAt(model.getStartedAt())
                .completedAt(model.getCompletedAt())
                .resultNote(model.getResultNote())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}

