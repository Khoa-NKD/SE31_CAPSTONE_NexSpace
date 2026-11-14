package base.api.feature.resource.service;

import base.api.feature.resource.dto.*;
import base.api.shared.entity.resource.*;
import base.api.shared.enums.*;
import base.api.shared.exception.BadRequestException;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.*;

/** Pure final-state validation, shared by proposal preview and apply. */
public final class FloorAiValidation {
    private FloorAiValidation() {}
    public static void validate(FloorDesign.Design design, ResourceResponses.FloorLayout layout,
            List<ResourceResponses.Detail> details, ResourceResponses.Options options,
            FloorDesign.Propose request, FloorDesign.Metrics metrics) {
        validate(design, layout, details, options, request, metrics, true);
    }

    static void validatePreview(FloorDesign.Design design, ResourceResponses.FloorLayout layout,
            List<ResourceResponses.Detail> details, ResourceResponses.Options options,
            FloorDesign.Propose request, FloorDesign.Metrics metrics) {
        validate(design, layout, details, options, request, metrics, false);
    }

    private static void validate(FloorDesign.Design design, ResourceResponses.FloorLayout layout,
            List<ResourceResponses.Detail> details, ResourceResponses.Options options,
            FloorDesign.Propose request, FloorDesign.Metrics metrics, boolean checkCollisions) {
        options = withProposedTypes(design, options, request.scope());
        var originals = new LinkedHashMap<String, BookableResourceModel>();
        for (var item : details) originals.put("r_" + item.id(), shape(item));
        var allowed = new HashSet<String>();
        var allowedObjects = new HashSet<String>();
        BookableResourceModel scopeRoom = null;
        if (request.scope() == FloorDesign.Scope.WORKSPACE) {
            allowed.addAll(originals.keySet());
            layout.decorations().forEach(d -> allowedObjects.add(d.id()));
        } else if (request.selectedKey() != null && request.selectedKey().startsWith("resource:")) {
            String key = "r_" + request.selectedKey().substring(9);
            var selected = originals.get(key);
            if (selected == null) fail("Selected resource no longer exists");
            allowed.add(key);
            if (request.scope() == FloorDesign.Scope.ROOM) {
                if (selected.getResourceType().getCategory() != ResourceCategory.ROOM) fail("Select a room for room scope");
                scopeRoom = selected;
                for (var item : details) if (Objects.equals(item.parentRoomId(), selected.getId())) allowed.add("r_" + item.id());
                for (var item : layout.decorations()) if (ResourceCanvas.contained(ResourceCanvas.shape(item), selected)) allowedObjects.add(item.id());
            }
        } else if (request.scope() == FloorDesign.Scope.OBJECT && request.selectedKey() != null && request.selectedKey().startsWith("decoration:")) {
            String id = request.selectedKey().substring(11);
            if (layout.decorations().stream().noneMatch(d -> d.id().equals(id))) fail("Selected object no longer exists");
            allowedObjects.add(id);
        } else fail("Choose a valid scope and selection");

        var finalState = new LinkedHashMap<>(originals);
        var removed = new HashSet<Long>();
        for (var id : design.removeResourceIds()) {
            if (!removed.add(id) || !allowed.contains("r_" + id)) fail("AI cannot delete a resource outside the selected scope");
            finalState.remove("r_" + id);
        }
        var changes = new HashSet<String>();
        for (var change : design.resources()) {
            if (!changes.add(change.key())) fail("Duplicate AI resource key");
            var existing = change.id() == null ? null : originals.get("r_" + change.id());
            if (change.id() != null && (existing == null || !allowed.contains("r_" + change.id()) || removed.contains(change.id())
                    || !change.key().equals("r_" + change.id()))) fail("AI resource identity or scope is invalid");
            if (change.id() == null && (!change.key().startsWith("n_") || originals.containsKey(change.key()) || request.scope() == FloorDesign.Scope.OBJECT))
                fail("AI cannot add resources in this scope");
            var type = options.types().stream().filter(t -> t.id().equals(change.resourceTypeId()) && t.active() && t.currency() != null)
                    .findFirst().orElseThrow(() -> new BadRequestException("AI selected an unavailable resource type"));
            if (existing != null && !existing.getResourceType().getId().equals(type.id())) fail("AI cannot change an existing resource's pricing type");
            if (existing == null) validateNewResourceConfiguration(change, type, metrics, layout);
            var item = new BookableResourceModel();
            var model = new ResourceTypeModel(); model.setId(type.id()); model.setCategory(type.category()); model.setCapacity(type.capacity());
            item.setResourceType(model); item.setId(change.id()); item.setLabel(change.name());
            item.setCapacityOverride(change.capacity() == null ? (existing == null ? null : existing.getCapacityOverride()) : change.capacity());
            item.setPosX(change.posX()); item.setPosY(change.posY()); item.setWidth(change.width()); item.setHeight(change.height()); item.setRotation(change.rotation());
            if (existing != null) item.setStatus(existing.getStatus());
            int capacity = item.getCapacityOverride() == null ? type.capacity() : item.getCapacityOverride();
            if (type.category() == ResourceCategory.DESK && capacity != 1) fail("A desk must have capacity 1");
            finalState.put(change.key(), item);
        }
        for (var item : details) {
            var model = finalState.get("r_" + item.id());
            if (model != null && item.parentRoomId() != null) model.setParentRoom(finalState.get("r_" + item.parentRoomId()));
            if (model != null && item.parentRoomId() != null && model.getParentRoom() == null && !changes.contains("r_" + item.id()))
                fail("Remove or reassign the room's desks before deleting it");
        }
        for (var change : design.resources()) {
            var item = finalState.get(change.key());
            var parent = change.parentKey() == null ? null : finalState.get(change.parentKey());
            if (change.parentKey() != null && (parent == null || parent == item || parent.getResourceType().getCategory() != ResourceCategory.ROOM)) fail("AI parent room is invalid");
            if (item.getResourceType().getCategory() == ResourceCategory.ROOM && parent != null) fail("Rooms cannot be nested");
            item.setParentRoom(parent);
            if (request.scope() == FloorDesign.Scope.ROOM && change.id() == null &&
                    (parent == null || !Objects.equals(parent.getId(), scopeRoom.getId()))) fail("New desks must belong to the selected room");
        }
        var shapes = new ArrayList<>(finalState.values());
        for (var change : design.resources()) {
            var before = change.id() == null ? null : originals.get("r_" + change.id());
            var after = finalState.get(change.key());
            if (before != null && before.getResourceType().getCategory() == ResourceCategory.ROOM
                    && (!same(before.getPosX(),after.getPosX()) || !same(before.getPosY(),after.getPosY())
                        || !same(before.getWidth(),after.getWidth()) || !same(before.getHeight(),after.getHeight())
                        || !same(before.getRotation(),after.getRotation()))) {
                for (var child : details) if (Objects.equals(child.parentRoomId(), change.id()) && !removed.contains(child.id())
                        && !changes.contains("r_" + child.id())) fail("Moving a room must include its child desks in the preview; use room scope");
            }
        }
        var bounds = new ResourceCanvas.Bounds(layout.width(), layout.height());
        for (var item : shapes) {
            ResourceCanvas.fits(item, bounds, true);
            if (item.getParentRoom() != null) ResourceCanvas.fitsInsideRoom(item, item.getParentRoom());
            long children = shapes.stream().filter(r -> r.getParentRoom() == item).count();
            if (children > (item.getCapacityOverride() == null ? item.getResourceType().getCapacity() : item.getCapacityOverride())) fail("Room capacity is smaller than its desk count");
        }
        var objectIds = new HashSet<String>();
        for (var item : design.decorations()) {
            if (!objectIds.add(item.id())) fail("Duplicate decoration ID");
            var old = layout.decorations().stream().filter(d -> d.id().equals(item.id())).findFirst().orElse(null);
            if (old != null && !allowedObjects.contains(item.id()) && !old.equals(item)) fail("AI modified an object outside scope");
            if (old == null && request.scope() == FloorDesign.Scope.OBJECT) fail("AI cannot add objects in single-object scope");
            if (old == null && scopeRoom != null && !ResourceCanvas.contained(ResourceCanvas.shape(item), finalState.get("r_" + scopeRoom.getId()))) fail("New objects must fit inside the selected room");
        }
        for (var item : layout.decorations()) if (!objectIds.contains(item.id()) && !allowedObjects.contains(item.id())) fail("AI removed an object outside scope");
        if (checkCollisions) {
            for (int i = 0; i < shapes.size(); i++) for (int j = i + 1; j < shapes.size(); j++) {
                var a = shapes.get(i); var b = shapes.get(j);
                if (ResourceCanvas.overlaps(a, b) && a.getParentRoom() != b && b.getParentRoom() != a)
                    fail("AI layout contains overlapping resources");
            }
            ResourceCanvas.validateDecorations(design.decorations(), bounds);
            ResourceCanvas.validateDecorationResources(design.decorations(), shapes);
        } else {
            ResourceCanvas.validateDecorationBounds(design.decorations(), bounds);
        }
        if (metrics.occupancyLimit() != null && FloorDesignService.occupancy(shapes) > metrics.occupancyLimit()) fail("AI layout exceeds the area's occupancy limit");
    }
    public static ResourceResponses.Options withProposedTypes(FloorDesign.Design design, ResourceResponses.Options options, FloorDesign.Scope scope) {
        if (!design.newTypes().isEmpty() && scope == FloorDesign.Scope.OBJECT) fail("Cannot create resource types in object scope");
        var types = new ArrayList<>(options.types());
        var ids = new HashSet<Long>();
        var names = new HashSet<String>();
        for (var type : options.types()) names.add(type.name().trim().toLowerCase(Locale.ROOT));
        for (var type : design.newTypes()) {
            if (type.tempId() == null || type.tempId() >= 0 || type.tempId() < -20 || !ids.add(type.tempId())) fail("Invalid temporary resource type ID");
            if (type.name() == null || type.name().isBlank() || !names.add(type.name().trim().toLowerCase(Locale.ROOT))) fail("Use the existing resource type instead of duplicating its name");
            if (type.category() == null || type.currency() == null || type.capacity() < 1 || type.capacity() > 10000) fail("Complete the proposed resource type details");
            if (type.usageKind() == null || type.usageKind().category() != type.category()
                    || type.standardWidthM() == null || type.standardLengthM() == null
                    || type.standardWidthM().signum() <= 0 || type.standardLengthM().signum() <= 0)
                fail("Confirm the proposed type's usage and real-world dimensions");
            if (type.category() == ResourceCategory.DESK && type.capacity() != 1) fail("A desk type must have capacity 1");
            if (design.resources().stream().noneMatch(r -> r.id() == null && type.tempId().equals(r.resourceTypeId()))) fail("Every new resource type must be used by a new seat or room");
            types.add(new ResourceResponses.TypeOption(type.tempId(), type.name(), type.category(), type.capacity(), type.pricePerHour(), type.pricePerDay(), type.pricePerMonth(), true, type.currency(), "draft", type.usageKind(), type.standardWidthM(), type.standardLengthM()));
        }
        return new ResourceResponses.Options(options.workspaceId(), options.workspaceStatus(), options.floors(), types, options.rooms());
    }
    /** Pixel positions vary by floor; reusable type identity uses rounded real-world footprint and usage. */
    private static void validateNewResourceConfiguration(FloorDesign.ResourceChange change, ResourceResponses.TypeOption type,
            FloorDesign.Metrics metrics, ResourceResponses.FloorLayout layout) {
        if (!hasConfirmedConfiguration(type))
            fail("The selected type has no confirmed configuration; propose a new type with dimensions and prices");
        if (change.usageKind() != type.usageKind())
            fail("A different seat or room kind requires a separate resource type");
        if (change.capacity() != null && change.capacity() != type.capacity())
            fail("A different capacity requires a separate resource type");
        if (metrics.widthM() == null || metrics.lengthM() == null || layout.width() == null || layout.height() == null)
            fail("Configure floor dimensions before matching resource types");
        var width = change.width().multiply(metrics.widthM()).divide(layout.width(), 2, java.math.RoundingMode.HALF_UP);
        var length = change.height().multiply(metrics.lengthM()).divide(layout.height(), 2, java.math.RoundingMode.HALF_UP);
        // One centimetre absorbs pixel/metre round-trip rounding, not a different-sized configuration.
        if (!ResourceCanvas.matchesStandardDimension(change.width(), metrics.widthM(), layout.width(), type.standardWidthM())
                || !ResourceCanvas.matchesStandardDimension(change.height(), metrics.lengthM(), layout.height(), type.standardLengthM()))
            fail("Resource footprint mismatch: " + change.name() + " (" + width.toPlainString() + " × "
                    + length.toPlainString() + " m) / " + type.name() + " ("
                    + type.standardWidthM().toPlainString() + " × " + type.standardLengthM().toPlainString() + " m)");
    }

