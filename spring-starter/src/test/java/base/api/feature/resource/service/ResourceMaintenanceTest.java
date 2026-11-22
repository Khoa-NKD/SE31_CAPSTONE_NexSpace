package base.api.feature.resource.service;

import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.enums.ResourceBlockType;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class ResourceMaintenanceTest {
    private BookableResourceModel resource(long id, int capacity, BookableResourceModel parent) {
        var type = new ResourceTypeModel();
        type.setCapacity(capacity);
        var resource = new BookableResourceModel();
        resource.setId(id);
        resource.setResourceType(type);
        resource.setParentRoom(parent);
        return resource;
    }

    @Test void roomMaintenanceAffectsEveryChildWithoutChangingInventory() {
        var room = resource(1, 10, null);
        var desk = resource(2, 1, room);
        assertThat(ResourceMaintenance.affected(desk, Set.of(1L))).isTrue();
        assertThat(ResourceMaintenance.capacity(room, List.of(desk), Set.of(1L))).isZero();
        assertThat(ResourceMaintenance.capacity(room, List.of(desk), Set.of())).isEqualTo(10);
    }

    @Test void childMaintenanceReducesCapacityOnceAndLeavesRoomBookable() {
        var room = resource(1, 10, null);
        var desk = resource(2, 1, room);
        var slot = new ResourceBlockedSlotModel();
        slot.setResource(desk);
        slot.setBlockType(ResourceBlockType.MAINTENANCE);
        assertThat(ResourceMaintenance.capacity(room, List.of(desk, desk), Set.of(2L))).isEqualTo(9);
        assertThat(ResourceMaintenance.preventsBooking(room, slot)).isFalse();
        assertThat(ResourceMaintenance.preventsBooking(desk, slot)).isTrue();
        assertThat(ResourceMaintenance.affected(room, Set.of(2L))).isFalse();
    }

    @Test void removingParentMaintenancePreservesIndependentChildMaintenance() {
        var room = resource(1, 2, null);
        var first = resource(2, 1, room);
        var second = resource(3, 1, room);
        assertThat(ResourceMaintenance.capacity(room, List.of(first, second), Set.of(1L, 2L))).isZero();
        assertThat(ResourceMaintenance.capacity(room, List.of(first, second), Set.of(2L))).isEqualTo(1);
        assertThat(ResourceMaintenance.affected(second, Set.of(2L))).isFalse();
    }
}
