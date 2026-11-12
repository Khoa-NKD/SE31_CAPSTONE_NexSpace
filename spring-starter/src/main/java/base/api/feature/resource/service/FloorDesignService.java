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
                mapped.setScale(2, RoundingMode.HALF_UP), complete);
    }

    @Transactional
    public FloorDesign.Metrics saveMetrics(Long actor, Long workspace, Long floorId, FloorDesign.MetricsInput input) {
        var floor = owned(actor, workspace, floorId, true);
        var physical = floor.getBuildingFloor();
        if (physical == null) throw new ConflictException("Link this layout to a physical building floor first");
        em.refresh(physical, LockModeType.PESSIMISTIC_WRITE);
        if (!metricRevision(floor).equals(input.expectedRevision())) throw new ConflictException("Floor dimensions changed. Refresh first");
        var allocations = em.createQuery("select f from FloorPlanModel f where f.buildingFloor.id = :id", FloorPlanModel.class)
                .setParameter("id", physical.getId()).setLockMode(LockModeType.PESSIMISTIC_READ).getResultList();
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
        physical.setRealWidthM(input.widthM()); physical.setRealLengthM(input.lengthM());
        physical.setMaxOccupancy(input.maxOccupancy()); floor.setOccupancyLimit(input.occupancyLimit());
        em.flush();
        return metrics(actor, workspace, floorId);
    }

    public static BigDecimal measuredWidth(FloorPlanModel floor) {
        var p = floor.getBuildingFloor();
        return p == null || p.getRealWidthM() == null || floor.getUsageWidth() == null ? null :
                floor.getUsageWidth().multiply(p.getRealWidthM()).divide(p.getCanvasWidth(), 6, RoundingMode.HALF_UP);
    }
    public static BigDecimal measuredLength(FloorPlanModel floor) {
        var p = floor.getBuildingFloor();
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
        String value = Arrays.asList(ResourceResponses.revision(floor), p == null ? null : ResourceResponses.revision(p),
                p == null ? null : p.getRealWidthM(), p == null ? null : p.getRealLengthM(),
                p == null ? null : p.getMaxOccupancy(), floor.getOccupancyLimit()).toString();
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
        if (templates.existsByOrganizerIdAndNameIgnoreCaseAndIdNot(actor, input.name().trim(), id == null ? -1L : id))
            throw new ConflictException("A template with this name already exists");
        if (id == null && templates.findByOrganizerIdOrderByNameAsc(actor).size() >= 500)
            throw new ConflictException("The library has reached its 500-template limit");
        item.setOrganizerId(actor); item.setName(input.name().trim()); item.setKind(input.kind());
        item.setWidthM(input.widthM()); item.setLengthM(input.lengthM()); item.setColor(input.color()); item.setIcon(input.icon()); item.setActive(true);
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
                item.getColor(), item.isActive(), ResourceResponses.revision(item), item.getIcon());
    }
}
