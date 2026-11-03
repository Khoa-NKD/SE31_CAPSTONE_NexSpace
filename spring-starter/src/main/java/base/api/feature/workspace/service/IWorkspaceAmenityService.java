package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.AssignAmenityItemDto;
import base.api.feature.workspace.dto.request.AssignWorkspaceAmenitiesDto;
import base.api.feature.workspace.dto.response.WorkspaceAmenityResponseDto;

import java.util.List;

public interface IWorkspaceAmenityService {

    List<WorkspaceAmenityResponseDto> getWorkspaceAmenities(Long workspaceId, Long actorId);

    List<WorkspaceAmenityResponseDto> syncWorkspaceAmenities(Long workspaceId, Long actorId, AssignWorkspaceAmenitiesDto dto);

    WorkspaceAmenityResponseDto addAmenityToWorkspace(Long workspaceId, Long actorId, AssignAmenityItemDto dto);

    void removeAmenityFromWorkspace(Long workspaceId, Long amenityId, Long actorId);
}

