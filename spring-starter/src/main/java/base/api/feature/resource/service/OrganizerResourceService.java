package base.api.feature.resource.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.resource.dto.FloorManagement;
import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.feature.resource.dto.ResourceRequests.*;
import base.api.feature.resource.dto.ResourceResponses;
import base.api.feature.resource.dto.ResourceResponses.*;
import base.api.feature.resource.repository.*;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.resource.*;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;

import jakarta.persistence.EntityManager;

import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.*;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class OrganizerResourceService {
    private final IUserRepository users;
    private final IOrganizerProfileRepository profiles;
    private final IWorkspaceRepository workspaces;
    private final IFloorPlanRepository floors;
    private final IResourceTypeRepository types;
    private final IBookableResourceRepository resources;
    private final ResourceUsageRepository usage;
    private final BuildingService buildings;
    private final EntityManager em;
    private final Clock organizerApplicationClock;

    public List<WorkspaceOption> workspaces(Long actorId) {
        eligible(actorId);
        return workspaces.findByOrganizerIdOrderByIdDesc(actorId).stream()
                .map(w -> new WorkspaceOption(w.getId(), w.getName(), w.getStatus()))
                .toList();
    }

    public Options options(Long actorId, Long workspaceId) {
        eligible(actorId);
        var workspace = owned(actorId, workspaceId, false);
        return new Options(
                workspaceId,
                workspace.getStatus(),
                floors.findByWorkspaceIdOrderByFloorNumberAsc(workspaceId).stream()
                        .map(
                                f ->
                                        ResourceResponses.floorOption(f))
                        .toList(),
                types.findByWorkspaceId(workspaceId).stream()
                        .map(
                                t ->
                                        new TypeOption(
                                                t.getId(),
                                                t.getName(),
                                                t.getCategory(),
                                                t.getCapacity(),
                                                t.getPricePerHour(),
                                                t.getPricePerDay(),
                                                t.getPricePerMonth(),
                                                t.isActive(),
                                                t.getCurrency(),
                                                ResourceResponses.revision(t)))
                        .toList(),
                resources
                        .findByFloorPlanWorkspaceIdAndResourceTypeCategoryAndStatusNot(
                                workspaceId, ResourceCategory.ROOM, BookableResourceStatus.ARCHIVED)
                        .stream()
                        .map(
                                r ->
                                        new RoomOption(
                                                r.getId(),
                                                r.getFloorPlan().getId(),
                                                r.getLabel(),
                                                r.getName() == null ? r.getLabel() : r.getName(),
                                                capacity(r),
                                                r.getStatus()))
                        .toList());
    }

    public Page<Detail> list(
            Long actorId,
            Long workspaceId,
            Long floorId,
            ResourceCategory category,
            BookableResourceStatus status,
            String search,
            int page,
            int size) {
        eligible(actorId);
        owned(actorId, workspaceId, false);
        if (page < 1 || size < 1 || size > 100)
            throw new BadRequestException(
                    "Page must be positive and size must be between 1 and 100");
        if (search != null && search.length() > 100)
            throw new BadRequestException("Search must not exceed 100 characters");
        String pattern =
                search == null || search.isBlank()
                        ? null
                        : "%"
                                + search.trim()
                                        .toLowerCase(Locale.ROOT)
                                        .replace("!", "!!")
                                        .replace("%", "!%")
                                        .replace("_", "!_")
                                + "%";
        return resources
                .findAll(
                        (root, query, cb) -> {
                            var predicates =
                                    new ArrayList<jakarta.persistence.criteria.Predicate>();
                            predicates.add(
                                    cb.equal(
                                            root.get("floorPlan").get("workspace").get("id"),
                                            workspaceId));
                            if (floorId != null)
                                predicates.add(cb.equal(root.get("floorPlan").get("id"), floorId));
                            if (category != null)
                                predicates.add(
                                        cb.equal(
                                                root.get("resourceType").get("category"),
                                                category));
                            if (status != null)
                                predicates.add(cb.equal(root.get("status"), status));
                            if (pattern != null)
                                predicates.add(
                                        cb.or(
                                                cb.like(cb.lower(root.get("label")), pattern, '!'),
                                                cb.like(cb.lower(root.get("name")), pattern, '!')));
                            return cb.and(
                                    predicates.toArray(
                                            jakarta.persistence.criteria.Predicate[]::new));
                        },
                        PageRequest.of(page - 1, size, Sort.by(Sort.Direction.DESC, "id")))
                .map(ResourceResponses::detail);
    }

    public Detail detail(Long actorId, Long id) {
        eligible(actorId);
        return ResourceResponses.detail(readOwned(actorId, id));
    }

    public FloorLayout floorLayout(Long actorId, Long workspaceId, Long floorId) {
        eligible(actorId);
        owned(actorId, workspaceId, false);
        var floor = floor(workspaceId, floorId);
        var bounds = ResourceCanvas.editorBounds(floor);
        boolean editable =
                (floor.getLayoutJson() == null || floor.getLayoutJson().isBlank() || bounds != null)
                        && (ResourceCanvas.ownsDraft(floor)
                                || floor.getDraftLayoutJson() == null
                                || floor.getDraftLayoutJson().isBlank());
        var items =
                resources.findByFloorPlanId(floorId).stream()
                        .filter(r -> r.getStatus() != BookableResourceStatus.ARCHIVED)
                        .map(
                                r ->
                                        new LayoutItem(
                                                r.getId(),
                                                r.getLabel(),
                                                r.getName() == null ? r.getLabel() : r.getName(),
                                                r.getPosX(),
                                                r.getPosY(),
                                                r.getWidth(),
                                                r.getHeight(),
                                                r.getRotation(),
                                                r.getStatus(),
                                                ResourceResponses.revision(r),
                                                r.getResourceType().getCategory(),
                                                r.getParentRoom() == null
                                                        ? null
                                                        : r.getParentRoom().getId()))
                        .toList();
        return new FloorLayout(
                ResourceResponses.floorOption(floor),
                bounds == null ? null : bounds.width(),
                bounds == null ? null : bounds.height(),
                editable,
                items,
                ResourceCanvas.decorations(floor, true),
                ResourceCanvas.ownsDraft(floor));
    }

    @Transactional
    public FloorLayout saveDecorations(
            Long actorId,
            Long workspaceId,
            Long floorId,
            base.api.feature.resource.dto.FloorDecorations.Save request) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var floor = floor(workspaceId, floorId);
        em.refresh(floor, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!request.expectedRevision().equals(ResourceResponses.revision(floor)))
            throw new ConflictException("The floor changed. Reload before saving layout objects");
        if (!floorLayout(actorId, workspaceId, floorId).editableLayout())
            throw new ConflictException(
                    "This floor uses another layout format; it cannot be overwritten here");
        var bounds = new ResourceCanvas.Bounds(request.width(), request.height());
        ResourceCanvas.validateDecorations(request.decorations(), bounds);
        var placedResources = resources.findByFloorPlanId(floorId);
        ResourceCanvas.validateDecorationResources(request.decorations(), placedResources);
        for (var room : placedResources)
            if (room.getResourceType().getCategory() == ResourceCategory.ROOM
                    && room.getStatus() != BookableResourceStatus.ARCHIVED) touchRoom(room);
        for (var resource : resources.findByFloorPlanId(floorId))
            if (resource.getStatus() != BookableResourceStatus.ARCHIVED)
                ResourceCanvas.fits(resource, bounds, false);
        floor.setDraftLayoutJson(
                ResourceCanvas.writeDecorations(floor, bounds, request.decorations()));
        floors.saveAndFlush(floor);
        em.refresh(floor);
        return floorLayout(actorId, workspaceId, floorId);
    }

    @Transactional
    public FloorLayout publishFloor(
            Long actorId, Long workspaceId, Long floorId, PublishFloor request) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var floor = floor(workspaceId, floorId);
        em.refresh(floor, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!request.expectedRevision().equals(ResourceResponses.revision(floor)))
            throw new ConflictException("The floor changed. Reload before publishing");
        if (!floorLayout(actorId, workspaceId, floorId).editableLayout())
            throw new ConflictException(
                    "This floor has an existing layout format or draft. Publish it through its"
                            + " dedicated Floor Plan workflow");
        if (!request.resourcesConfirmed())
            throw new BadRequestException(
                    "Confirm the current resource positions before publishing");
        var current =
                resources.findByFloorPlanId(floorId).stream()
                        .filter(r -> r.getStatus() != BookableResourceStatus.ARCHIVED)
                        .toList();
        var expected = new HashMap<Long, String>();
        for (var item : request.resources())
            if (expected.putIfAbsent(item.id(), item.revision()) != null)
                throw new BadRequestException("Duplicate resource in floor publish snapshot");
        if (current.size() != expected.size()
                || current.stream()
                        .anyMatch(
                                r ->
                                        !ResourceResponses.revision(r)
                                                .equals(expected.get(r.getId()))))
            throw new ConflictException(
                    "The floor resource set changed. Reload and review positions before"
                            + " publishing");
        var bounds = new ResourceCanvas.Bounds(request.width(), request.height());
        for (var resource : current) {
            ResourceCanvas.fits(resource, bounds, true);
            if (resource.getParentRoom() != null)
                ResourceCanvas.fitsInsideRoom(resource, resource.getParentRoom());
            validatePlacement(resource, current);
        }
        var decorations = ResourceCanvas.decorations(floor, true);
        ResourceCanvas.validateDecorations(decorations, bounds);
        ResourceCanvas.validateDecorationResources(decorations, current);
        floor.setLayoutJson(ResourceCanvas.writeDecorations(floor, bounds, decorations));
        floor.setDraftLayoutJson(null);
        floor.setStatus(FloorPlanStatus.PUBLISHED);
        floor.setVersion(floor.getVersion() + 1);
        floor.setPublishedAt(
                LocalDateTime.ofInstant(organizerApplicationClock.instant(), ZoneOffset.UTC));
        floors.saveAndFlush(floor);
        em.refresh(floor);
        return floorLayout(actorId, workspaceId, floorId);
    }

    @Transactional
    public Detail create(Long actorId, Long workspaceId, Input request) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var resource = new BookableResourceModel();
        resource.setFloorPlan(floor(workspaceId, request.floorPlanId()));
        apply(workspaceId, resource, request, false);
        return save(resource);
    }

    /** Temporary client links are resolved inside one transaction and never become database IDs. */
    @Transactional
    public List<BatchResult> saveBatch(Long actorId, Long workspaceId, Long floorId, Batch request) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var floor = lockFloorRevision(workspaceId, floorId, request.expectedFloorRevision());
        var byClient = new LinkedHashMap<String, BatchItem>();
        var existingIds = new HashSet<Long>();
        for (var item : request.items()) {
            if (byClient.putIfAbsent(item.clientId(), item) != null)
                throw new BadRequestException("Duplicate temporary resource key");
            if (!Objects.equals(item.input().floorPlanId(), floorId))
                throw new BadRequestException("Every resource must belong to the selected floor");
            if (item.parentClientId() != null && item.input().parentRoomId() != null)
                throw new BadRequestException("Choose either a saved room or a temporary room");
            if (item.id() != null) {
                if (!existingIds.add(item.id())) throw new BadRequestException("Duplicate resource ID");
                var resource = lockOwned(actorId, item.id());
                if (!resource.getFloorPlan().getId().equals(floorId))
                    throw new BadRequestException("The resource belongs to another floor");
                revision(resource, item.input().expectedRevision());
            }
        }
        for (var item : request.items())
            if (item.parentClientId() != null && !byClient.containsKey(item.parentClientId()))
                throw new BadRequestException("Temporary parent room not found");
        var mapped = new LinkedHashMap<String, Long>();
        var pending = new ArrayList<>(request.items());
        while (!pending.isEmpty()) {
            boolean progressed = false;
            var iterator = pending.iterator();
            while (iterator.hasNext()) {
                var item = iterator.next();
                if (item.parentClientId() != null && !mapped.containsKey(item.parentClientId())) continue;
                var source = item.input();
                Long parentId = item.parentClientId() == null ? source.parentRoomId() : mapped.get(item.parentClientId());
                // Revisions were checked before any parent/child updates could touch their timestamps.
                String expected = null;
                if (item.id() != null) {
                    em.flush();
                    expected = ResourceResponses.revision(lockOwned(actorId, item.id()));
                }
                var input = new Input(floorId, source.resourceTypeId(), source.code(), source.name(),
                        source.zoneName(), source.noiseLevel(), source.capacityOverride(), source.pricePerHour(),
                        source.description(), source.posX(), source.posY(), source.width(), source.height(),
                        source.rotation(), expected, parentId);
                var saved = item.id() == null ? create(actorId, workspaceId, input) : update(actorId, item.id(), input);
                mapped.put(item.clientId(), saved.id());
                iterator.remove();
                progressed = true;
            }
            if (!progressed) throw new BadRequestException("Temporary room links contain a cycle");
        }
        if (request.decorations() != null) {
            var bounds = ResourceCanvas.editorBounds(floor);
            if (bounds == null) throw new ConflictException("The floor needs canvas dimensions first");
            saveDecorations(actorId, workspaceId, floorId,
                    new base.api.feature.resource.dto.FloorDecorations.Save(ResourceResponses.revision(floor),
                            bounds.width(), bounds.height(), request.decorations()));
        }
        // Consume the floor revision, including batches that only create resources, to reject retries.
        var now = LocalDateTime.ofInstant(organizerApplicationClock.instant(), ZoneOffset.UTC);
        floor.setUpdatedAt(floor.getUpdatedAt() != null && !now.isAfter(floor.getUpdatedAt())
                ? floor.getUpdatedAt().plusSeconds(1) : now);
        floors.saveAndFlush(floor);
        return mapped.entrySet().stream()
                .map(entry -> new BatchResult(entry.getKey(), detail(actorId, entry.getValue())))
                .toList();
    }

    @Transactional
    public Detail update(Long actorId, Long id, Input request) {
        eligible(actorId);
        var resource = lockOwned(actorId, id);
        revision(resource, request.expectedRevision());
        if (resource.getStatus() == BookableResourceStatus.ARCHIVED)
            throw new ConflictException("Archived resources are read-only");
        if (!resource.getFloorPlan().getId().equals(request.floorPlanId()))
            throw new ConflictException(
                    "Resources cannot be moved to another floor; create a new resource instead");
        var previousParent = resource.getParentRoom();
        apply(resource.getFloorPlan().getWorkspace().getId(), resource, request, true);
        if (previousParent != null && previousParent != resource.getParentRoom())
            touchRoom(previousParent);
        return save(resource);
    }

    @Transactional
    public Detail status(Long actorId, Long id, Status request) {
        eligible(actorId);
        var resource = lockOwned(actorId, id);
        revision(resource, request.expectedRevision());
        if (resource.getStatus() == BookableResourceStatus.ARCHIVED)
            throw new ConflictException("Archived resources are read-only");
        if (request.status() != BookableResourceStatus.ACTIVE
                && request.status() != BookableResourceStatus.DISABLED)
            throw new BadRequestException("Choose ACTIVE or DISABLED");
        if (request.status() == BookableResourceStatus.ACTIVE) activation(resource);
        if (resource.getStatus() == request.status()) return ResourceResponses.detail(resource);
        resource.setStatus(request.status());
        return save(resource);
    }

    @Transactional
    public void delete(Long actorId, Long id, String expectedRevision) {
        eligible(actorId);
        var resource = lockOwned(actorId, id);
        revision(resource, expectedRevision);
        if (!children(resource).isEmpty())
            throw new ConflictException(
                    "This room still contains desks. Move or delete the desks before deleting the"
                            + " room");
        if (usage.hasAnyBooking(id) || usage.hasOtherDependencies(id))
            throw new ConflictException(
                    "This resource has booking history or linked data. Disable it instead of"
                            + " deleting it");
        touchRoom(resource.getParentRoom());
        resources.delete(resource);
        resources.flush();
    }

    @Transactional
    public FloorOption createFloor(Long actorId, Long workspaceId, Floor request) {
        eligible(actorId);
        var workspace = owned(actorId, workspaceId, true);
        if (request.allocation() == null) throw new BadRequestException("Select a physical building floor and workspace area first");
        var floor = new FloorPlanModel();
        floor.setWorkspace(workspace);
        floor.setName(request.name());
        floor.setFloorNumber(request.floorNumber());
        buildings.bind(actorId, workspaceId, floor, request.allocation());
        floor.setDraftLayoutJson(ResourceCanvas.writeDecorations(floor, new ResourceCanvas.Bounds(request.allocation().width(), request.allocation().height()), List.of()));
        floors.saveAndFlush(floor);
        em.refresh(floor);
        return ResourceResponses.floorOption(floor);
    }

    private FloorPlanModel lockFloorRevision(Long workspaceId, Long floorId, String revision) {
        var floor = floor(workspaceId, floorId);
        em.refresh(floor, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!Objects.equals(revision, ResourceResponses.revision(floor)))
            throw new ConflictException("The floor changed. Reload before continuing");
        return floor;
    }

    @Transactional
    public FloorOption renameFloor(
            Long actorId, Long workspaceId, Long floorId, FloorManagement.Rename input) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var floor = lockFloorRevision(workspaceId, floorId, input.expectedRevision());
        floor.setName(input.name());
        floors.saveAndFlush(floor);
        em.refresh(floor);
        return ResourceResponses.floorOption(floor);
    }

    @Transactional
    public void deleteFloor(Long actorId, Long workspaceId, Long floorId, String revision) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var floor = lockFloorRevision(workspaceId, floorId, revision);
        if (resources.existsByFloorPlanId(floorId))
            throw new ConflictException(
                    "This floor still contains resources, including retained or archived records."
                        + " Remove eligible resources first; booking history is preserved");
        if ((floor.getBackgroundUrl() != null && !floor.getBackgroundUrl().isBlank())
                || !ResourceCanvas.simpleLayout(floor.getLayoutJson(), true)
                || !ResourceCanvas.simpleLayout(floor.getDraftLayoutJson(), true))
            throw new ConflictException(
                    "This floor still contains furniture, a background or other layout data. Clear"
                        + " its layout before deletion");
        floors.delete(floor);
        floors.flush();
    }

    @Transactional
    public FloorOption copyFloor(
            Long actorId, Long workspaceId, Long floorId, FloorManagement.Copy input) {
        eligible(actorId);
        var workspace = owned(actorId, workspaceId, true);
        var source = lockFloorRevision(workspaceId, floorId, input.expectedRevision());
        if (input.allocation() == null) throw new BadRequestException("Select the physical destination floor and workspace area for the copy");
        if (!ResourceCanvas.simpleLayout(source.getLayoutJson(), false)
                || !ResourceCanvas.simpleLayout(source.getDraftLayoutJson(), false))
            throw new ConflictException(
                    "This layout format needs its dedicated editor to copy safely");
        var sourceResources =
                resources.findByFloorPlanId(floorId).stream()
                        .filter(item -> item.getStatus() != BookableResourceStatus.ARCHIVED)
                        .toList();
        var target = new FloorPlanModel();
        target.setWorkspace(workspace);
        target.setName(input.name());
        target.setFloorNumber(input.floorNumber());
        target.setBackgroundUrl(source.getBackgroundUrl());
        var bounds = ResourceCanvas.editorBounds(source);
        if (bounds == null
                && ((source.getLayoutJson() != null && !source.getLayoutJson().isBlank())
                        || (source.getDraftLayoutJson() != null
                                && !source.getDraftLayoutJson().isBlank())))
            throw new ConflictException("The source canvas needs valid dimensions before copying");
        if (bounds != null) {
            var objects =
                    ResourceCanvas.decorations(source, true).stream()
                            .map(
                                    item ->
                                            new base.api.feature.resource.dto.FloorDecorations.Item(
                                                    "decor-" + UUID.randomUUID(),
                                                    item.kind(),
                                                    item.label(),
                                                    item.posX(),
                                                    item.posY(),
                                                    item.width(),
                                                    item.height(),
                                                    item.rotation(),
                                                    item.color()))
                            .toList();
            target.setDraftLayoutJson(ResourceCanvas.writeDecorations(source, bounds, objects));
        }
        buildings.bind(actorId, workspaceId, target, input.allocation());
        if (bounds == null) target.setDraftLayoutJson(ResourceCanvas.writeDecorations(target, new ResourceCanvas.Bounds(input.allocation().width(), input.allocation().height()), List.of()));
        floors.saveAndFlush(target);
        var mapped = new HashMap<Long, BookableResourceModel>();
        for (var original : sourceResources) {
            if (!original.getResourceType().getWorkspace().getId().equals(workspaceId))
                throw new ConflictException(
                        "A source resource type does not belong to this workspace");
            var copy = new BookableResourceModel();
            copy.setFloorPlan(target);
            copy.setResourceType(original.getResourceType());
            copy.setLabel(original.getLabel());
            copy.setName(original.getName());
            copy.setZoneName(original.getZoneName());
            copy.setNoiseLevel(original.getNoiseLevel());
            copy.setCapacityOverride(original.getCapacityOverride());
            copy.setPricePerHour(original.getPricePerHour());
            copy.setDescription(original.getDescription());
            copy.setPosX(original.getPosX());
            copy.setPosY(original.getPosY());
            copy.setWidth(original.getWidth());
            copy.setHeight(original.getHeight());
            copy.setRotation(original.getRotation());
            copy.setStatus(BookableResourceStatus.DRAFT);
            mapped.put(original.getId(), resources.save(copy));
        }
        for (var original : sourceResources)
            if (original.getParentRoom() != null) {
                var room = mapped.get(original.getParentRoom().getId());
                if (room == null || room.getResourceType().getCategory() != ResourceCategory.ROOM)
                    throw new ConflictException(
                            "The source floor contains an invalid room relationship");
                mapped.get(original.getId()).setParentRoom(room);
            }
        em.flush();
        em.refresh(target);
        return ResourceResponses.floorOption(target);
    }

    public FloorManagement.Availability availability(
            Long actorId,
            Long workspaceId,
            Long floorId,
            java.time.OffsetDateTime from,
            java.time.OffsetDateTime to) {
        eligible(actorId);
        var workspace = owned(actorId, workspaceId, false);
        var floor = floor(workspaceId, floorId);
        if (!to.toInstant().isAfter(from.toInstant()))
            throw new BadRequestException("End time must be after start time");
        var now = LocalDateTime.ofInstant(organizerApplicationClock.instant(), ZoneOffset.UTC);
        var signals =
                usage.occupancy(
                        floorId,
                        LocalDateTime.ofInstant(from.toInstant(), ZoneOffset.UTC),
                        LocalDateTime.ofInstant(to.toInstant(), ZoneOffset.UTC),
                        now);
        var current =
                resources.findByFloorPlanId(floorId).stream()
                        .filter(item -> item.getStatus() != BookableResourceStatus.ARCHIVED)
                        .toList();
        var activeParents =
                current.stream()
                        .filter(
                                item ->
                                        item.getParentRoom() != null
                                                && item.getStatus()
                                                        == BookableResourceStatus.ACTIVE)
                        .map(item -> item.getParentRoom().getId())
                        .collect(java.util.stream.Collectors.toSet());
        var childSignals = new HashMap<Long, Set<AvailabilityState>>();
        for (var item : current)
            if (item.getParentRoom() != null)
                childSignals
                        .computeIfAbsent(
                                item.getParentRoom().getId(),
                                ignored -> EnumSet.noneOf(AvailabilityState.class))
                        .addAll(signals.getOrDefault(item.getId(), Set.of()));
        var items =
                current.stream()
                        .map(
                                item -> {
                                    var flags = EnumSet.noneOf(AvailabilityState.class);
                                    flags.addAll(signals.getOrDefault(item.getId(), Set.of()));
                                    if (item.getParentRoom() != null)
                                        flags.addAll(
                                                signals.getOrDefault(
                                                        item.getParentRoom().getId(), Set.of()));
                                    flags.addAll(childSignals.getOrDefault(item.getId(), Set.of()));
                                    var type = item.getResourceType();
                                    boolean enabled =
                                            workspace.getStatus() == WorkspaceStatus.ACTIVE
                                                    && floor.getStatus()
                                                            == FloorPlanStatus.PUBLISHED
                                                    && item.getStatus()
                                                            == BookableResourceStatus.ACTIVE
                                                    && type.isActive()
                                                    && type.getCurrency() != null
                                                    && item.getPosX() != null
                                                    && item.getPosY() != null
                                                    && item.getWidth() != null
                                                    && item.getHeight() != null
                                                    && (item.getParentRoom() == null
                                                            || item.getParentRoom().getStatus()
                                                                    != BookableResourceStatus
                                                                            .ACTIVE)
                                                    && !activeParents.contains(item.getId());
                                    var state =
                                            flags.contains(AvailabilityState.BOOKED)
                                                    ? AvailabilityState.BOOKED
                                                    : flags.contains(AvailabilityState.MAINTENANCE)
                                                            ? AvailabilityState.MAINTENANCE
                                                            : flags.contains(
                                                                            AvailabilityState
                                                                                    .LOCKED)
                                                                    ? AvailabilityState.LOCKED
                                                                    : enabled
                                                                            ? AvailabilityState
                                                                                    .AVAILABLE
                                                                            : AvailabilityState
                                                                                    .DISABLED;
                                    return new FloorManagement.AvailabilityItem(
                                            item.getId(), state, state.name());
                                })
                        .toList();
        return new FloorManagement.Availability(
                from.withOffsetSameInstant(ZoneOffset.UTC),
                to.withOffsetSameInstant(ZoneOffset.UTC),
                organizerApplicationClock.instant().atOffset(ZoneOffset.UTC),
                items);
    }

    @Transactional
    public TypeOption createType(Long actorId, Long workspaceId, Type request) {
        eligible(actorId);
        var workspace = owned(actorId, workspaceId, true);
        if (types.existsByWorkspaceIdAndNameIgnoreCase(workspaceId, request.name()))
            throw new ConflictException("This resource type name already exists in the workspace");
        if (request.category() == ResourceCategory.DESK && request.capacity() != 1)
            throw new BadRequestException("A desk resource must have capacity 1");
        if (request.pricePerHour() == null
                && request.pricePerDay() == null
                && request.pricePerMonth() == null)
            throw new BadRequestException("Provide at least one base price");
        var type = new ResourceTypeModel();
        type.setWorkspace(workspace);
        type.setName(request.name());
        type.setCategory(request.category());
        type.setCapacity(request.capacity());
        type.setCurrency(request.currency());
        type.setPricePerHour(request.pricePerHour());
        type.setPricePerDay(request.pricePerDay());
        type.setPricePerMonth(request.pricePerMonth());
        types.saveAndFlush(type);
        em.refresh(type);
        return new TypeOption(
                type.getId(),
                type.getName(),
                type.getCategory(),
                type.getCapacity(),
                type.getPricePerHour(),
                type.getPricePerDay(),
                type.getPricePerMonth(),
                type.isActive(),
                type.getCurrency(),
                ResourceResponses.revision(type));
    }

    @Transactional
    public FloorOption updateFloor(
            Long actorId, Long workspaceId, Long floorId, Floor request, String expectedRevision) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var floor = floor(workspaceId, floorId);
        em.refresh(floor);
        if (!Objects.equals(expectedRevision, ResourceResponses.revision(floor)))
            throw new ConflictException("The floor changed. Reload before editing");
        if (floor.getStatus() == FloorPlanStatus.PUBLISHED)
            throw new ConflictException(
                    "Published floors must be edited through the Floor Plan workflow");
        if (floor.getBuildingFloor() != null && floor.getFloorNumber() != request.floorNumber())
            throw new ConflictException("Physical floor numbers are managed in the building, not in a workspace layout");
        if (floor.getFloorNumber() != request.floorNumber()
                && floors.existsByWorkspaceIdAndFloorNumber(workspaceId, request.floorNumber()))
            throw new ConflictException("This floor number already exists");
        floor.setName(request.name());
        floor.setFloorNumber(request.floorNumber());
        floors.saveAndFlush(floor);
        em.refresh(floor);
        return ResourceResponses.floorOption(floor);
    }

    @Transactional
    public TypeOption updateType(Long actorId, Long workspaceId, Long typeId, Type request) {
        eligible(actorId);
        owned(actorId, workspaceId, true);
        var type =
                types.findById(typeId)
                        .orElseThrow(() -> new NotFoundException("Resource type not found"));
        if (!type.getWorkspace().getId().equals(workspaceId))
            throw new NotFoundException("Resource type not found");
        em.refresh(type);
        if (!Objects.equals(request.expectedRevision(), ResourceResponses.revision(type)))
            throw new ConflictException("The resource type changed. Reload before editing");
        if (type.getCurrency() != null && type.getCurrency() != request.currency())
            throw new ConflictException(
                    "Currency cannot be changed for an existing resource type. Create a separate"
                            + " type for the other currency");
        if (type.getCurrency() == null && !request.legacyCurrencyConfirmed())
            throw new BadRequestException(
                    "Explicitly confirm the denomination of legacy prices; amounts will not be"
                            + " converted");
        if (type.getCurrency() == null
                && em.createQuery(
                                        "select count(b) from BookingModel b where"
                                                + " b.resource.resourceType.id=:id",
                                        Long.class)
                                .setParameter("id", typeId)
                                .getSingleResult()
                        > 0)
            throw new ConflictException(
                    "Historical bookings have unknown currency. Confirm legacy data through a"
                            + " reviewed migration before assigning currency");
        boolean used =
                em.createQuery(
                                        "select count(r) from BookableResourceModel r where"
                                                + " r.resourceType.id=:id",
                                        Long.class)
                                .setParameter("id", typeId)
                                .getSingleResult()
                        > 0;
        if (used
                && (type.getCategory() != request.category()
                        || type.getCapacity() != request.capacity()))
            throw new ConflictException(
                    "Category and capacity cannot change for a type already used by resources;"
                            + " create a new type");
        if (!type.getName().equalsIgnoreCase(request.name())
                && types.existsByWorkspaceIdAndNameIgnoreCase(workspaceId, request.name()))
            throw new ConflictException("This resource type name already exists");
        if (request.category() == ResourceCategory.DESK && request.capacity() != 1)
            throw new BadRequestException("A desk resource must have capacity 1");
        if (request.pricePerHour() == null
                && request.pricePerDay() == null
                && request.pricePerMonth() == null)
            throw new BadRequestException("Provide at least one base price");
        type.setName(request.name());
        type.setCategory(request.category());
        type.setCapacity(request.capacity());
        type.setCurrency(request.currency());
        type.setPricePerHour(request.pricePerHour());
        type.setPricePerDay(request.pricePerDay());
        type.setPricePerMonth(request.pricePerMonth());
        types.saveAndFlush(type);
        em.refresh(type);
        return new TypeOption(
                type.getId(),
                type.getName(),
                type.getCategory(),
                type.getCapacity(),
                type.getPricePerHour(),
                type.getPricePerDay(),
                type.getPricePerMonth(),
                type.isActive(),
                type.getCurrency(),
                ResourceResponses.revision(type));
    }

    private void eligible(Long actorId) {
        var user =
                users.findById(actorId)
                        .orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!user.isActive() || !user.isVerified() || user.getRole() != UserRole.ORGANIZER)
            throw new ForbiddenException("An active, verified Organizer account is required");
        if (profiles.findByOrganizerId(actorId)
                .filter(p -> p.getStatus() == OrganizerProfileStatus.APPROVED)
                .isEmpty())
            throw new ForbiddenException("An approved Organizer profile is required");
    }

    private WorkspaceModel owned(Long actorId, Long id, boolean write) {
        var workspace =
                (write
                                ? workspaces.findOwnedForResourceUpdate(id, actorId)
                                : workspaces.findByIdAndOrganizerId(id, actorId))
                        .orElseThrow(() -> new NotFoundException("Workspace not found"));
        if (write) em.refresh(workspace, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (write
                && workspace.getStatus() != WorkspaceStatus.DRAFT
                && workspace.getStatus() != WorkspaceStatus.PENDING
                && workspace.getStatus() != WorkspaceStatus.ACTIVE
                && workspace.getStatus() != WorkspaceStatus.MAINTENANCE
                && workspace.getStatus() != WorkspaceStatus.INACTIVE)
            throw new ConflictException(
                    "Floors, resource types and resources can only be changed in a DRAFT, PENDING,"
                            + " ACTIVE, MAINTENANCE or INACTIVE workspace");
        return workspace;
    }

    private BookableResourceModel readOwned(Long actorId, Long id) {
        var resource =
                resources
                        .findDetailedById(id)
                        .orElseThrow(() -> new NotFoundException("Resource not found"));
        if (!resource.getFloorPlan().getWorkspace().getOrganizer().getId().equals(actorId))
            throw new NotFoundException("Resource not found");
        return resource;
    }

    private BookableResourceModel lockOwned(Long actorId, Long id) {
        var original = readOwned(actorId, id);
        owned(actorId, original.getFloorPlan().getWorkspace().getId(), true);
        var locked =
                resources
                        .findByIdForUpdate(id)
                        .orElseThrow(() -> new NotFoundException("Resource not found"));
        em.refresh(locked, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!locked.getFloorPlan().getWorkspace().getOrganizer().getId().equals(actorId))
            throw new NotFoundException("Resource not found");
        return locked;
    }

    private FloorPlanModel floor(Long workspaceId, Long id) {
        var floor = floors.findById(id).orElseThrow(() -> new NotFoundException("Floor not found"));
        if (!floor.getWorkspace().getId().equals(workspaceId))
            throw new BadRequestException("The floor does not belong to this workspace");
        return floor;
    }

    private void apply(
            Long workspaceId, BookableResourceModel resource, Input input, boolean editing) {
        var type =
                types.findById(input.resourceTypeId())
                        .orElseThrow(() -> new NotFoundException("Resource type not found"));
        if (!type.getWorkspace().getId().equals(workspaceId))
            throw new BadRequestException("The resource type does not belong to this workspace");
        if (!type.isActive() || type.getCurrency() == null)
            throw new ConflictException(
                    "Choose an active resource type with confirmed VND or USD currency");
        String code = input.code().toUpperCase(Locale.ROOT);
        if (resources.existsByFloorPlanIdAndLabelIgnoreCaseAndIdNot(
                input.floorPlanId(), code, resource.getId() == null ? -1L : resource.getId()))
            throw new ConflictException("The resource code already exists on this floor");
        int capacity =
                input.capacityOverride() == null ? type.getCapacity() : input.capacityOverride();
        if (capacity < 1 || (type.getCategory() == ResourceCategory.DESK && capacity != 1))
            throw new BadRequestException(
                    "Desks must have capacity 1; rooms must have positive capacity");
        if ((input.posX() == null) != (input.posY() == null)
                || (input.width() == null) != (input.height() == null))
            throw new BadRequestException("Coordinates and dimensions must be supplied in pairs");
        var previousParent = resource.getParentRoom();
        var parent = parentRoom(workspaceId, resource, input.parentRoomId(), type.getCategory());
        boolean parentChanged =
                !Objects.equals(
                        previousParent == null ? null : previousParent.getId(),
                        input.parentRoomId());
        var children = children(resource);
        for (var child : children)
            em.refresh(child, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        var previousPose = ResourceCanvas.pose(resource);
        boolean geometryChanged =
                editing
                        && (different(resource.getPosX(), input.posX())
                                || different(resource.getPosY(), input.posY())
                                || different(resource.getWidth(), input.width())
                                || different(resource.getHeight(), input.height())
                                || different(
                                        resource.getRotation(),
                                        input.rotation() == null
                                                ? BigDecimal.ZERO
                                                : input.rotation()));
        if (!children.isEmpty() && type.getCategory() != ResourceCategory.ROOM)
            throw new ConflictException("A room containing desks cannot be changed into a desk");
        if (children.stream().filter(r -> r.getStatus() != BookableResourceStatus.ARCHIVED).count()
                > capacity)
            throw new ConflictException(
                    "Room capacity cannot be smaller than its assigned desk count");
        if (parent != null
                && children(parent).stream()
                                .filter(r -> r.getStatus() != BookableResourceStatus.ARCHIVED)
                                .filter(r -> !r.getId().equals(resource.getId()))
                                .count()
                        >= capacity(parent))
            throw new ConflictException("The room has no remaining desk capacity");
        if (parentChanged && (liveBooking(previousParent) || liveBooking(parent)))
            throw new ConflictException(
                    "Desk placement cannot change while the old or new room has live bookings");
        boolean structural =
                editing
                        && (parentChanged
                                || !resource.getResourceType().getId().equals(type.getId())
                                || !Objects.equals(
                                        resource.getCapacityOverride(), input.capacityOverride())
                                || different(resource.getPosX(), input.posX())
                                || different(resource.getPosY(), input.posY())
                                || different(resource.getWidth(), input.width())
                                || different(resource.getHeight(), input.height())
                                || different(
                                        resource.getRotation(),
                                        input.rotation() == null
                                                ? BigDecimal.ZERO
                                                : input.rotation()));
        if (structural && (liveBooking(resource) || children.stream().anyMatch(this::liveBooking)))
            throw new ConflictException(
                    "Type, capacity and layout cannot change while this resource has live"
                            + " bookings");
        if (editing
                && resource.getResourceType().getCurrency() != type.getCurrency()
                && usage.hasAnyBooking(resource.getId()))
            throw new ConflictException(
                    "Currency cannot change for a resource with booking history; create a new"
                            + " resource instead");
        resource.setResourceType(type);
        resource.setParentRoom(parent);
        resource.setLabel(code);
        resource.setName(input.name());
        resource.setZoneName(input.zoneName());
        resource.setNoiseLevel(input.noiseLevel());
        resource.setCapacityOverride(input.capacityOverride());
        resource.setPricePerHour(input.pricePerHour());
        resource.setDescription(input.description());
        resource.setPosX(input.posX());
        resource.setPosY(input.posY());
        resource.setWidth(input.width());
        resource.setHeight(input.height());
        resource.setRotation(input.rotation() == null ? BigDecimal.ZERO : input.rotation());
        if (geometryChanged)
            for (var child : children)
                if (child.getStatus() != BookableResourceStatus.ARCHIVED)
                    ResourceCanvas.moveWithRoom(child, previousPose, resource);
        if (parent != null) ResourceCanvas.fitsInsideRoom(resource, parent);
        for (var child : children) {
            if (child.getStatus() != BookableResourceStatus.ARCHIVED)
                ResourceCanvas.fitsInsideRoom(child, resource);
        }
        var peers = resources.findByFloorPlanId(resource.getFloorPlan().getId());
        validatePlacement(resource, peers);
        var bounds = ResourceCanvas.read(resource.getFloorPlan());
        if (geometryChanged)
            for (var child : children) {
                if (child.getStatus() == BookableResourceStatus.ARCHIVED) continue;
                if (child.getPosX().signum() < 0 || child.getPosY().signum() < 0)
                    throw new ConflictException(
                            "Moving the room would place a desk outside supported coordinates");
                if (bounds != null) ResourceCanvas.fits(child, bounds, true);
                validatePlacement(child, peers);
            }
        if (bounds != null) ResourceCanvas.fits(resource, bounds, false);
        else if (structural && resource.getFloorPlan().getStatus() == FloorPlanStatus.PUBLISHED)
            throw new ConflictException(
                    "The existing floor layout cannot be validated here. Use its Floor Plan"
                            + " workflow for geometry changes");
        var floor = resource.getFloorPlan();
        em.refresh(floor, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        // Public maps use live resource geometry. Move each existing layout independently,
        // preserving the unpublished draft rather than publishing its new objects.
        for (boolean editor : new boolean[] {false, true}) {
            if (editor && !ResourceCanvas.ownsDraft(floor)) continue;
            var objects = ResourceCanvas.decorations(floor, editor);
            var moved =
                    geometryChanged
                                    && resource.getResourceType().getCategory()
                                            == ResourceCategory.ROOM
                            ? ResourceCanvas.moveDecorations(objects, previousPose, resource)
                            : objects;
            var layoutBounds =
                    editor ? ResourceCanvas.editorBounds(floor) : ResourceCanvas.read(floor);
            if (layoutBounds != null) ResourceCanvas.validateDecorations(moved, layoutBounds);
            var layoutResources = new ArrayList<>(peers);
            if (!layoutResources.contains(resource)) layoutResources.add(resource);
            ResourceCanvas.validateDecorationResources(moved, layoutResources);
            if (!objects.equals(moved)) {
                var json = ResourceCanvas.writeDecorations(floor, layoutBounds, moved, editor);
                if (editor) floor.setDraftLayoutJson(json);
                else floor.setLayoutJson(json);
            }
        }
        if (resource.getStatus() == BookableResourceStatus.ACTIVE) activation(resource);
    }

    private boolean different(BigDecimal a, BigDecimal b) {
        return a == null ? b != null : b == null || a.compareTo(b) != 0;
    }

    private void activation(BookableResourceModel resource) {
        var type = resource.getResourceType();
        if (resource.getFloorPlan().getWorkspace().getStatus() != WorkspaceStatus.ACTIVE
                || resource.getFloorPlan().getStatus() != FloorPlanStatus.PUBLISHED
                || !type.isActive()
                || type.getCurrency() == null)
            throw new ConflictException(
                    "Activation requires an ACTIVE workspace, a PUBLISHED floor and an active"
                            + " resource type");
        if (!positive(resource.getPricePerHour())
                && !positive(type.getPricePerHour())
                && !positive(type.getPricePerDay())
                && !positive(type.getPricePerMonth()))
            throw new ConflictException("Activation requires a positive effective base price");
        var bounds = ResourceCanvas.read(resource.getFloorPlan());
        if (bounds == null)
            throw new ConflictException(
                    "Publish a validated floor canvas before activating this resource");
        ResourceCanvas.fits(resource, bounds, true);
        ResourceCanvas.validateDecorationResources(
                ResourceCanvas.decorations(resource.getFloorPlan(), false), List.of(resource));
        validatePlacement(resource, resources.findByFloorPlanId(resource.getFloorPlan().getId()));
        if (resource.getParentRoom() != null) {
            var parent = resource.getParentRoom();
            em.refresh(parent, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            if (parent.getStatus() == BookableResourceStatus.ARCHIVED
                    || parent.getStatus() == BookableResourceStatus.ACTIVE
                    || liveBooking(parent))
                throw new ConflictException(
                        "The containing room is active, archived or has live bookings. Stop"
                                + " whole-room sales before enabling its desks");
            ResourceCanvas.fitsInsideRoom(resource, parent);
        }
        if (children(resource).stream()
                .anyMatch(
                        child ->
                                child.getStatus() == BookableResourceStatus.ACTIVE
                                        || liveBooking(child)))
            throw new ConflictException(
                    "This room has active desks or live desk bookings. Stop desk sales before"
                            + " enabling whole-room sales");
    }

    private int capacity(BookableResourceModel resource) {
        return resource.getCapacityOverride() == null
                ? resource.getResourceType().getCapacity()
                : resource.getCapacityOverride();
    }

    private void validatePlacement(
            BookableResourceModel resource, List<BookableResourceModel> peers) {
        for (var peer : peers) {
            if (Objects.equals(resource.getId(), peer.getId())
                    || peer.getStatus() == BookableResourceStatus.ARCHIVED) continue;
            boolean containingRoom =
                    resource.getParentRoom() != null
                            && resource.getParentRoom().getId().equals(peer.getId());
            boolean containedDesk =
                    peer.getParentRoom() != null
                            && peer.getParentRoom().getId().equals(resource.getId());
            if (!containingRoom && !containedDesk && ResourceCanvas.overlaps(resource, peer))
                throw new ConflictException(
                        "Resource "
                                + resource.getLabel()
                                + " overlaps "
                                + peer.getLabel()
                                + ". A desk inside a room must explicitly select that room; other"
                                + " resources must not overlap");
        }
    }

    private List<BookableResourceModel> children(BookableResourceModel room) {
        return room.getId() == null ? List.of() : resources.findByParentRoomId(room.getId());
    }

    private boolean liveBooking(BookableResourceModel resource) {
        return resource != null
                && resource.getId() != null
                && usage.hasLiveBooking(
                        resource.getId(),
                        LocalDateTime.ofInstant(
                                organizerApplicationClock.instant(), ZoneOffset.UTC));
    }

    private BookableResourceModel parentRoom(
            Long workspaceId,
            BookableResourceModel desk,
            Long parentId,
            ResourceCategory category) {
        if (parentId == null) return null;
        if (category != ResourceCategory.DESK || parentId.equals(desk.getId()))
            throw new BadRequestException("Only a desk can belong to a containing room");
        var parent =
                resources
                        .findDetailedById(parentId)
                        .orElseThrow(() -> new NotFoundException("Room not found"));
        if (!parent.getFloorPlan().getWorkspace().getId().equals(workspaceId))
            throw new NotFoundException("Room not found");
        em.refresh(parent, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
        if (!parent.getFloorPlan().getId().equals(desk.getFloorPlan().getId())
                || parent.getResourceType().getCategory() != ResourceCategory.ROOM
                || parent.getParentRoom() != null
                || parent.getStatus() == BookableResourceStatus.ARCHIVED)
            throw new BadRequestException("Choose a non-archived room on the same floor");
        return parent;
    }

    private boolean positive(BigDecimal value) {
        return value != null && value.signum() > 0;
    }

    private void revision(BookableResourceModel resource, String expected) {
        if (expected == null || !expected.equals(ResourceResponses.revision(resource)))
            throw new ConflictException(
                    "This resource changed. Reload before saving, deleting or changing status");
    }

    private Detail save(BookableResourceModel resource) {
        touchRoom(resource.getParentRoom());
        resources.saveAndFlush(resource);
        // Return the database timestamp precision so the next revision comparison is stable.
        em.refresh(resource);
        return ResourceResponses.detail(resource);
    }

    /** A room revision also protects its child set without adding a second public version token. */
    private void touchRoom(BookableResourceModel room) {
        if (room != null) {
            em.refresh(room, jakarta.persistence.LockModeType.PESSIMISTIC_WRITE);
            room.setUpdatedAt(LocalDateTime.now(ZoneOffset.UTC));
        }
    }
}