    static boolean hasConfirmedConfiguration(ResourceResponses.TypeOption type) {
        return type.usageKind() != null && type.usageKind().category() == type.category()
                && type.standardWidthM() != null && type.standardWidthM().signum() > 0
                && type.standardLengthM() != null && type.standardLengthM().signum() > 0;
    }

    /** Gemini selects a type and position. The workspace catalog owns its configuration. */
    static FloorDesign.Design normalizeProposal(FloorDesign.Design proposal, ResourceResponses.Options options,
            FloorDesign.Metrics metrics, ResourceResponses.FloorLayout layout) {
        if (proposal.question() != null && !proposal.question().isBlank()) return proposal;
        var configured = new HashMap<Long, ResourceResponses.TypeOption>();
        for (var type : options.types())
            if (type.active() && type.currency() != null && hasConfirmedConfiguration(type))
                configured.put(type.id(), type);
        var proposedTypes = new ArrayList<>(proposal.newTypes());
        var changes = new ArrayList<FloorDesign.ResourceChange>();
        for (var change : proposal.resources()) {
            if (change.id() != null) {
                changes.add(change);
                continue;
            }
            var type = configured.get(change.resourceTypeId());
            if (type != null && (change.usageKind() == null || change.usageKind() == type.usageKind())) {
                changes.add(withType(change, type.id(), type.usageKind(), type.capacity(), type.standardWidthM(),
                        type.standardLengthM(), metrics, layout));
                continue;
            }
            var proposed = proposedTypes.stream()
                    .filter(candidate -> candidate.tempId().equals(change.resourceTypeId())).findFirst().orElse(null);
            if (proposed == null && change.usageKind() != null && options.types().stream()
                    .noneMatch(candidate -> candidate.category() == change.usageKind().category())) {
                proposed = inferMissingCategoryType(change, proposedTypes, options, metrics, layout);
            }
            changes.add(proposed == null ? change
                    : withType(change, proposed.tempId(), proposed.usageKind(), proposed.capacity(),
                            proposed.standardWidthM(), proposed.standardLengthM(), metrics, layout));
        }
        return new FloorDesign.Design(proposal.message(), proposal.question(), changes, proposal.removeResourceIds(),
                proposal.decorations(), proposal.templates(), proposedTypes);
    }

