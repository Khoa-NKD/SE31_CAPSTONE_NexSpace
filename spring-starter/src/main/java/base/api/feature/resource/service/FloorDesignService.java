package base.api.feature.resource.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.resource.dto.*;
import base.api.feature.resource.repository.*;
import base.api.shared.entity.resource.*;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import jakarta.persistence.EntityManager;
import jakarta.persistence.LockModeType;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class FloorDesignService {
    private final OrganizerResourceService resources;
    private final IFloorPlanRepository floors;
    private final IBookableResourceRepository seats;
    private final ILayoutTemplateRepository templates;
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final EntityManager em;
    private final java.time.Clock organizerApplicationClock;

    public FloorPlanModel owned(Long actor, Long workspace, Long floorId, boolean write) {
        resources.options(actor, workspace);
        var floor = floors.findById(floorId).filter(f -> f.getWorkspace().getId().equals(workspace))
                .orElseThrow(() -> new NotFoundException("Floor not found"));
        if (write) {
            var w = floor.getWorkspace();
            em.refresh(w, LockModeType.PESSIMISTIC_WRITE);
            if (!Set.of(WorkspaceStatus.DRAFT, WorkspaceStatus.PENDING, WorkspaceStatus.ACTIVE,
                    WorkspaceStatus.MAINTENANCE, WorkspaceStatus.INACTIVE).contains(w.getStatus()))
                throw new ConflictException("This workspace is read-only");
            if (floor.getBuildingFloor() != null) em.refresh(floor.getBuildingFloor(), LockModeType.PESSIMISTIC_WRITE);
            em.refresh(floor, LockModeType.PESSIMISTIC_WRITE);
        }
        return floor;
    }

    public FloorDesign.Metrics metrics(Long actor, Long workspace, Long floorId) {
        var floor = owned(actor, workspace, floorId, false);
        var p = floor.getBuildingFloor();
        BigDecimal width = measuredWidth(floor), length = measuredLength(floor);
        BigDecimal mapped = BigDecimal.ZERO;
        boolean complete = true;
        for (var f : floors.findByWorkspaceIdOrderByFloorNumberAsc(workspace)) {
            var fw = measuredWidth(f); var fl = measuredLength(f);
            if (fw == null || fl == null) complete = false;
            else mapped = mapped.add(fw.multiply(fl));
        }
        return new FloorDesign.Metrics(metricRevision(floor), p == null ? null : p.getRealWidthM(),
                p == null ? null : p.getRealLengthM(), width, length,
                width == null || length == null ? null : width.multiply(length).setScale(2, RoundingMode.HALF_UP),
                p == null ? null : p.getMaxOccupancy(), floor.getOccupancyLimit(),
                occupancy(seats.findByFloorPlanId(floorId)), floor.getWorkspace().getAreaSqm(),
                mapped.setScale(2, RoundingMode.HALF_UP), complete, p == null ? 1 : p.getGeometryVersion());
    }

    public MetricFloorGeometry.Review previewMetrics(Long actor, Long workspace, Long floorId, FloorDesign.MetricsInput input) {
        var floor = owned(actor, workspace, floorId, false);
        var physical = floor.getBuildingFloor();
        if (physical == null) throw new ConflictException("Link this layout to a physical building floor first");
        if (!metricRevision(floor).equals(input.expectedRevision())) throw new ConflictException("Floor dimensions changed. Refresh first");
        var allocations = em.createQuery("select f from FloorPlanModel f where f.buildingFloor.id = :id order by f.id", FloorPlanModel.class)
                .setParameter("id", physical.getId()).getResultList();
        var items = em.createQuery("select r from BookableResourceModel r where r.floorPlan.buildingFloor.id = :id order by r.id", BookableResourceModel.class)
                .setParameter("id", physical.getId()).getResultList();
        return measurementPlan(physical, allocations, items, input, false).review();
    }

    @Transactional(isolation = Isolation.READ_COMMITTED)
    public FloorDesign.Metrics saveMetrics(Long actor, Long workspace, Long floorId, FloorDesign.MetricsInput input) {
        var floor = owned(actor, workspace, floorId, true);
        var physical = floor.getBuildingFloor();
        if (physical == null) throw new ConflictException("Link this layout to a physical building floor first");
        em.refresh(physical, LockModeType.PESSIMISTIC_WRITE);
        if (!metricRevision(floor).equals(input.expectedRevision())) throw new ConflictException("Floor dimensions changed. Refresh first");
        var allocations = em.createQuery("select f from FloorPlanModel f where f.buildingFloor.id = :id order by f.id", FloorPlanModel.class)
                .setParameter("id", physical.getId()).setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
        var items = em.createQuery("select r from BookableResourceModel r where r.floorPlan.buildingFloor.id = :id order by r.id", BookableResourceModel.class)
                .setParameter("id", physical.getId()).setLockMode(LockModeType.PESSIMISTIC_WRITE).getResultList();
        var plan = measurementPlan(physical, allocations, items, input, true);
        if (!plan.review().applicable()) throw new ConflictException(String.join("; ", plan.review().issues()));
        if ((plan.review().conversionRequired() || plan.review().measurementMode() == FloorDesign.MeasurementMode.CALIBRATE)
                && !input.confirmGeometryConversion())
            throw new ConflictException("Review the geometry conversion preview and confirm it before saving dimensions");
        int reserved = 0;
        for (var allocation : allocations) {
            Integer limit = allocation.getId().equals(floorId) ? input.occupancyLimit() : allocation.getOccupancyLimit();
            int count = occupancy(em.createQuery("select r from BookableResourceModel r where r.floorPlan.id = :id", BookableResourceModel.class)
                    .setParameter("id", allocation.getId()).setLockMode(LockModeType.PESSIMISTIC_READ).getResultList());
            if (limit != null && count > limit) throw new ConflictException("Existing seats and rooms exceed an area's occupancy limit");
            reserved += limit == null ? count : limit;
        }
        if (input.maxOccupancy() != null && reserved > input.maxOccupancy())
            throw new ConflictException("Workspace occupancy allocations exceed the physical floor limit");
        MetricFloorGeometry.apply(physical, plan, input.widthM(), input.lengthM());
        for (var allocation : allocations) {
            var allocated = items.stream().filter(r -> r.getFloorPlan().getId().equals(allocation.getId())).toList();
            ResourceCanvas.validateScene(allocation, allocated, false);
        }
        physical.setMaxOccupancy(input.maxOccupancy()); floor.setOccupancyLimit(input.occupancyLimit());
        em.flush();
        return metrics(actor, workspace, floorId);
    }

    private MetricFloorGeometry.Plan measurementPlan(BuildingFloorModel physical, List<FloorPlanModel> allocations,
            List<BookableResourceModel> items, FloorDesign.MetricsInput input, boolean lockBookings) {
        if (input.measurementMode() == FloorDesign.MeasurementMode.CALIBRATE)
            throw new ConflictException("Only floor boundary resizing is supported. Workspace areas and resource placements must stay unchanged.");
        var plan = MetricFloorGeometry.prepare(physical, allocations, items, input.widthM(), input.lengthM());
        if (physical.getGeometryVersion() >= 2) return plan;
        boolean known = physical.getRealWidthM() != null && physical.getRealLengthM() != null;
        boolean unequal = known && physical.getCanvasWidth().divide(physical.getRealWidthM(), 12, RoundingMode.HALF_UP)
                .subtract(physical.getCanvasHeight().divide(physical.getRealLengthM(), 12, RoundingMode.HALF_UP))
                .abs().compareTo(new BigDecimal("0.000001")) > 0;
        boolean placed = items.stream().anyMatch(item -> item.getStatus() != base.api.shared.enums.BookableResourceStatus.ARCHIVED)
                || plan.areas().stream().anyMatch(area -> !area.decorations().isEmpty());
        if (!unequal && (known || !placed)) return plan;
        // Missing or contradictory legacy measurements cannot establish a lossless real-world baseline.
        var review = plan.review(); var issues = new ArrayList<>(review.issues());
        issues.add("Legacy floor measurements need manual review before conversion; existing geometry will not be stretched");
        return new MetricFloorGeometry.Plan(new MetricFloorGeometry.Review(review.conversionRequired(), false,
                review.workspaceAreas(), review.resources(), List.copyOf(issues), review.unit(), review.pixelsPerMetre(),
                review.previews(), review.measurementMode(), review.physicalWidthM(), review.physicalLengthM()), plan.areas());
    }

    public static BigDecimal measuredWidth(FloorPlanModel floor) {
        var p = floor.getBuildingFloor();
        if (p != null && p.getGeometryVersion() >= 2 && floor.getUsageWidthM() != null) return floor.getUsageWidthM();
        return p == null || p.getRealWidthM() == null || floor.getUsageWidth() == null ? null :
                floor.getUsageWidth().multiply(p.getRealWidthM()).divide(p.getCanvasWidth(), 6, RoundingMode.HALF_UP);
    }
    public static BigDecimal measuredLength(FloorPlanModel floor) {
        var p = floor.getBuildingFloor();
        if (p != null && p.getGeometryVersion() >= 2 && floor.getUsageLengthM() != null) return floor.getUsageLengthM();
        return p == null || p.getRealLengthM() == null || floor.getUsageHeight() == null ? null :
                floor.getUsageHeight().multiply(p.getRealLengthM()).divide(p.getCanvasHeight(), 6, RoundingMode.HALF_UP);
    }
    public static int occupancy(List<BookableResourceModel> items) {
        // A room's capacity includes its child desks; they are not counted twice.
        return items.stream().filter(r -> r.getStatus() != BookableResourceStatus.ARCHIVED)
                .filter(r -> r.getParentRoom() == null)
                .mapToInt(r -> r.getCapacityOverride() == null ? r.getResourceType().getCapacity() : r.getCapacityOverride()).sum();
    }
    private String metricRevision(FloorPlanModel floor) {
        var p = floor.getBuildingFloor();
        var areas = p == null ? List.of() : em.createQuery(
                "select f.id, f.updatedAt, f.usageX, f.usageY, f.usageWidth, f.usageHeight from FloorPlanModel f where f.buildingFloor.id = :id order by f.id", Object[].class)
                .setParameter("id", p.getId()).getResultList();
        var placements = p == null ? List.of() : em.createQuery(
                "select r.id, r.updatedAt, r.posX, r.posY, r.width, r.height, r.rotation, r.resourceType.id, r.resourceType.updatedAt from BookableResourceModel r where r.floorPlan.buildingFloor.id = :id order by r.id", Object[].class)
                .setParameter("id", p.getId()).getResultList();
        String value = Arrays.asList(ResourceResponses.revision(floor), p == null ? null : ResourceResponses.revision(p),
                p == null ? null : p.getRealWidthM(), p == null ? null : p.getRealLengthM(),
                p == null ? null : p.getMaxOccupancy(), floor.getOccupancyLimit(),
                Arrays.deepToString(areas.toArray()), Arrays.deepToString(placements.toArray())).toString();
        try { return HexFormat.of().formatHex(java.security.MessageDigest.getInstance("SHA-256")
                .digest(value.getBytes(java.nio.charset.StandardCharsets.UTF_8))); }
        catch (java.security.NoSuchAlgorithmException e) { throw new IllegalStateException(e); }
    }
    private void eligible(Long actor) {
        var user = users.findById(actor).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!user.isActive() || !user.isVerified() || user.getRole() != UserRole.ORGANIZER ||
                profiles.findByOrganizerId(actor).filter(p -> p.getStatus() == OrganizerProfileStatus.APPROVED).isEmpty())
            throw new ForbiddenException("An approved Organizer account is required");
    }
    public List<FloorDesign.Template> library(Long actor) {
        eligible(actor);
        return templates.findByOrganizerIdOrderByNameAsc(actor).stream().map(this::view).toList();
    }
    @Transactional
    public FloorDesign.Template saveTemplate(Long actor, Long id, FloorDesign.TemplateInput input) {
        eligible(actor);
        var owner = users.findById(actor).orElseThrow();
        em.refresh(owner, LockModeType.PESSIMISTIC_WRITE);
        var item = id == null ? new LayoutTemplateModel() : templates.findByIdAndOrganizerId(id, actor)
                .orElseThrow(() -> new NotFoundException("Layout template not found"));
        if (id != null && !ResourceResponses.revision(item).equals(input.expectedRevision()))
            throw new ConflictException("Template changed. Refresh first");
        // Locking reads see the latest committed presets after waiting for the owner lock.
        var library = templates.findForUpdateByOrganizerId(actor);
        if (library.stream().anyMatch(existing -> !Objects.equals(existing.getId(), id)
                && existing.getName().trim().equalsIgnoreCase(input.name().trim())))
            throw new ConflictException("A template with this name already exists");
        var identity = LayoutTemplateIdentity.key(input.kind(), input.name());
        if (library.stream().anyMatch(existing -> !Objects.equals(existing.getId(), id)
                && LayoutTemplateIdentity.key(existing.getKind(), existing.getName()).equals(identity)))
            throw new ConflictException("This furnishing already exists in your library. Edit the existing template instead");
        if (id == null && library.size() >= 500)
            throw new ConflictException("The library has reached its 500-template limit");
        item.setOrganizerId(actor); item.setName(input.name().trim()); item.setKind(input.kind());
        item.setWidthM(input.widthM()); item.setLengthM(input.lengthM()); item.setColor(input.color()); item.setIcon(input.icon()); item.setActive(true);
        if (id == null || input.visual3d() != null) item.setVisual3d(input.visual3d());
        templates.saveAndFlush(item); em.refresh(item); return view(item);
    }
    @Transactional
    public void archiveTemplate(Long actor, Long id, String revision) {
        eligible(actor);
        var item = templates.findByIdAndOrganizerId(id, actor).orElseThrow(() -> new NotFoundException("Layout template not found"));
        em.refresh(item, LockModeType.PESSIMISTIC_WRITE);
        if (!ResourceResponses.revision(item).equals(revision)) throw new ConflictException("Template changed. Refresh first");
        item.setActive(false);
    }
    private FloorDesign.Template view(LayoutTemplateModel item) {
        return new FloorDesign.Template(item.getId(), item.getName(), item.getKind(), item.getWidthM(), item.getLengthM(),
                item.getColor(), item.isActive(), ResourceResponses.revision(item), item.getIcon(), item.getVisual3d());
    }
}
