package base.api.feature.workspace.service;

import base.api.feature.resource.dto.BuildingRequests;
import base.api.feature.resource.service.BuildingService;
import base.api.feature.workspace.dto.request.*;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.exception.NotFoundException;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotNull;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Commits the editor's working copy atomically; never changes publication state. */
@Service
@RequiredArgsConstructor
public class WorkspaceEditService {
    private final IWorkspaceRepository workspaces;
    private final IWorkspaceService workspaceService;
    private final BuildingService buildings;
    private final IWorkspaceAmenityService amenities;
    private final IWorkspaceMediaService media;

    public record Input(@NotNull @Valid UpdateWorkspaceDto workspace,
            @Valid BuildingRequests.WorkspaceSite site, @Valid AssignWorkspaceAmenitiesDto amenities,
            @Valid SyncWorkspaceMediaDto media) {}

    @Transactional
    public WorkspaceDetailDto save(Long actor, Long id, Input input) {
        var workspace = workspaces.findOwnedForResourceUpdate(id, actor)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy không gian."));
        var status = workspace.getBaseStatus();
        if (input.site() != null) buildings.saveWorkspaceSite(actor, id, input.site());
        workspaceService.updateWorkspace(actor, id, input.workspace());
        if (input.amenities() != null) amenities.syncWorkspaceAmenities(id, actor, input.amenities());
        if (input.media() != null) media.syncMedia(id, input.media(), actor);
        workspace.setStatus(status);
        workspaces.saveAndFlush(workspace);
        return workspaceService.getWorkspaceDetail(actor, id);
    }
}