    private static FloorDesign.NewType inferMissingCategoryType(FloorDesign.ResourceChange change,
            List<FloorDesign.NewType> types, ResourceResponses.Options options,
            FloorDesign.Metrics metrics, ResourceResponses.FloorLayout layout) {
        var usage = change.usageKind();
        if (usage == null) return null;
        var width = change.width().multiply(metrics.widthM()).divide(layout.width(), 2, RoundingMode.HALF_UP);
        var length = change.height().multiply(metrics.lengthM()).divide(layout.height(), 2, RoundingMode.HALF_UP);
        if (width.signum() <= 0 || length.signum() <= 0
                || width.compareTo(BigDecimal.valueOf(10000)) > 0 || length.compareTo(BigDecimal.valueOf(10000)) > 0)
            return null;
        var category = usage.category();
        if (category == ResourceCategory.ROOM && change.capacity() == null) return null;
        int capacity = category == ResourceCategory.DESK ? 1 : change.capacity();
        var currencies = options.types().stream().filter(ResourceResponses.TypeOption::active)
                .map(ResourceResponses.TypeOption::currency).filter(Objects::nonNull).distinct().toList();
        var currency = currencies.size() == 1 ? currencies.get(0) : ResourceCurrency.VND;
        for (var candidate : types)
            if (candidate.usageKind() == usage && candidate.capacity() == capacity
                    && candidate.currency() == currency
                    && candidate.pricePerHour() == null && candidate.pricePerDay() == null && candidate.pricePerMonth() == null
                    && candidate.standardWidthM().compareTo(width) == 0
                    && candidate.standardLengthM().compareTo(length) == 0)
                return candidate;
        long tempId = -1;
        var usedIds = types.stream().map(FloorDesign.NewType::tempId).collect(java.util.stream.Collectors.toSet());
        while (usedIds.contains(tempId)) tempId--;
        if (tempId < -20) return null;
        var name = change.name().trim();
        if (name.length() > 90) name = name.substring(0, 90).trim();
        var usedNames = new HashSet<String>();
        options.types().forEach(type -> usedNames.add(type.name().trim().toLowerCase(Locale.ROOT)));
        types.forEach(type -> usedNames.add(type.name().trim().toLowerCase(Locale.ROOT)));
        var uniqueName = name;
        for (int suffix = 2; usedNames.contains(uniqueName.toLowerCase(Locale.ROOT)); suffix++)
            uniqueName = name + " (" + suffix + ")";
        var proposed = new FloorDesign.NewType(tempId, uniqueName, category, currency,
                capacity, null, null, null, usage, width, length);
        types.add(proposed);
        return proposed;
    }

