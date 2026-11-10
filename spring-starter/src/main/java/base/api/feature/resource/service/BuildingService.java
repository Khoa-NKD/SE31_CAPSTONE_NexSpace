package base.api.feature.resource.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.resource.dto.*;
import base.api.feature.resource.repository.*;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** Physical identity is shared; a floor plan remains the workspace-owned allocation and canvas. */
@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class BuildingService {
    private final IBuildingRepository buildings;
    private final IBuildingFloorRepository physicalFloors;
    private final IFloorPlanRepository layouts;
    private final IBookableResourceRepository resources;
    private final IWorkspaceRepository workspaces;
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final EntityManager em;

    public List<BuildingResponses.Building> catalog(Long actorId) {
        eligible(actorId);
        var allFloors = physicalFloors.findByBuildingOrganizerIdOrderByFloorNumberAsc(actorId);
        var allLayouts = layouts.findByWorkspaceOrganizerIdAndBuildingFloorIsNotNull(actorId);
        return buildings.findByOrganizerIdOrderByNameAsc(actorId).stream().map(b ->
            new BuildingResponses.Building(b.getId(), b.getName(), b.getAddress(), ResourceResponses.revision(b),
                allFloors.stream().filter(f -> f.getBuilding().getId().equals(b.getId())).map(f ->
                    new BuildingResponses.PhysicalFloor(f.getId(), f.getName(), f.getFloorNumber(),
                        f.getCanvasWidth(), f.getCanvasHeight(), ResourceResponses.revision(f),
                        allLayouts.stream().filter(l -> l.getBuildingFloor().getId().equals(f.getId())).map(l ->
                            new BuildingResponses.Occupant(l.getWorkspace().getId(), l.getWorkspace().getName(),
                                l.getId(), l.getName(), l.getStatus().name(), l.getUsageX(), l.getUsageY(),
                                l.getUsageWidth(), l.getUsageHeight())).toList())).toList())).toList();
    }

    @Transactional
    public Long createBuilding(Long actorId, BuildingRequests.Building input) {
        eligible(actorId);
        // Serialize organizer-scoped unique names, including concurrent creation requests.
        var owner = users.findById(actorId).orElseThrow(() -> new NotFoundException("Organizer not found"));
        em.refresh(owner, LockModeType.PESSIMISTIC_WRITE);
        if (buildings.existsByOrganizerIdAndNameIgnoreCase(actorId, input.name()))
            throw new ConflictException("A building with this name already exists");
        var b = new BuildingModel(); b.setOrganizer(owner); b.setName(input.name()); b.setAddress(input.address());
        return buildings.saveAndFlush(b).getId();
    }

    @Transactional
    public void updateBuilding(Long actorId, Long id, BuildingRequests.Building input) {
        eligible(actorId);
        var b = building(actorId, id, true);
        revision(b, input.expectedRevision());
        if (!b.getName().equalsIgnoreCase(input.name()) && buildings.existsByOrganizerIdAndNameIgnoreCase(actorId, input.name()))
            throw new ConflictException("A building with this name already exists");
        b.setName(input.name()); b.setAddress(input.address());
    }

    @Transactional
    public void deleteBuilding(Long actorId, Long id, String expectedRevision) {
        eligible(actorId);
        var b = building(actorId, id, true); revision(b, expectedRevision);
        if (physicalFloors.existsByBuildingId(id)) throw new ConflictException("Remove empty physical floors before deleting the building");
        buildings.delete(b); buildings.flush();
    }

    @Transactional
    public Long createPhysicalFloor(Long actorId, Long buildingId, BuildingRequests.PhysicalFloor input) {
        eligible(actorId);
        var b = building(actorId, buildingId, true);
        if (physicalFloors.existsByBuildingIdAndFloorNumber(buildingId, input.floorNumber()))
            throw new ConflictException("This floor already exists in this building. Select it instead");
        var floor = new BuildingFloorModel(); floor.setBuilding(b); floor.setName(input.name());
        floor.setFloorNumber(input.floorNumber()); floor.setCanvasWidth(input.width()); floor.setCanvasHeight(input.height());
        return physicalFloors.saveAndFlush(floor).getId();
    }

    @Transactional
    public void updatePhysicalFloor(Long actorId, Long id, BuildingRequests.PhysicalFloor input) {
        eligible(actorId);
        var f = physicalFloor(actorId, id, true); revision(f, input.expectedRevision());
        if (layouts.existsByBuildingFloorId(id) && (f.getFloorNumber() != input.floorNumber()
            || f.getCanvasWidth().compareTo(input.width()) != 0 || f.getCanvasHeight().compareTo(input.height()) != 0))
            throw new ConflictException("A shared floor's number and dimensions cannot change while workspace layouts are attached");
        if (f.getFloorNumber() != input.floorNumber() && physicalFloors.existsByBuildingIdAndFloorNumber(f.getBuilding().getId(), input.floorNumber()))
            throw new ConflictException("This floor number already exists in the building");
        f.setName(input.name()); f.setFloorNumber(input.floorNumber()); f.setCanvasWidth(input.width()); f.setCanvasHeight(input.height());
    }

    @Transactional
    public void deletePhysicalFloor(Long actorId, Long id, String expectedRevision) {
        eligible(actorId);
        var f = physicalFloor(actorId, id, true); revision(f, expectedRevision);
        if (layouts.existsByBuildingFloorId(id)) throw new ConflictException("This physical floor is still used by a workspace");
        physicalFloors.delete(f); physicalFloors.flush();
    }

    @Transactional
    public List<ResourceResponses.FloorOption> attachBatch(Long actorId, Long workspaceId,
                                                           BuildingRequests.BatchAllocation input) {
        eligible(actorId);
        writableWorkspace(actorId, workspaceId);
        var items = input.allocations();
        if (items == null || items.isEmpty() || items.size() > 100)
            throw new BadRequestException("Select between 1 and 100 physical floors");
        var seen = new HashSet<Long>();
        for (var item : items)
            if (item == null || item.buildingFloorId() == null || !seen.add(item.buildingFloorId()))
                throw new BadRequestException("Each physical floor must be selected exactly once");
        // All allocations share one transaction. Stable lock order avoids opposing floor locks.
        var ordered = items.stream().sorted(Comparator.comparing(BuildingRequests.Allocation::buildingFloorId)).toList();
        var result = new ArrayList<ResourceResponses.FloorOption>();
        for (var item : ordered) result.add(attach(actorId, workspaceId, null, item));
        return result.stream().sorted(Comparator.comparingInt(ResourceResponses.FloorOption::floorNumber)).toList();
    }

    @Transactional
    public ResourceResponses.FloorOption attach(Long actorId, Long workspaceId, Long existingLayoutId,
                                                BuildingRequests.Allocation input) {
        eligible(actorId);
        var workspace = writableWorkspace(actorId, workspaceId);
        FloorPlanModel layout;
        if (existingLayoutId != null) {
            layout = layouts.findById(existingLayoutId).filter(f -> f.getWorkspace().getId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundException("Workspace layout not found"));
            em.refresh(layout, LockModeType.PESSIMISTIC_WRITE); revision(layout, input.expectedRevision());
            if (layout.getBuildingFloor() != null)
                throw new ConflictException("This layout is already mapped. Remove an empty allocation before remapping");
        } else {
            layout = new FloorPlanModel(); layout.setWorkspace(workspace); layout.setName(input.name());
        }
        bind(actorId, workspaceId, layout, input);
        if (existingLayoutId == null) layout.setDraftLayoutJson(ResourceCanvas.writeDecorations(layout,
            new ResourceCanvas.Bounds(input.width(), input.height()), List.of()));
        layouts.saveAndFlush(layout); em.refresh(layout);
        return ResourceResponses.floorOption(layout);
    }

    /** Called inside the workspace-locked resource transaction; physical floor lock serializes allocations. */
    public void bind(Long actorId, Long workspaceId, FloorPlanModel layout, BuildingRequests.Allocation input) {
        var physical = physicalFloor(actorId, input.buildingFloorId(), true);
        var currentLayouts = layouts.findByWorkspaceIdOrderByFloorNumberAsc(workspaceId);
        for (var current : currentLayouts) {
            if (Objects.equals(current.getId(), layout.getId())) continue;
            if (current.getFloorNumber() == physical.getFloorNumber())
                throw new ConflictException("This workspace already has a layout for this floor number. Map the existing layout instead");
            if (current.getBuildingFloor() != null && !current.getBuildingFloor().getBuilding().getId().equals(physical.getBuilding().getId()))
                throw new ConflictException("A workspace is one location and cannot occupy different buildings");
        }
        if (input.x().signum() < 0 || input.y().signum() < 0 || input.width().signum() <= 0 || input.height().signum() <= 0
            || input.x().add(input.width()).compareTo(physical.getCanvasWidth()) > 0
            || input.y().add(input.height()).compareTo(physical.getCanvasHeight()) > 0)
            throw new BadRequestException("The workspace area must fit inside the physical floor");
        for (var other : layouts.findByBuildingFloorId(physical.getId())) {
            if (Objects.equals(other.getId(), layout.getId())) continue;
            if (other.getWorkspace().getId().equals(workspaceId)) throw new ConflictException("This workspace already uses this physical floor");
            if (overlaps(input, other)) throw new ConflictException("This area overlaps another workspace on the same physical floor");
        }
        var published = ResourceCanvas.read(layout);
        var draft = ResourceCanvas.editorBounds(layout);
        if ((layout.getLayoutJson() != null && !layout.getLayoutJson().isBlank() && published == null)
            || (layout.getDraftLayoutJson() != null && !layout.getDraftLayoutJson().isBlank() && !ResourceCanvas.ownsDraft(layout)))
            throw new ConflictException("This retained layout format must be reviewed before its physical location can be mapped");
        if ((published != null && !sameSize(published, input)) || (draft != null && !sameSize(draft, input)))
            throw new ConflictException("Keep the existing layout dimensions when mapping it; coordinates and history are preserved");
        var bounds = new ResourceCanvas.Bounds(input.width(), input.height());
        for (var r : resources.findByFloorPlanId(layout.getId() == null ? -1L : layout.getId()))
            if (r.getPosX() != null) ResourceCanvas.fits(r, bounds, false);
        layout.setBuildingFloor(physical); layout.setFloorNumber(physical.getFloorNumber());
        layout.setUsageX(input.x()); layout.setUsageY(input.y()); layout.setUsageWidth(input.width()); layout.setUsageHeight(input.height());
    }

    private boolean sameSize(ResourceCanvas.Bounds bounds, BuildingRequests.Allocation input) {
        return bounds.width().compareTo(input.width()) == 0 && bounds.height().compareTo(input.height()) == 0;
    }
    private boolean overlaps(BuildingRequests.Allocation a, FloorPlanModel b) {
        return a.x().compareTo(b.getUsageX().add(b.getUsageWidth())) < 0 && a.x().add(a.width()).compareTo(b.getUsageX()) > 0
            && a.y().compareTo(b.getUsageY().add(b.getUsageHeight())) < 0 && a.y().add(a.height()).compareTo(b.getUsageY()) > 0;
    }
    private BuildingModel building(Long actor, Long id, boolean lock) {
        var b = buildings.findById(id).filter(v -> v.getOrganizer().getId().equals(actor))
            .orElseThrow(() -> new NotFoundException("Building not found"));
        if (lock) em.refresh(b, LockModeType.PESSIMISTIC_WRITE);
        return b;
    }
    private BuildingFloorModel physicalFloor(Long actor, Long id, boolean lock) {
        var f = physicalFloors.findById(id).filter(v -> v.getBuilding().getOrganizer().getId().equals(actor))
            .orElseThrow(() -> new NotFoundException("Physical floor not found"));
        if (lock) em.refresh(f, LockModeType.PESSIMISTIC_WRITE);
        return f;
    }
    private WorkspaceModel writableWorkspace(Long actor, Long id) {
        var w = workspaces.findById(id).filter(v -> v.getOrganizer().getId().equals(actor))
            .orElseThrow(() -> new NotFoundException("Workspace not found"));
        em.refresh(w, LockModeType.PESSIMISTIC_WRITE);
        if (!Set.of(
                        WorkspaceStatus.DRAFT,
                        WorkspaceStatus.PENDING,
                        WorkspaceStatus.ACTIVE,
                        WorkspaceStatus.MAINTENANCE,
                        WorkspaceStatus.INACTIVE)
                .contains(w.getStatus()))
            throw new ConflictException("This workspace is read-only in its current state");
        return w;
    }
    private void revision(base.api.shared.entity.BaseModel entity, String expected) {
        if (!Objects.equals(expected, ResourceResponses.revision(entity))) throw new ConflictException("This record changed. Reload before continuing");
    }
    private void eligible(Long id) {
        var user = users.findById(id).orElseThrow(() -> new NotFoundException("Organizer not found"));
        if (!user.isActive() || !user.isVerified() || user.getRole() != UserRole.ORGANIZER
            || profiles.findByOrganizerId(id).filter(p -> p.getStatus() == OrganizerProfileStatus.APPROVED).isEmpty())
            throw new ForbiddenException("An active, verified and approved Organizer is required");
    }
}
