package base.api.feature.resource.service;

import base.api.shared.entity.resource.*;
import java.math.BigDecimal;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MetricGeometryTest {
    @Test void metricCoordinatesRemainStableWhenFloorDimensionsChange() {
        var physical = new BuildingFloorModel(); physical.setGeometryVersion(2);
        var floor = new FloorPlanModel(); floor.setBuildingFloor(physical);
        var seat = new BookableResourceModel(); seat.setFloorPlan(floor);
        seat.setPosX(new BigDecimal("120")); seat.setWidth(new BigDecimal("48")); seat.setHeight(new BigDecimal("48"));
        physical.setRealWidthM(new BigDecimal("30")); physical.setRealLengthM(new BigDecimal("15"));
        assertThat(seat.getPosXM()).isEqualByComparingTo("2");
        assertThat(seat.getWidthM()).isEqualByComparingTo("0.8");
        assertThat(seat.getWidth()).isEqualByComparingTo(seat.getHeight());
    }

    @Test void retainedPixelGeometryIsNotReinterpretedBeforeReview() {
        var floor = new FloorPlanModel(); floor.setBuildingFloor(new BuildingFloorModel());
        var seat = new BookableResourceModel(); seat.setFloorPlan(floor); seat.setWidth(new BigDecimal("24"));
        assertThat(seat.getWidthM()).isNull();
        assertThat(seat.getWidth()).isEqualByComparingTo("24");
    }

    @Test void publishedPlacementDoesNotChangeWithDraft() {
        var floor = new FloorPlanModel();
        var type = new ResourceTypeModel(); type.setId(1L);
        var seat = new BookableResourceModel(); seat.setId(2L); seat.setResourceType(type);
        seat.setPosX(BigDecimal.TEN); seat.setPosY(BigDecimal.TEN); seat.setWidth(BigDecimal.TEN); seat.setHeight(BigDecimal.TEN);
        floor.setPublishedGeometryJson(PublishedGeometry.snapshot(java.util.List.of(seat)));
        seat.setPosX(new BigDecimal("99"));
        var original = PublishedGeometry.read(floor).get(2L);
        assertThat(original.posX()).isEqualByComparingTo("10");
        assertThat(PublishedGeometry.matches(original, seat)).isFalse();
    }

    @Test void footprintToleranceCannotAcceptACentimetreOfSizeDrift() {
        assertThat(ResourceCanvas.matchesStandardDimension(new BigDecimal("48"), new BigDecimal("20"),
                new BigDecimal("1200"), new BigDecimal("0.8"))).isTrue();
        assertThat(ResourceCanvas.matchesStandardDimension(new BigDecimal("47.4"), new BigDecimal("20"),
                new BigDecimal("1200"), new BigDecimal("0.8"))).isFalse();
    }

    @Test void unsavedRoomChildrenRemainDistinctBeforeDatabaseIdsExist() {
        var physical = new BuildingFloorModel(); physical.setGeometryVersion(2);
        var floor = new FloorPlanModel(); floor.setBuildingFloor(physical);
        floor.setUsageWidth(new BigDecimal("600")); floor.setUsageHeight(new BigDecimal("600"));
        floor.setDraftLayoutJson(ResourceCanvas.write(new BigDecimal("600"), new BigDecimal("600")));
        var roomType = new ResourceTypeModel(); roomType.setCategory(base.api.shared.enums.ResourceCategory.ROOM); roomType.setCapacity(4);
        var deskType = new ResourceTypeModel(); deskType.setCategory(base.api.shared.enums.ResourceCategory.DESK); deskType.setCapacity(1);
        var room = shape(floor, roomType, "Room", "60", "60", "300", "240");
        var first = shape(floor, deskType, "Desk 1", "90", "90", "48", "48"); first.setParentRoom(room);
        var second = shape(floor, deskType, "Desk 2", "150", "90", "48", "48"); second.setParentRoom(room);
        assertThatCode(() -> ResourceCanvas.validateScene(floor, java.util.List.of(room, first, second), false)).doesNotThrowAnyException();
        second.setPosX(new BigDecimal("90"));
        assertThatThrownBy(() -> ResourceCanvas.validateScene(floor, java.util.List.of(room, first, second), false))
                .isInstanceOf(base.api.shared.exception.ConflictException.class).hasMessageContaining("overlap");
    }

    private BookableResourceModel shape(FloorPlanModel floor, ResourceTypeModel type, String name, String x, String y, String width, String height) {
        var resource = new BookableResourceModel(); resource.setFloorPlan(floor); resource.setResourceType(type); resource.setLabel(name);
        resource.setPosX(new BigDecimal(x)); resource.setPosY(new BigDecimal(y)); resource.setWidth(new BigDecimal(width)); resource.setHeight(new BigDecimal(height));
        return resource;
    }
}