    private static FloorDesign.ResourceChange withType(FloorDesign.ResourceChange change, Long typeId,
            ResourceUsageKind usage, int capacity, BigDecimal width, BigDecimal length, FloorDesign.Metrics metrics,
            ResourceResponses.FloorLayout layout) {
        var widthPx = width.multiply(layout.width()).divide(metrics.widthM(), 2, RoundingMode.HALF_UP);
        var heightPx = length.multiply(layout.height()).divide(metrics.lengthM(), 2, RoundingMode.HALF_UP);
        if (typeId.equals(change.resourceTypeId()) && usage == change.usageKind()
                && Objects.equals(capacity, change.capacity()) && widthPx.compareTo(change.width()) == 0
                && heightPx.compareTo(change.height()) == 0) return change;
        return new FloorDesign.ResourceChange(change.key(), null, typeId, change.name(), change.parentKey(), capacity,
                change.posX(), change.posY(), widthPx, heightPx, change.rotation(), usage);
    }

    private static BookableResourceModel shape(ResourceResponses.Detail item) {
        var result = new BookableResourceModel(); result.setId(item.id()); result.setLabel(item.code());
        var type = new ResourceTypeModel(); type.setId(item.resourceTypeId()); type.setCategory(item.category()); type.setCapacity(item.capacity());
        result.setResourceType(type); result.setCapacityOverride(item.capacityOverride());
        result.setPosX(item.posX()); result.setPosY(item.posY()); result.setWidth(item.width()); result.setHeight(item.height());
        result.setRotation(item.rotation()); result.setStatus(item.status()); return result;
    }
    private static void fail(String message) { throw new BadRequestException(message); }
    private static boolean same(BigDecimal a, BigDecimal b) { return a == null ? b == null : b != null && a.compareTo(b) == 0; }
}
