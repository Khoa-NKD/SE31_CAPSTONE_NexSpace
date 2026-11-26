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
    private final base.api.feature.operations.repository.MaintenanceGroupRepository maintenanceGroups;
    private final IResourceBlockedSlotRepository blocks;
    private final IDecorationMaintenanceRepository decorationMaintenance;
    private final base.api.feature.workspace.repository.IMediaRepository media;

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
            String zoneName,
            base.api.feature.resource.dto.FloorManagement.AvailabilityState state,
            base.api.feature.resource.dto.Visual3d visual3d) {
        public ObjectView(Long id, String code, String name, ResourceCategory category, BigDecimal posX, BigDecimal posY,
                BigDecimal width, BigDecimal height, BigDecimal rotation, boolean selectable, Integer capacity,
                String typeName, BigDecimal pricePerHour, String zoneName) {
            this(id, code, name, category, posX, posY, width, height, rotation, selectable, capacity, typeName,
                    pricePerHour, zoneName, selectable ? base.api.feature.resource.dto.FloorManagement.AvailabilityState.AVAILABLE
                            : base.api.feature.resource.dto.FloorManagement.AvailabilityState.DISABLED, null);
        }
    }

    public record FloorView(
            Long id,
            String name,
            BigDecimal width,
            BigDecimal height,
            List<ObjectView> resources,
            List<FloorDecorations.Item> decorations,
            base.api.feature.resource.dto.BuildingResponses.Location location,
            BigDecimal pixelsPerMetre) {
        public FloorView(Long id, String name, BigDecimal width, BigDecimal height, List<ObjectView> resources,
                List<FloorDecorations.Item> decorations, base.api.feature.resource.dto.BuildingResponses.Location location) {
            this(id,name,width,height,resources,decorations,location,null);
        }
    }

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
        var now = java.time.LocalDateTime.now();
        var maintained = new java.util.HashSet<>(ResourceMaintenance.maintenanceIds(blocks.findForWorkspace(workspaceId, now, now.plusNanos(1))));
        boolean wholeMaintenance = maintenanceGroups.wholeWorkspaceOverlaps(workspaceId, now, now.plusNanos(1));
        if (wholeMaintenance) {
            for (var floor : floors.findByWorkspaceIdOrderByFloorNumberAsc(workspaceId)) {
                resources.findByFloorPlanId(floor.getId()).forEach(r -> maintained.add(r.getId()));
            }
        }
        var maintainedDecorations = decorationMaintenance.overlapping(workspaceId, now, now.plusNanos(1)).stream()
                .map(d -> d.getFloorPlan().getId() + ":" + d.getDecorationId()).collect(java.util.stream.Collectors.toSet());
        return floors.findByWorkspaceIdOrderByFloorNumberAsc(workspaceId).stream()
                .filter(
                        f ->
                                f.getStatus() == FloorPlanStatus.PUBLISHED
                                        && ResourceCanvas.read(f) != null)
                .map(
                        f -> {
                            var bounds = ResourceCanvas.read(f);
                            var all = resources.findByFloorPlanId(f.getId());
                            var published = PublishedGeometry.read(f);
                            boolean locationCurrent = published == null || PublishedGeometry.matchesLocation(f);
                            var activeParents =
                                    all.stream()
                                            .filter(r -> published == null || published.containsKey(r.getId()))
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
                                            .filter(r -> published == null || published.containsKey(r.getId()))
                                            .filter(
                                                    r ->
                                                            r.getStatus()
                                                                            == BookableResourceStatus
                                                                                    .ACTIVE
                                                                    || r.getStatus()
                                                                            == BookableResourceStatus
                                                                                    .DISABLED
                                                                    || activeParents.contains(r.getId())
                                                                    || published != null && published.containsKey(r.getId())
                                                                        && r.getStatus() != BookableResourceStatus.ARCHIVED)
                                            .filter(
                                                    r ->
                                                            r.getPosX() != null
                                                                    && r.getPosY() != null
                                                                    && r.getWidth() != null
                                                                    && r.getHeight() != null)
                                            .map(
                                                    r -> {
                                                        boolean selectable = !profile.isSuspended() && r.getStatus() == BookableResourceStatus.ACTIVE
                                                                && r.getResourceType() != null
                                                                && r.getResourceType().isActive()
                                                                && r.getParentRoom() == null;
                                                        var placement = published == null ? PublishedGeometry.placement(r) : published.get(r.getId());
                                                        selectable = selectable && locationCurrent && (published == null || PublishedGeometry.matches(placement, r));

                                                        Integer capacity = r.getCapacityOverride() != null
                                                                ? r.getCapacityOverride()
                                                                : (r.getResourceType() != null ? r.getResourceType().getCapacity() : 1);

                                                        capacity = ResourceMaintenance.capacity(r, all, maintained);
                                                        var state = ResourceMaintenance.affected(r, maintained) || capacity == 0
                                                                ? base.api.feature.resource.dto.FloorManagement.AvailabilityState.MAINTENANCE
                                                                : r.getStatus() != BookableResourceStatus.ACTIVE || r.getParentRoom() != null && r.getParentRoom().getStatus() != BookableResourceStatus.ACTIVE
                                                                    ? base.api.feature.resource.dto.FloorManagement.AvailabilityState.DISABLED
                                                                    : base.api.feature.resource.dto.FloorManagement.AvailabilityState.AVAILABLE;
                                                        selectable = selectable && state == base.api.feature.resource.dto.FloorManagement.AvailabilityState.AVAILABLE;
                                                        String typeName = r.getResourceType() != null ? r.getResourceType().getName() : null;

                                                        BigDecimal price = r.getPricePerHour() != null
                                                                ? r.getPricePerHour()
                                                                : (r.getResourceType() != null ? r.getResourceType().getPricePerHour() : BigDecimal.ZERO);

                                                        return new ObjectView(
                                                                r.getId(),
                                                                r.getLabel(),
                                                                r.getName() == null ? r.getLabel() : r.getName(),
                                                                r.getResourceType() != null ? r.getResourceType().getCategory() : null,
                                                                placement.posX(),
                                                                placement.posY(),
                                                                placement.width(),
                                                                placement.height(),
                                                                placement.rotation(),
                                                                selectable,
                                                                capacity,
                                                                typeName,
                                                                price,
                                                                r.getZoneName(), state, r.getResourceType() == null ? null : r.getResourceType().getVisual3d());
                                                    })
                                            .toList();
                            return new FloorView(
                                     f.getId(),
                                     f.getName(),
                                     bounds.width(),
                                     bounds.height(),
                                     objects,
                                     ResourceCanvas.decorations(f, false).stream()
                                             .map(d -> maintainedDecorations.contains(f.getId() + ":" + d.id())
                                                     || wholeMaintenance || ResourceMaintenance.affected(DecorationRoom.parent(d, all, f, true), maintained)
                                                     ? new FloorDecorations.Item(d.id(), d.kind(), d.label(), d.posX(), d.posY(), d.width(), d.height(), d.rotation(), "#a855f7", d.icon(), d.visual3d()) : d).toList(),
                                     PublishedGeometry.location(f),
                                     f.getBuildingFloor() != null && f.getBuildingFloor().getGeometryVersion() >= 2
                                         ? base.api.shared.entity.resource.MetricGeometry.PIXELS_PER_METRE : null);
                        })
                .toList();
    }

    public base.api.feature.resource.dto.response.PublicResourceDetailDto resourceDetail(Long workspaceId, Long resourceId) {
        var resource = resources.findDetailedById(resourceId)
                .orElseThrow(() -> new NotFoundException("Resource not found: " + resourceId));
        if (resource.getFloorPlan() == null || resource.getFloorPlan().getWorkspace() == null
                || !resource.getFloorPlan().getWorkspace().getId().equals(workspaceId)) {
            throw new NotFoundException("Resource not found in workspace: " + resourceId);
        }

        List<String> photoUrls = new java.util.ArrayList<>(
                media.findByResourceIdOrderByDisplayOrderAsc(resourceId).stream()
                        .map(base.api.shared.entity.workspace.MediaModel::getUrl)
                        .toList()
        );

        if (resource.getResourceType() != null && resource.getResourceType().getPhotos() != null) {
            for (var p : resource.getResourceType().getPhotos()) {
                if (p != null && p.url() != null && !photoUrls.contains(p.url())) {
                    photoUrls.add(p.url());
                }
            }
        }

        if (photoUrls.isEmpty()) {
            photoUrls.addAll(
                    media.findByWorkspaceIdOrderByDisplayOrderAsc(workspaceId).stream()
                            .map(base.api.shared.entity.workspace.MediaModel::getUrl)
                            .toList()
            );
        }

        var fp = resource.getFloorPlan();
        var rt = resource.getResourceType();
        Integer capacity = resource.getCapacityOverride() != null ? resource.getCapacityOverride()
                : (rt != null ? rt.getCapacity() : 1);
        BigDecimal pricePerHour = resource.getPricePerHour() != null ? resource.getPricePerHour()
                : (rt != null ? rt.getPricePerHour() : BigDecimal.ZERO);

        return base.api.feature.resource.dto.response.PublicResourceDetailDto.builder()
                .id(resource.getId())
                .code(resource.getLabel())
                .name(resource.getName() != null ? resource.getName() : resource.getLabel())
                .category(rt != null ? rt.getCategory() : null)
                .capacity(capacity)
                .pricePerHour(pricePerHour)
                .zoneName(resource.getZoneName())
                .noiseLevel(resource.getNoiseLevel())
                .typeId(rt != null ? rt.getId() : null)
                .typeName(rt != null ? rt.getName() : null)
                .typeDescription(rt != null ? rt.getDescription() : null)
                .photos(photoUrls)
                .floorPlanId(fp.getId())
                .floorName(fp.getName())
                .floorNumber(fp.getFloorNumber())
                .posX(resource.getPosX())
                .posY(resource.getPosY())
                .width(resource.getWidth())
                .height(resource.getHeight())
                .posXM(resource.getPosXM())
                .posYM(resource.getPosYM())
                .build();
    }
}
