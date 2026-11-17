package base.api.feature.workspace.mapper;

import base.api.feature.workspace.dto.response.AmenityResponseDto;
import base.api.shared.entity.workspace.AmenityModel;

public final class AmenityMapper {

    private AmenityMapper() {
    }

    public static AmenityResponseDto toResponseDto(AmenityModel model) {
        if (model == null) {
            return null;
        }

        return AmenityResponseDto.builder()
                .id(model.getId())
                .name(model.getName())
                .category(model.getCategory())
                .icon(model.getIcon())
                .description(model.getDescription())
                .active(model.isActive())
                .organizerId(model.getOrganizer() != null ? model.getOrganizer().getId() : null)
                .custom(model.getOrganizer() != null)
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}
