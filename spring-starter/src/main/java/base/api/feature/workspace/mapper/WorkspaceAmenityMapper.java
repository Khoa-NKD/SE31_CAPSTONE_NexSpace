package base.api.feature.workspace.mapper;

import base.api.feature.workspace.dto.response.WorkspaceAmenityResponseDto;
import base.api.shared.entity.workspace.WorkspaceAmenityModel;

import java.math.BigDecimal;

public final class WorkspaceAmenityMapper {

    private WorkspaceAmenityMapper() {}

    public static WorkspaceAmenityResponseDto toDto(WorkspaceAmenityModel model) {
        if (model == null) {
            return null;
        }

        BigDecimal price = model.getAddonPricePerHour();
        boolean complimentary = price == null || price.compareTo(BigDecimal.ZERO) == 0;

        return WorkspaceAmenityResponseDto.builder()
                .id(model.getId())
                .workspaceId(model.getWorkspace() != null ? model.getWorkspace().getId() : null)
                .amenityId(model.getAmenity() != null ? model.getAmenity().getId() : null)
                .name(model.getAmenity() != null ? model.getAmenity().getName() : null)
                .category(model.getAmenity() != null ? model.getAmenity().getCategory() : null)
                .icon(model.getAmenity() != null ? model.getAmenity().getIcon() : null)
                .description(model.getAmenity() != null ? model.getAmenity().getDescription() : null)
                .addonPricePerHour(price != null ? price : BigDecimal.ZERO)
                .isComplimentary(complimentary)
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}

