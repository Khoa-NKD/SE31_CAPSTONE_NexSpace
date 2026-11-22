package base.api.feature.resource.service;

import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.enums.ResourceBlockType;
import java.util.Collection;
import java.util.Set;
import java.util.stream.Collectors;

/** Time-scoped maintenance overlays inventory without changing its manual activation state. */
public final class ResourceMaintenance {
    private ResourceMaintenance() {}

    public static Set<Long> maintenanceIds(Collection<ResourceBlockedSlotModel> slots) {
        return slots.stream().filter(slot -> slot.getBlockType() == ResourceBlockType.MAINTENANCE)
                .map(slot -> slot.getResource().getId()).collect(Collectors.toSet());
    }

    public static boolean affected(BookableResourceModel resource, Set<Long> ids) {
        return resource != null && (ids.contains(resource.getId())
                || resource.getParentRoom() != null && ids.contains(resource.getParentRoom().getId()));
    }

    public static int capacity(BookableResourceModel resource,
            Collection<BookableResourceModel> children, Set<Long> maintenanceIds) {
        if (affected(resource, maintenanceIds)) return 0;
        int base = resource.getCapacityOverride() != null ? resource.getCapacityOverride()
                : resource.getResourceType() == null ? 1 : resource.getResourceType().getCapacity();
        long unavailable = children.stream()
                .filter(child -> child.getParentRoom() != null
                        && resource.getId().equals(child.getParentRoom().getId()))
                .filter(child -> affected(child, maintenanceIds)).map(BookableResourceModel::getId)
                .distinct().count();
        return Math.max(0, base - (int) unavailable);
    }

    /** A maintained child reduces room capacity; direct/parent blocks still prevent booking. */
    public static boolean preventsBooking(BookableResourceModel target, ResourceBlockedSlotModel slot) {
        return slot.getBlockType() != ResourceBlockType.MAINTENANCE
                || slot.getResource().getParentRoom() == null
                || !slot.getResource().getParentRoom().getId().equals(target.getId());
    }
}
