package base.api.feature.resource.service;

import base.api.shared.entity.resource.*;
import base.api.shared.enums.*;
import base.api.feature.resource.dto.FloorDesign.MeasurementMode;
import java.math.BigDecimal;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.*;

class MetricFloorGeometryTest {
    private BigDecimal n(String value) { return new BigDecimal(value); }
    private BuildingFloorModel physical() {
        var p = new BuildingFloorModel(); p.setId(1L);
        var building = new BuildingModel(); building.setId(1L); building.setName("Building"); p.setBuilding(building);
        p.setCanvasWidth(n("1200")); p.setCanvasHeight(n("800"));
        p.setRealWidthM(n("20")); p.setRealLengthM(n("20"));
        return p;
    }
    private FloorPlanModel area(BuildingFloorModel p, long id, String x, String width) {
        var f = new FloorPlanModel(); f.setId(id); f.setBuildingFloor(p); f.setName("Area " + id);
        f.setUsageX(n(x)); f.setUsageY(n("0")); f.setUsageWidth(n(width)); f.setUsageHeight(n("800"));
        f.setLayoutJson(ResourceCanvas.write(n(width), n("800")));
        return f;
    }
    private BookableResourceModel seat(FloorPlanModel f) {
        var t = new ResourceTypeModel(); t.setId(1L); t.setName("Seat"); t.setCategory(ResourceCategory.DESK);
        t.setUsageKind(ResourceUsageKind.WORK_SEAT); t.setStandardWidthM(n("0.8")); t.setStandardLengthM(n("0.8"));
        var r = new BookableResourceModel(); r.setId(1L); r.setFloorPlan(f); r.setResourceType(t); r.setLabel("D1");
        r.setPosX(n("60")); r.setPosY(n("40")); r.setWidth(n("48")); r.setHeight(n("32"));
        return r;
    }

