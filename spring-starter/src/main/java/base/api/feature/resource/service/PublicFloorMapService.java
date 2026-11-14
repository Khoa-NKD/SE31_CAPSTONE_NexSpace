package base.api.feature.resource.service;

import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.resource.dto.FloorDecorations;
import base.api.feature.resource.repository.*;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.enums.*;
import base.api.shared.exception.NotFoundException;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class PublicFloorMapService {
    private final IWorkspaceRepository workspaces;
    private final IFloorPlanRepository floors;
    private final IBookableResourceRepository resources;
    private final IOrganizerProfileRepository profiles;

    public record ObjectView(
            Long id,
            String code,
            String name,
            ResourceCategory category,
            BigDecimal posX,
            BigDecimal posY,
            BigDecimal width,
            BigDecimal height,
            BigDecimal rotation,
            boolean selectable,
            Integer capacity,
            String typeName,
            BigDecimal pricePerHour,
            String zoneName) {}

    public record FloorView(
            Long id,
            String name,
            BigDecimal width,
            BigDecimal height,
            List<ObjectView> resources,
            List<FloorDecorations.Item> decorations,
            base.api.feature.resource.dto.BuildingResponses.Location location) {}

    public List<FloorView> maps(Long workspaceId) {
        var workspace =
                workspaces
                        .findByIdAndStatus(workspaceId, WorkspaceStatus.ACTIVE)
                        .orElseThrow(() -> new NotFoundException("Workspace map not found"));
        if (!workspace.getOrganizer().isActive() || !workspace.getOrganizer().isVerified()) {
            throw new NotFoundException("Workspace map not found");
        }
        var profile = profiles.findByOrganizerId(workspace.getOrganizer().getId())
                .filter(p -> p.getStatus() == OrganizerProfileStatus.APPROVED)
                .orElseThrow(() -> new NotFoundException("Workspace map not found"));
        return floors.findByWorkspaceIdOrderByFloorNumberAsc(workspaceId).stream()
                .filter(
                        f ->
                                f.getStatus() == FloorPlanStatus.PUBLISHED
                                        && ResourceCanvas.read(f) != null)
                .map(
                        f -> {
                            var bounds = ResourceCanvas.read(f);
                            var all = resources.findByFloorPlanId(f.getId());
                            var activeParents =
                                    all.stream()
                                            .filter(
                                                    r ->
                                                            r.getStatus()
                                                                            == BookableResourceStatus
                                                                                    .ACTIVE
                                                                    && r.getParentRoom() != null)
                                            .map(r -> r.getParentRoom().getId())
                                            .collect(java.util.stream.Collectors.toSet());
                            var objects =
                                    all.stream()
                                            .filter(
                                                    r ->
                                                            r.getStatus()
                                                                            == BookableResourceStatus
                                                                                    .ACTIVE
                                                                    || r.getStatus()
                                                                            == BookableResourceStatus
                                                                                    .DISABLED
                                                                    || activeParents.contains(
                                                                            r.getId()))
                                            .filter(
                                                    r ->
                                                            r.getPosX() != null
                                                                    && r.getPosY() != null
                                                                    && r.getWidth() != null
                                                                    && r.getHeight() != null)
                                            .map(
                                                    r -> {
                                                        boolean isRoom = r.getResourceType() != null
                                                                && r.getResourceType().getCategory() == ResourceCategory.ROOM;
                                                        boolean selectable = !profile.isSuspended() && r.getStatus() == BookableResourceStatus.ACTIVE
                                                                && r.getResourceType() != null
                                                                && r.getResourceType().isActive()
                                                                && (isRoom || !activeParents.contains(r.getId()))
                                                                && (r.getParentRoom() == null
                                                                        || r.getParentRoom().getStatus() != BookableResourceStatus.ACTIVE);

                                                        Integer capacity = r.getCapacityOverride() != null
                                                                ? r.getCapacityOverride()
                                                                : (r.getResourceType() != null ? r.getResourceType().getCapacity() : 1);

                                                        String typeName = r.getResourceType() != null ? r.getResourceType().getName() : null;

                                                        BigDecimal price = r.getPricePerHour() != null
                                                                ? r.getPricePerHour()
                                                                : (r.getResourceType() != null ? r.getResourceType().getPricePerHour() : BigDecimal.ZERO);

                                                        return new ObjectView(
                                                                r.getId(),
                                                                r.getLabel(),
                                                                r.getName() == null ? r.getLabel() : r.getName(),
                                                                r.getResourceType() != null ? r.getResourceType().getCategory() : null,
                                                                r.getPosX(),
                                                                r.getPosY(),
                                                                r.getWidth(),
                                                                r.getHeight(),
                                                                r.getRotation(),
                                                                selectable,
                                                                capacity,
                                                                typeName,
                                                                price,
                                                                r.getZoneName());
                                                    })
                                            .toList();
                            return new FloorView(
                                     f.getId(),
                                     f.getName(),
                                     bounds.width(),
                                     bounds.height(),
                                     objects,
                                     ResourceCanvas.decorations(f, false),
                                     base.api.feature.resource.dto.ResourceResponses.floorOption(f).location());
                        })
                .toList();
    }
}
