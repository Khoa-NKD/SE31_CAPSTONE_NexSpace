package base.api.feature.resource.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.resource.dto.*;
import base.api.feature.resource.repository.*;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.text.Normalizer;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
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
    private final ResourceUsageRepository usage;
    private final java.time.Clock organizerApplicationClock;

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
                                l.getUsageWidth(), l.getUsageHeight())).toList(), f.getRealWidthM(), f.getRealLengthM(), f.getGeometryVersion())).toList(), b.getLatitude(), b.getLongitude(), b.getCity(), b.getWard())).toList();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Long createBuilding(Long actorId, BuildingRequests.Building input) {
        var owner = lockBuildingCatalog(actorId);
        if (buildings.existsByOrganizerIdAndNameIgnoreCase(actorId, input.name()))
            throw new ConflictException("A building with this name already exists");
        requireAvailableAddress(actorId, normalizeAddress(input.address()));
        var b = new BuildingModel(); b.setOrganizer(owner); b.setName(input.name()); b.setAddress(input.address());
        b.setLatitude(input.latitude()); b.setLongitude(input.longitude());
        b.setCity(input.city()); b.setWard(input.ward());
        buildings.saveAndFlush(b);
        int count = input.floorCount() == null ? 0 : input.floorCount();
        if (count < 0 || count > 100) throw new BadRequestException("Floor count must be between 0 and 100");
        // Building and its empty physical floors are created atomically; workspace allocations stay separate.
        for (int number = 1; number <= count; number++) {
            var floor = new BuildingFloorModel();
            floor.setBuilding(b); floor.setName("Tầng " + number); floor.setFloorNumber(number);
            floor.setGeometryVersion(2);
            floor.setRealWidthM(new BigDecimal("20")); floor.setRealLengthM(new BigDecimal("15"));
            floor.setCanvasWidth(MetricGeometry.pixels(floor.getRealWidthM()));
            floor.setCanvasHeight(MetricGeometry.pixels(floor.getRealLengthM()));
            physicalFloors.save(floor);
        }
        physicalFloors.flush();
        return b.getId();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void updateBuilding(Long actorId, Long id, BuildingRequests.Building input) {
        lockBuildingCatalog(actorId);
        if (input.floorCount() != null && input.floorCount() != 0)
            throw new BadRequestException("Floor count is only supported when creating a building");
        building(actorId, id, false);
        // Lock workspace rows first, matching allocation/activation lock order.
        var lockedWorkspaces = new HashMap<Long, WorkspaceModel>();
        for (var workspaceId : layouts.findWorkspaceIdsByBuildingId(id)) {
            var workspace = workspaces.findById(workspaceId)
                    .filter(candidate -> candidate.getOrganizer().getId().equals(actorId))
                    .orElseThrow(() -> new NotFoundException("Workspace not found"));
            em.refresh(workspace, LockModeType.PESSIMISTIC_WRITE);
            lockedWorkspaces.put(workspaceId, workspace);
        }
        var b = building(actorId, id, true);
        // A workspace detached before we acquired its lock must keep its own location.
        var linkedIds = layouts.findWorkspaceIdsByBuildingId(id);
        if (!lockedWorkspaces.keySet().containsAll(linkedIds))
            throw new ConflictException("Building allocations changed. Refresh before updating its address");
        revision(b, input.expectedRevision());
        if (!b.getName().equalsIgnoreCase(input.name()) && buildings.existsByOrganizerIdAndNameIgnoreCase(actorId, input.name()))
            throw new ConflictException("A building with this name already exists");
        var address = normalizeAddress(input.address());
        if (!address.equals(normalizeAddress(b.getAddress())))
            requireAvailableAddress(actorId, address);
        // Legacy address-only edits must not leave a pin pointing at an old address.
        if (input.latitude() != null || !Objects.equals(b.getAddress(), input.address())) {
            b.setLatitude(input.latitude()); b.setLongitude(input.longitude());
        }
        b.setName(input.name()); b.setAddress(input.address());
        if (input.city() != null) b.setCity(input.city());
        if (input.ward() != null) b.setWard(input.ward());
        if (!linkedIds.isEmpty()) {
            requireLocation(b);
            linkedIds.forEach(workspaceId -> copyLocation(b, lockedWorkspaces.get(workspaceId)));
        }
    }

    private UserModel lockBuildingCatalog(Long actorId) {
        var owner = eligible(actorId);
        // Serialize name and address checks across building creates and updates by this organizer.
        em.refresh(owner, LockModeType.PESSIMISTIC_WRITE);
        return owner;
    }

    private void requireAvailableAddress(Long actorId, String address) {
        if (buildings.findAddressesByOrganizerId(actorId).stream()
                .map(BuildingService::normalizeAddress)
                .anyMatch(address::equals))
            throw new ConflictException("A building with this address already exists");
    }

    private static String normalizeAddress(String address) {
        return Normalizer.normalize(address, Normalizer.Form.NFC)
                .replaceAll("(?U)\\s+", " ")
                .strip()
                .replaceAll(" *, *", ",")
                .toLowerCase(Locale.ROOT);
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
        if (input.widthM() != null || input.lengthM() != null) {
            requireMatchingMetricCanvas(input);
            floor.setGeometryVersion(2); floor.setRealWidthM(input.widthM()); floor.setRealLengthM(input.lengthM());
        }
        return physicalFloors.saveAndFlush(floor).getId();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public void updatePhysicalFloor(Long actorId, Long id, BuildingRequests.PhysicalFloor input) {
        eligible(actorId);
        var f = physicalFloor(actorId, id, true); revision(f, input.expectedRevision());
        boolean attached = layouts.existsByBuildingFloorId(id);
        boolean pixelSizeChanged = f.getCanvasWidth().compareTo(input.width()) != 0 || f.getCanvasHeight().compareTo(input.height()) != 0;
        boolean realSizeSupplied = input.widthM() != null || input.lengthM() != null;
        if (realSizeSupplied) {
            requireMatchingMetricCanvas(input);
            boolean realSizeChanged = f.getRealWidthM() == null || f.getRealLengthM() == null
                    || f.getRealWidthM().compareTo(input.widthM()) != 0 || f.getRealLengthM().compareTo(input.lengthM()) != 0;
            if (attached && (realSizeChanged || pixelSizeChanged || f.getGeometryVersion() < 2))
                throw new ConflictException("Review real dimensions through the shared floor measurement dialog");
        } else if (f.getGeometryVersion() >= 2 && pixelSizeChanged) {
            throw new ConflictException("Supply real dimensions instead of independently resizing the pixel canvas");
        }
        if (attached && (f.getFloorNumber() != input.floorNumber() || pixelSizeChanged))
            throw new ConflictException("A shared floor's number and dimensions cannot change while workspace layouts are attached");
        // Empty floors can be measured directly; shared floors use the reviewed measurement transaction.
        if (realSizeSupplied && !attached) {
            f.setGeometryVersion(2); f.setRealWidthM(input.widthM()); f.setRealLengthM(input.lengthM());
        }
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

    private static void requireMatchingMetricCanvas(BuildingRequests.PhysicalFloor input) {
        if (input.widthM() == null || input.lengthM() == null
                || MetricGeometry.pixels(input.widthM()).compareTo(input.width()) != 0
                || MetricGeometry.pixels(input.lengthM()).compareTo(input.height()) != 0)
            throw new BadRequestException("The pixel canvas must use the uniform metric scale of the supplied real dimensions");
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
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

    @Transactional(isolation = Isolation.READ_COMMITTED)
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

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public ResourceResponses.FloorOption updateAllocation(Long actor, Long workspaceId, Long floorId, BuildingRequests.Allocation input) {
        eligible(actor);
        writableWorkspace(actor, workspaceId);
        var floor = layouts.findById(floorId).filter(f -> f.getWorkspace().getId().equals(workspaceId))
                .orElseThrow(() -> new NotFoundException("Workspace layout not found"));
        if (floor.getBuildingFloor() == null || !floor.getBuildingFloor().getId().equals(input.buildingFloorId()))
            throw new ConflictException("A workspace area can only be resized or moved on its current physical floor");
        var physical = physicalFloor(actor, input.buildingFloorId(), true);
        em.refresh(floor, LockModeType.PESSIMISTIC_WRITE); revision(floor, input.expectedRevision());
        if (physical.getGeometryVersion() < 2) throw new ConflictException("Confirm real floor dimensions before editing a workspace area");
        if (input.x().signum() < 0 || input.y().signum() < 0
                || input.width().compareTo(MetricGeometry.pixels(new BigDecimal("0.01"))) < 0
                || input.height().compareTo(MetricGeometry.pixels(new BigDecimal("0.01"))) < 0
                || input.x().add(input.width()).compareTo(physical.getCanvasWidth()) > 0
                || input.y().add(input.height()).compareTo(physical.getCanvasHeight()) > 0)
            throw new ConflictException("The workspace area must fit entirely inside the physical floor");
        for (var other : layouts.findByBuildingFloorId(physical.getId()))
            if (!Objects.equals(other.getId(), floorId) && overlaps(input, other))
                throw new ConflictException("The workspace area overlaps another workspace");
        var items = em.createQuery("select r from BookableResourceModel r where r.floorPlan.id = :id order by r.id", BookableResourceModel.class)
                .setParameter("id", floorId).setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
        boolean changed = floor.getUsageX().compareTo(input.x()) != 0 || floor.getUsageY().compareTo(input.y()) != 0
                || floor.getUsageWidth().compareTo(input.width()) != 0 || floor.getUsageHeight().compareTo(input.height()) != 0;
        if (changed && items.stream().anyMatch(r -> usage.hasLiveBooking(r.getId(), java.time.LocalDateTime.ofInstant(
                organizerApplicationClock.instant(), java.time.ZoneOffset.UTC))))
            throw new ConflictException("Workspace area geometry cannot change while its resources have live bookings");
        var objects = ResourceCanvas.decorations(floor, true);
        PublishedGeometry.retain(floor, items);
        floor.setUsageX(input.x()); floor.setUsageY(input.y()); floor.setUsageWidth(input.width()); floor.setUsageHeight(input.height());
        floor.setName(input.name());
        floor.setDraftLayoutJson(ResourceCanvas.writeDecorations(floor, new ResourceCanvas.Bounds(input.width(), input.height()), objects));
        ResourceCanvas.validateScene(floor, items, false);
        layouts.saveAndFlush(floor); em.refresh(floor);
        return ResourceResponses.floorOption(floor);
    }

    /** Called inside the workspace-locked resource transaction; physical floor lock serializes allocations. */
    public void bind(Long actorId, Long workspaceId, FloorPlanModel layout, BuildingRequests.Allocation input) {
        var physical = physicalFloor(actorId, input.buildingFloorId(), true);
        var source = physical.getBuilding();
        em.refresh(source, LockModeType.PESSIMISTIC_READ);
        requireLocation(source);
        if (physical.getRealWidthM() == null || physical.getRealLengthM() == null)
            throw new ConflictException("Set the physical floor's real dimensions before linking a workspace area");
        var scaleX = physical.getCanvasWidth().divide(physical.getRealWidthM(), 12, java.math.RoundingMode.HALF_UP);
        var scaleY = physical.getCanvasHeight().divide(physical.getRealLengthM(), 12, java.math.RoundingMode.HALF_UP);
        if (scaleX.subtract(scaleY).abs().compareTo(new BigDecimal("0.000001")) > 0)
            throw new ConflictException("Review the legacy floor's unequal axis scales before linking another workspace area");
        var currentLayouts = layouts.findByWorkspaceIdOrderByFloorNumberAsc(workspaceId);
        for (var current : currentLayouts) {
            if (Objects.equals(current.getId(), layout.getId())) continue;
            if (current.getFloorNumber() == physical.getFloorNumber())
                throw new ConflictException("This workspace already has a layout for this floor number. Map the existing layout instead");
            if (current.getBuildingFloor() != null && !current.getBuildingFloor().getBuilding().getId().equals(physical.getBuilding().getId()))
                throw new ConflictException("A workspace is one location and cannot occupy different buildings");
        }
        var minimumAreaSize = physical.getGeometryVersion() >= 2 ? new BigDecimal("0.6") : new BigDecimal("0.01");
        if (input.x().signum() < 0 || input.y().signum() < 0 || input.width().compareTo(minimumAreaSize) < 0 || input.height().compareTo(minimumAreaSize) < 0
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
        copyLocation(source, layout.getWorkspace());
    }

    /** Keep persisted discovery coordinates/address authoritative at allocation, edit and activation boundaries. */
    @Transactional
    public void syncWorkspaceLocation(WorkspaceModel workspace, boolean requireLinkedFloor) {
        em.refresh(workspace, LockModeType.PESSIMISTIC_WRITE);
        var mapped = layouts.findByWorkspaceIdOrderByFloorNumberAsc(workspace.getId()).stream()
                .filter(floor -> floor.getBuildingFloor() != null).toList();
        if (mapped.isEmpty()) {
            if (requireLinkedFloor) throw new BadRequestException("Link this workspace to a building and physical floor before activating it");
            return;
        }
        var source = mapped.get(0).getBuildingFloor().getBuilding();
        if (mapped.stream().anyMatch(floor -> !floor.getBuildingFloor().getBuilding().getId().equals(source.getId())))
            throw new ConflictException("A workspace can only belong to one building");
        em.refresh(source, LockModeType.PESSIMISTIC_READ);
        requireLocation(source); copyLocation(source, workspace);
    }

    private void requireLocation(BuildingModel building) {
        if (building.getAddress() == null || building.getAddress().isBlank()
                || building.getCity() == null || building.getCity().isBlank()
                || building.getWard() == null || building.getWard().isBlank()
                || building.getLatitude() == null || building.getLongitude() == null)
            throw new BadRequestException("Complete the building address, province, ward and map location before linking a workspace");
    }

    private void copyLocation(BuildingModel building, WorkspaceModel workspace) {
        workspace.setAddress(building.getAddress()); workspace.setCity(building.getCity());
        workspace.setDistrict(building.getWard()); workspace.setLatitude(building.getLatitude());
        workspace.setLongitude(building.getLongitude());
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
    private UserModel eligible(Long id) {
        var user = users.findById(id).orElseThrow(() -> new NotFoundException("Organizer not found"));
        if (!user.isActive() || !user.isVerified() || user.getRole() != UserRole.ORGANIZER
            || profiles.findByOrganizerId(id).filter(p -> p.getStatus() == OrganizerProfileStatus.APPROVED).isEmpty())
            throw new ForbiddenException("An active, verified and approved Organizer is required");
        return user;
    }
}