    @Test void previewDoesNotMutateAndConversionKeepsTrueFootprint() {
        var p = physical(); var f = area(p, 1L, "0", "600"); var r = seat(f);
        var plan = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("20"), n("20"));
        assertThat(plan.review().applicable()).isTrue();
        assertThat(r.getHeight()).isEqualByComparingTo("32");
        assertThat(p.getGeometryVersion()).isEqualTo(1);
        MetricFloorGeometry.apply(p, plan, n("20"), n("20"));
        assertThat(p.getCanvasHeight()).isEqualByComparingTo("1200");
        assertThat(r.getWidthM()).isEqualByComparingTo("0.8");
        assertThat(r.getLengthM()).isEqualByComparingTo("0.8");
        assertThat(r.getWidth()).isEqualByComparingTo(r.getHeight());
        assertThat(f.getUsageWidthM()).isEqualByComparingTo("10");
        assertThat(f.getLegacyGeometryJson()).contains("resources");
    }

    @Test void rotatedLegacyResourceNeedsReviewWhenAxisScalesDiffer() {
        var p = physical(); var f = area(p, 1L, "0", "600"); var r = seat(f); r.setRotation(n("45"));
        var plan = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("20"), n("20"));
        assertThat(plan.review().applicable()).isFalse();
        assertThat(plan.review().issues()).anyMatch(i -> i.contains("rotated legacy"));
        assertThatThrownBy(() -> MetricFloorGeometry.apply(p, plan, n("20"), n("20")))
                .isInstanceOf(base.api.shared.exception.ConflictException.class);
        assertThat(p.getGeometryVersion()).isEqualTo(1);
    }

    @Test void resizeReviewsAllAreasAndDoesNotShrinkResources() {
        var p = physical(); var west = area(p, 1L, "0", "600"); var east = area(p, 2L, "600", "600");
        var r = seat(west);
        MetricFloorGeometry.apply(p, MetricFloorGeometry.prepare(p, List.of(west, east), List.of(r), n("20"), n("20")), n("20"), n("20"));
        var tooSmall = MetricFloorGeometry.prepare(p, List.of(west, east), List.of(r), n("15"), n("20"));
        assertThat(tooSmall.review().issues()).anyMatch(i -> i.contains("Area 2"));
        var larger = MetricFloorGeometry.prepare(p, List.of(west, east), List.of(r), n("30"), n("20"));
        MetricFloorGeometry.apply(p, larger, n("30"), n("20"));
        assertThat(east.getUsageXM()).isEqualByComparingTo("10");
        assertThat(east.getUsageWidthM()).isEqualByComparingTo("10");
        assertThat(r.getWidthM()).isEqualByComparingTo("0.8");
    }

    @Test void publishedGeometryStaysInOriginalCoordinateFrameDuringConversion() {
        var p = physical(); var f = area(p, 1L, "0", "600"); f.setStatus(FloorPlanStatus.PUBLISHED);
        var r = seat(f); r.setStatus(BookableResourceStatus.ACTIVE);
        var originalJson = f.getLayoutJson();
        MetricFloorGeometry.apply(p, MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("20"), n("20")), n("20"), n("20"));
        assertThat(f.getLayoutJson()).isEqualTo(originalJson);
        assertThat(PublishedGeometry.read(f).get(r.getId()).height()).isEqualByComparingTo("32");
        assertThat(r.getHeight()).isEqualByComparingTo("48");
        assertThat(ResourceCanvas.editorBounds(f).height()).isEqualByComparingTo("1200");
    }

    @Test void mismatchedCatalogFootprintIsReportedRatherThanSilentlyStretched() {
        var p = physical(); var f = area(p, 1L, "0", "600"); var r = seat(f); r.setWidth(n("72"));
        var review = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("20"), n("20")).review();
        assertThat(review.applicable()).isFalse();
        assertThat(review.issues()).anyMatch(i -> i.contains("footprint differs"));
        assertThat(r.getWidth()).isEqualByComparingTo("72");
    }

    @Test void archivedRotatedGeometryIsRetainedWithoutBlockingActiveAreaConversion() {
        var p = physical(); var f = area(p, 1L, "0", "600"); var archived = seat(f);
        archived.setStatus(BookableResourceStatus.ARCHIVED); archived.setRotation(n("45"));
        var plan = MetricFloorGeometry.prepare(p, List.of(f), List.of(archived), n("20"), n("20"));
        assertThat(plan.review().applicable()).isTrue();
        MetricFloorGeometry.apply(p, plan, n("20"), n("20"));
        assertThat(archived.getHeight()).isEqualByComparingTo("32");
        assertThat(archived.getLengthM()).isNull();
        assertThat(f.getLegacyGeometryJson()).contains("45");
    }

    @Test void recalibratingFullFloorToFortyByFortyProducesSquareAndRespondsToEachInput() {
        var p = physical(); p.setRealLengthM(n("40"));
        var f = area(p, 1L, "0", "1200"); var r = seat(f); r.setHeight(n("16"));
        var square = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("40"), n("40"), MeasurementMode.CALIBRATE);
        assertThat(square.review().applicable()).isTrue();
        assertThat(square.areas().get(0).width()).isEqualByComparingTo("40");
        assertThat(square.areas().get(0).length()).isEqualByComparingTo("40");
        assertThat(square.review().previews().get(0).afterWidth()).isEqualByComparingTo("2400");
        assertThat(square.review().previews().get(0).afterHeight()).isEqualByComparingTo("2400");
        var wide = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("60"), n("20"), MeasurementMode.CALIBRATE);
        assertThat(wide.review().previews().get(0).afterWidth()).isEqualByComparingTo("3600");
        assertThat(wide.review().previews().get(0).afterHeight()).isEqualByComparingTo("1200");
        assertThat(p.getRealWidthM()).isEqualByComparingTo("20");
        MetricFloorGeometry.apply(p, square, n("40"), n("40"));
        assertThat(f.getUsageWidthM()).isEqualByComparingTo("40");
        assertThat(r.getWidthM()).isEqualByComparingTo("0.8");
        assertThat(r.getLengthM()).isEqualByComparingTo("0.8");
    }

    @Test void resizeAndCalibrationHaveDifferentExplicitAreaSemantics() {
        var p = physical(); p.setRealLengthM(n("40")); var f = area(p, 1L, "0", "1200");
        var resize = MetricFloorGeometry.prepare(p, List.of(f), List.of(), n("40"), n("40"), MeasurementMode.RESIZE);
        var calibrate = MetricFloorGeometry.prepare(p, List.of(f), List.of(), n("40"), n("40"), MeasurementMode.CALIBRATE);
        assertThat(resize.areas().get(0).width()).isEqualByComparingTo("20");
        assertThat(calibrate.areas().get(0).width()).isEqualByComparingTo("40");
    }

    @Test void calibrationKeepsPartialAreaFractionsRatherThanExpandingEveryWorkspaceToFullFloor() {
        var p = physical(); p.setRealLengthM(n("40")); var f = area(p, 1L, "600", "600");
        var plan = MetricFloorGeometry.prepare(p, List.of(f), List.of(), n("40"), n("40"), MeasurementMode.CALIBRATE);
        assertThat(plan.review().applicable()).isTrue();
        assertThat(plan.areas().get(0).x()).isEqualByComparingTo("20");
        assertThat(plan.areas().get(0).width()).isEqualByComparingTo("20");
        assertThat(plan.areas().get(0).length()).isEqualByComparingTo("40");
    }

    @Test void recalibrationAlsoRebuildsAlreadyMetricLayoutsWithoutStretchingCatalogSeats() {
        var p = physical(); p.setGeometryVersion(2); p.setRealLengthM(n("40"));
        p.setCanvasHeight(n("2400"));
        var f = area(p, 1L, "0", "1200"); f.setUsageHeight(n("2400"));
        f.setLayoutJson(ResourceCanvas.write(n("1200"), n("2400")));
        var r = seat(f); r.setHeight(n("48"));
        var plan = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("40"), n("40"), MeasurementMode.CALIBRATE);
        MetricFloorGeometry.apply(p, plan, n("40"), n("40"));
        assertThat(f.getUsageWidthM()).isEqualByComparingTo("40");
        assertThat(f.getUsageLengthM()).isEqualByComparingTo("40");
        assertThat(r.getPosXM()).isEqualByComparingTo("2");
        assertThat(r.getWidthM()).isEqualByComparingTo("0.8");
        assertThat(ResourceCanvas.editorBounds(f).width()).isEqualByComparingTo("2400");
    }

    @Test void recalibrationMovesContainedSeatsWithTheirRoomInsteadOfSpreadingThemAcrossFloor() {
        var p = physical(); p.setRealLengthM(n("40")); var f = area(p, 1L, "0", "1200");
        var r = seat(f); r.setHeight(n("16")); r.setPosX(n("150")); r.setPosY(n("120"));
        var room = new BookableResourceModel(); room.setId(2L); room.setFloorPlan(f); room.setLabel("Room");
        var type = new ResourceTypeModel(); type.setCategory(ResourceCategory.ROOM); type.setCapacity(4);
        type.setStandardWidthM(n("4")); type.setStandardLengthM(n("10")); room.setResourceType(type);
        room.setPosX(n("120")); room.setPosY(n("100")); room.setWidth(n("240")); room.setHeight(n("400"));
        r.setParentRoom(room);
        var plan = MetricFloorGeometry.prepare(p, List.of(f), List.of(room, r), n("40"), n("40"), MeasurementMode.CALIBRATE);
        assertThat(plan.review().applicable()).isTrue();
        MetricFloorGeometry.apply(p, plan, n("40"), n("40"));
        assertThat(room.getPosXM()).isEqualByComparingTo("4");
        assertThat(r.getPosXM()).isEqualByComparingTo("4.5");
        assertThat(r.getPosYM()).isEqualByComparingTo("5.3");
        assertThat(r.getWidthM()).isEqualByComparingTo("0.8");
        ResourceCanvas.fitsInsideRoom(r, room);
    }

    @Test void calibrationMustNotClaimSuccessWhenCatalogWouldTurnHorizontalRoomVertical() {
        var p = physical(); p.setRealLengthM(n("40")); var f = area(p, 1L, "0", "1200");
        var room = seat(f); room.setWidth(n("670.2")); room.setHeight(n("350"));
        room.getResourceType().setCategory(ResourceCategory.ROOM); room.getResourceType().setCapacity(4);
        room.getResourceType().setStandardWidthM(n("11.17")); room.getResourceType().setStandardLengthM(n("17.5"));
        var plan = MetricFloorGeometry.prepare(p, List.of(f), List.of(room), n("40"), n("40"), MeasurementMode.CALIBRATE);
        assertThat(plan.review().applicable()).isFalse();
        assertThat(plan.review().issues()).anyMatch(issue -> issue.startsWith("Drawing/type orientation conflict:"));
        assertThat(room.getRotation()).isEqualByComparingTo("0");
        assertThat(room.getWidth()).isEqualByComparingTo("670.2");
    }

    @Test void aPreviouslyDistortedLayoutIsCheckedAgainstItsRetainedOriginal() throws Exception {
        var p = physical(); p.setGeometryVersion(2); p.setRealWidthM(n("40")); p.setRealLengthM(n("50"));
        p.setCanvasWidth(n("2400")); p.setCanvasHeight(n("3000"));
        var f = area(p, 1L, "0", "2400"); f.setUsageHeight(n("3000"));
        f.setLayoutJson(ResourceCanvas.write(n("2400"), n("3000")));
        var room = seat(f); room.setWidth(n("670.2")); room.setHeight(n("1050"));
        room.getResourceType().setCategory(ResourceCategory.ROOM); room.getResourceType().setCapacity(4);
        room.getResourceType().setStandardWidthM(n("11.17")); room.getResourceType().setStandardLengthM(n("17.5"));
        var original = new PublishedGeometry.Placement(room.getId(), room.getResourceType().getId(), null,
                n("60"), n("40"), n("670.2"), n("350"), BigDecimal.ZERO);
        f.setLegacyGeometryJson(new com.fasterxml.jackson.databind.ObjectMapper().writeValueAsString(java.util.Map.of("resources", List.of(original))));
        var review = MetricFloorGeometry.prepare(p, List.of(f), List.of(room), n("40"), n("40"), MeasurementMode.CALIBRATE).review();
        assertThat(review.applicable()).isFalse();
        assertThat(review.issues()).anyMatch(issue -> issue.startsWith("Drawing/type orientation conflict:"));
    }
    @Test void boundaryResizePreservesOffsetAreaAndBothOverflowAxesAreReported() {
        var p = physical(); p.setGeometryVersion(2); p.setRealLengthM(n("20")); p.setCanvasHeight(n("1200"));
        var f = area(p, 1L, "300", "600"); f.setUsageY(n("120")); f.setUsageHeight(n("600"));
        f.setLayoutJson(ResourceCanvas.write(n("600"), n("600")));
        var r = seat(f); r.setHeight(n("48")); r.setRotation(n("30"));
        var enlarged = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("40"), n("40"));
        assertThat(enlarged.review().applicable()).isTrue();
        MetricFloorGeometry.apply(p, enlarged, n("40"), n("40"));
        assertThat(f.getUsageX()).isEqualByComparingTo("300");
        assertThat(f.getUsageY()).isEqualByComparingTo("120");
        assertThat(f.getUsageWidth()).isEqualByComparingTo("600");
        assertThat(f.getUsageHeight()).isEqualByComparingTo("600");
        assertThat(r.getPosX()).isEqualByComparingTo("60");
        assertThat(r.getPosY()).isEqualByComparingTo("40");
        assertThat(r.getWidth()).isEqualByComparingTo("48");
        assertThat(r.getHeight()).isEqualByComparingTo("48");
        assertThat(r.getRotation()).isEqualByComparingTo("30");
        var widthOnly = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("14"), n("40"));
        assertThat(widthOnly.review().issues()).anyMatch(issue -> issue.contains("chiều rộng"));
        var heightOnly = MetricFloorGeometry.prepare(p, List.of(f), List.of(r), n("40"), n("11"));
        assertThat(heightOnly.review().issues()).anyMatch(issue -> issue.contains("chiều dài"));
        assertThat(enlarged.review().previews().get(0).afterFloorWidth()).isEqualByComparingTo("2400");
        assertThat(enlarged.review().previews().get(0).afterWidth()).isEqualByComparingTo("600");
    }

}
