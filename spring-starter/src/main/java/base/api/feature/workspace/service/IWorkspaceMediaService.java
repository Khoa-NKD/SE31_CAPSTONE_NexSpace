package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.request.AddWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.ReorderWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.SyncWorkspaceMediaDto;
import base.api.feature.workspace.dto.response.WorkspaceMediaResponseDto;

import java.util.List;

public interface IWorkspaceMediaService {

    List<WorkspaceMediaResponseDto> getWorkspaceMedia(Long workspaceId, Long actorId);

    WorkspaceMediaResponseDto addMedia(Long workspaceId, AddWorkspaceMediaDto dto, Long actorId);

    WorkspaceMediaResponseDto uploadAndAddMedia(Long workspaceId, org.springframework.web.multipart.MultipartFile file, Boolean isCover, Long actorId);

    List<WorkspaceMediaResponseDto> syncMedia(Long workspaceId, SyncWorkspaceMediaDto dto, Long actorId);

    WorkspaceMediaResponseDto setCover(Long workspaceId, Long mediaId, Long actorId);

    List<WorkspaceMediaResponseDto> reorderMedia(Long workspaceId, ReorderWorkspaceMediaDto dto, Long actorId);

    void deleteMedia(Long workspaceId, Long mediaId, Long actorId);
}

