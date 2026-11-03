package base.api.feature.workspace.mapper;

import base.api.feature.workspace.dto.response.WorkspaceMediaResponseDto;
import base.api.shared.entity.workspace.MediaModel;

public final class WorkspaceMediaMapper {

    private WorkspaceMediaMapper() {}

    public static WorkspaceMediaResponseDto toDto(MediaModel model) {
        if (model == null) {
            return null;
        }

        return WorkspaceMediaResponseDto.builder()
                .id(model.getId())
                .workspaceId(model.getWorkspace() != null ? model.getWorkspace().getId() : null)
                .resourceId(model.getResource() != null ? model.getResource().getId() : null)
                .url(model.getUrl())
                .mediaType(model.getMediaType())
                .cover(model.isCover())
                .displayOrder(model.getDisplayOrder())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}

