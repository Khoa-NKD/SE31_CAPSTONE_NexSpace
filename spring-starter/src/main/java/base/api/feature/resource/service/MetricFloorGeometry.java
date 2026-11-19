package base.api.feature.resource.service;

import base.api.feature.resource.dto.FloorDecorations;
import base.api.feature.resource.dto.FloorDesign.MeasurementMode;
import base.api.shared.entity.resource.*;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.exception.ConflictException;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.*;
import java.util.*;

/** Conversion is staged and reviewed for every allocation before any persistent value changes. */
public final class MetricFloorGeometry {
    private static final BigDecimal EPSILON = new BigDecimal("0.000001");
    private MetricFloorGeometry() {}

    public record Review(boolean conversionRequired, boolean applicable, int workspaceAreas, int resources,
                         List<String> issues, String unit, BigDecimal pixelsPerMetre, List<AreaPreview> previews,
                         MeasurementMode measurementMode, BigDecimal physicalWidthM, BigDecimal physicalLengthM) {}
    public record ShapePreview(String label, BigDecimal x, BigDecimal y, BigDecimal width, BigDecimal height, BigDecimal rotation) {}
    public record AreaPreview(Long floorId, String name, BigDecimal beforeWidth, BigDecimal beforeHeight,
                              BigDecimal afterWidth, BigDecimal afterHeight, List<ShapePreview> before, List<ShapePreview> after,
                              BigDecimal beforeWidthM, BigDecimal beforeLengthM, BigDecimal afterWidthM, BigDecimal afterLengthM,
                              BigDecimal beforeFloorWidth, BigDecimal beforeFloorHeight, BigDecimal afterFloorWidth, BigDecimal afterFloorHeight,
                              BigDecimal beforeX, BigDecimal beforeY, BigDecimal afterX, BigDecimal afterY) {}
    public record Area(FloorPlanModel floor, BigDecimal x, BigDecimal y, BigDecimal width, BigDecimal length,
                       List<Seat> seats, List<FloorDecorations.Item> decorations,
                       List<PublishedGeometry.Placement> originalResources) {}
    public record Seat(BookableResourceModel resource, BigDecimal x, BigDecimal y, BigDecimal width, BigDecimal length) {}
    public record Plan(Review review, List<Area> areas) {}

    public static Plan prepare(BuildingFloorModel physical, List<FloorPlanModel> allocations,
                               List<BookableResourceModel> resources, BigDecimal widthM, BigDecimal lengthM) {
        return prepare(physical, allocations, resources, widthM, lengthM, MeasurementMode.RESIZE);
    }

    public static Plan prepare(BuildingFloorModel physical, List<FloorPlanModel> allocations,
                               List<BookableResourceModel> resources, BigDecimal widthM, BigDecimal lengthM, MeasurementMode requestedMode) {
        var mode = requestedMode == null ? MeasurementMode.RESIZE : requestedMode;
        boolean calibrate = mode == MeasurementMode.CALIBRATE;
        boolean convert = physical.getGeometryVersion() < 2;
        BigDecimal sx = convert ? physical.getCanvasWidth().divide(
                physical.getRealWidthM() == null ? widthM : physical.getRealWidthM(), 12, RoundingMode.HALF_UP)
                : MetricGeometry.PIXELS_PER_METRE;
        BigDecimal sy = convert ? physical.getCanvasHeight().divide(
                physical.getRealLengthM() == null ? lengthM : physical.getRealLengthM(), 12, RoundingMode.HALF_UP)
                : MetricGeometry.PIXELS_PER_METRE;
        var positionScaleX = calibrate ? physical.getCanvasWidth().divide(widthM, 12, RoundingMode.HALF_UP) : sx;
        var positionScaleY = calibrate ? physical.getCanvasHeight().divide(lengthM, 12, RoundingMode.HALF_UP) : sy;
        var issues = new ArrayList<String>();
        var areas = new ArrayList<Area>();
        for (var floor : allocations) {
            if (floor.getUsageX() == null || floor.getUsageY() == null || floor.getUsageWidth() == null || floor.getUsageHeight() == null) {
                issues.add(floor.getName() + ": workspace allocation is incomplete"); continue;
            }
            var x = metres(floor.getUsageX(), positionScaleX); var y = metres(floor.getUsageY(), positionScaleY);
            var w = metres(floor.getUsageWidth(), positionScaleX); var h = metres(floor.getUsageHeight(), positionScaleY);
            var overflowX = x.add(w).subtract(widthM);
            var overflowY = y.add(h).subtract(lengthM);
            if (overflowX.compareTo(EPSILON) > 0)
                issues.add(floor.getName() + ": vùng workspace tràn chiều rộng tầng " + overflowX.stripTrailingZeros().toPlainString() + " m");
            if (overflowY.compareTo(EPSILON) > 0)
                issues.add(floor.getName() + ": vùng workspace tràn chiều dài tầng " + overflowY.stripTrailingZeros().toPlainString() + " m");
            if (!ResourceCanvas.simpleLayout(floor.getLayoutJson(), false)
                    || !ResourceCanvas.simpleLayout(floor.getDraftLayoutJson(), false)) {
                issues.add(floor.getName() + ": retained layout format needs manual review"); continue;
            }
            var originalShapes = calibrate ? originalShapes(floor, issues) : Map.<Long, PublishedGeometry.Placement>of();
            var converted = new ArrayList<Seat>();
            for (var r : resources) {
                if (!Objects.equals(r.getFloorPlan().getId(), floor.getId())) continue;
                // Historical rectangles stay in their original frame and are never made bookable.
                if (r.getStatus() == BookableResourceStatus.ARCHIVED) continue;
                if (r.getPosX() == null || r.getPosY() == null || r.getWidth() == null || r.getHeight() == null) continue;
                if (!calibrate && convert && sx.subtract(sy).abs().compareTo(EPSILON) > 0 && rotated(r.getRotation()))
                    issues.add(floor.getName() + " / " + r.getLabel() + ": rotated legacy geometry uses unequal axis scales; review its placement first");
                var rw = metres(r.getWidth(), sx); var rh = metres(r.getHeight(), sy);
                var t = r.getResourceType();
                if (calibrate && t.getCategory() == base.api.shared.enums.ResourceCategory.ROOM
                        && t.getStandardWidthM() != null && t.getStandardLengthM() != null) {
                    var original = originalShapes.get(r.getId());
                    var originalWidth = original == null ? r.getWidth() : original.width();
                    var originalHeight = original == null ? r.getHeight() : original.height();
                    if (originalWidth != null && originalHeight != null
                            && originalWidth.compareTo(originalHeight) * t.getStandardWidthM().compareTo(t.getStandardLengthM()) < 0)
                        issues.add("Drawing/type orientation conflict: " + r.getLabel() + " ("
                                + t.getStandardWidthM().toPlainString() + " × " + t.getStandardLengthM().toPlainString() + " m)");
                }
                if (!calibrate && t.getStandardWidthM() != null && t.getStandardLengthM() != null
                        && (!ResourceCanvas.matchesStandardDimension(r.getWidth(), BigDecimal.ONE, sx, t.getStandardWidthM())
                        || !ResourceCanvas.matchesStandardDimension(r.getHeight(), BigDecimal.ONE, sy, t.getStandardLengthM())))
                    issues.add(floor.getName() + " / " + r.getLabel() + ": footprint differs from its resource type; review before conversion");
                if (calibrate) {
                    if (t.getStandardWidthM() == null || t.getStandardLengthM() == null)
                        issues.add(floor.getName() + " / " + r.getLabel() + ": confirm the resource type dimensions before recalibration");
                    else { rw = t.getStandardWidthM(); rh = t.getStandardLengthM(); }
                }
                converted.add(new Seat(r, metres(r.getPosX(), positionScaleX), metres(r.getPosY(), positionScaleY), rw, rh));
            }
            if (calibrate) converted = calibrateChildren(converted, issues);
            var decorations = new ArrayList<FloorDecorations.Item>();
            for (var item : ResourceCanvas.decorations(floor, true)) {
                if (!calibrate && convert && sx.subtract(sy).abs().compareTo(EPSILON) > 0 && rotated(item.rotation()))
                    issues.add(floor.getName() + " / " + item.label() + ": rotated legacy furniture needs placement review");
                var itemX = metres(item.posX(), positionScaleX); var itemY = metres(item.posY(), positionScaleY);
                var itemWidth = metres(item.width(), sx); var itemLength = metres(item.height(), sy);
                if (calibrate) {
                    var containingRooms = converted.stream().filter(seat -> seat.resource().getResourceType().getCategory()
                                    == base.api.shared.enums.ResourceCategory.ROOM)
                            .filter(seat -> ResourceCanvas.decorationBelongsToRoom(item, seat.resource())).toList();
                    if (containingRooms.size() > 1) issues.add(item.label() + ": ambiguous containing room; review before calibration");
                    if (containingRooms.size() == 1) {
                        var room = containingRooms.get(0);
                        itemWidth = item.width().multiply(room.width()).divide(room.resource().getWidth(), 6, RoundingMode.HALF_UP);
                        itemLength = item.height().multiply(room.length()).divide(room.resource().getHeight(), 6, RoundingMode.HALF_UP);
                        var center = roomLocalCenter(item.posX(), item.posY(), item.width(), item.height(), room);
                        itemX = center.x().subtract(itemWidth.divide(BigDecimal.valueOf(2)));
                        itemY = center.y().subtract(itemLength.divide(BigDecimal.valueOf(2)));
                    }
                }
                decorations.add(new FloorDecorations.Item(item.id(), item.kind(), item.label(),
                        MetricGeometry.pixels(itemX), MetricGeometry.pixels(itemY),
                        MetricGeometry.pixels(itemWidth), MetricGeometry.pixels(itemLength),
                        item.rotation(), item.color(), item.icon(), item.visual3d()));
            }
            areas.add(new Area(floor, x, y, w, h, converted, decorations,
                    resources.stream().filter(r -> Objects.equals(r.getFloorPlan().getId(), floor.getId()))
                            .map(PublishedGeometry::placement).toList()));
        }
        for (int i = 0; i < areas.size(); i++) for (int j = i + 1; j < areas.size(); j++) {
            var a = areas.get(i); var b = areas.get(j);
            if (a.x().compareTo(b.x().add(b.width())) < 0 && a.x().add(a.width()).compareTo(b.x()) > 0
                    && a.y().compareTo(b.y().add(b.length())) < 0 && a.y().add(a.length()).compareTo(b.y()) > 0)
                issues.add(a.floor().getName() + " / " + b.floor().getName() + ": workspace areas overlap");
        }
        if (physical.getCornerRadiusM().multiply(BigDecimal.valueOf(2)).compareTo(widthM.min(lengthM)) > 0)
            issues.add("The corner radius exceeds half the shorter floor dimension. Review the floor shape first");
        for (var area : areas) validatePreviewScene(area, physical, issues);
        return new Plan(new Review(convert, issues.isEmpty(), allocations.size(), resources.size(), List.copyOf(issues),
                "m", MetricGeometry.PIXELS_PER_METRE, areas.stream().map(area -> preview(area, physical, widthM, lengthM)).toList(), mode, widthM, lengthM), areas);
    }

    private static AreaPreview preview(Area area, BuildingFloorModel physical, BigDecimal widthM, BigDecimal lengthM) {
        var before = new ArrayList<ShapePreview>(); var after = new ArrayList<ShapePreview>();
        for (var seat : area.seats()) {
            var r = seat.resource();
            if (r.getStatus() == BookableResourceStatus.ARCHIVED) continue;
            before.add(new ShapePreview(r.getLabel(), r.getPosX(), r.getPosY(), r.getWidth(), r.getHeight(), r.getRotation()));
            after.add(new ShapePreview(r.getLabel(), MetricGeometry.pixels(seat.x()), MetricGeometry.pixels(seat.y()),
                    MetricGeometry.pixels(seat.width()), MetricGeometry.pixels(seat.length()), r.getRotation()));
        }
        for (var item : ResourceCanvas.decorations(area.floor(), true))
            before.add(new ShapePreview(item.label(), item.posX(), item.posY(), item.width(), item.height(), item.rotation()));
        for (var item : area.decorations())
            after.add(new ShapePreview(item.label(), item.posX(), item.posY(), item.width(), item.height(), item.rotation()));
        return new AreaPreview(area.floor().getId(), area.floor().getName(), area.floor().getUsageWidth(), area.floor().getUsageHeight(),
                MetricGeometry.pixels(area.width()), MetricGeometry.pixels(area.length()), before, after,
                FloorDesignService.measuredWidth(area.floor()), FloorDesignService.measuredLength(area.floor()), area.width(), area.length(),
                physical.getCanvasWidth(), physical.getCanvasHeight(), MetricGeometry.pixels(widthM), MetricGeometry.pixels(lengthM),
                area.floor().getUsageX(), area.floor().getUsageY(), MetricGeometry.pixels(area.x()), MetricGeometry.pixels(area.y()));
    }

    public static void apply(BuildingFloorModel physical, Plan plan, BigDecimal widthM, BigDecimal lengthM) {
        if (!plan.review().applicable()) throw new ConflictException(String.join("; ", plan.review().issues()));
        boolean rebuild = plan.review().conversionRequired() || plan.review().measurementMode() == MeasurementMode.CALIBRATE;
        if (rebuild) {
            for (var area : plan.areas()) {
                var floor = area.floor();
                var items = area.seats().stream().map(Seat::resource).toList();
                PublishedGeometry.retain(floor, items);
                if (floor.getLegacyGeometryJson() == null) {
                    try {
                        var original = new LinkedHashMap<String, Object>();
                        original.put("canvasWidth", physical.getCanvasWidth()); original.put("canvasHeight", physical.getCanvasHeight());
                        original.put("realWidthM", physical.getRealWidthM()); original.put("realLengthM", physical.getRealLengthM());
                        original.put("usage", Arrays.asList(floor.getUsageX(), floor.getUsageY(), floor.getUsageWidth(), floor.getUsageHeight()));
                        original.put("published", floor.getLayoutJson()); original.put("draft", floor.getDraftLayoutJson());
                        original.put("resources", area.originalResources());
                        floor.setLegacyGeometryJson(new ObjectMapper().writeValueAsString(original));
                    } catch (Exception e) { throw new IllegalStateException("Could not retain legacy geometry", e); }
                }
            }
        }
        physical.setGeometryVersion(2);
        physical.setRealWidthM(widthM); physical.setRealLengthM(lengthM);
        physical.setCanvasWidth(MetricGeometry.pixels(widthM)); physical.setCanvasHeight(MetricGeometry.pixels(lengthM));
        for (var area : plan.areas()) {
            var floor = area.floor();
            floor.setUsageXM(area.x()); floor.setUsageYM(area.y()); floor.setUsageWidthM(area.width()); floor.setUsageLengthM(area.length());
            floor.setUsageX(MetricGeometry.pixels(area.x())); floor.setUsageY(MetricGeometry.pixels(area.y()));
            floor.setUsageWidth(MetricGeometry.pixels(area.width())); floor.setUsageHeight(MetricGeometry.pixels(area.length()));
            if (rebuild) {
                for (var seat : area.seats()) {
                    var r = seat.resource();
                    r.setPosX(MetricGeometry.pixels(seat.x())); r.setPosY(MetricGeometry.pixels(seat.y()));
                    r.setWidth(MetricGeometry.pixels(seat.width())); r.setHeight(MetricGeometry.pixels(seat.length()));
                }
                floor.setDraftLayoutJson(ResourceCanvas.writeDecorations(floor,
                        new ResourceCanvas.Bounds(floor.getUsageWidth(), floor.getUsageHeight()), area.decorations()));
            }
        }
    }

    private static boolean rotated(BigDecimal rotation) {
        return rotation != null && rotation.remainder(new BigDecimal("360")).signum() != 0;
    }

    private record Point(BigDecimal x, BigDecimal y) {}

    /** An earlier conversion may already have distorted the current scene; inspect the retained original. */
    private static Map<Long, PublishedGeometry.Placement> originalShapes(FloorPlanModel floor, List<String> issues) {
        if (floor.getLegacyGeometryJson() == null) return Map.of();
        try {
            var mapper = new ObjectMapper();
            var shapes = mapper.readTree(floor.getLegacyGeometryJson()).get("resources");
            if (shapes == null || shapes.isNull()) return Map.of();
            if (shapes.isTextual()) shapes = mapper.readTree(shapes.asText());
            if (!shapes.isArray()) throw new IllegalArgumentException("Invalid retained resource array");
            var result = new HashMap<Long, PublishedGeometry.Placement>();
            for (var shape : shapes) {
                var item = mapper.treeToValue(shape, PublishedGeometry.Placement.class);
                if (item.id() != null) result.put(item.id(), item);
            }
            return result;
        } catch (Exception e) {
            issues.add("The retained original drawing needs review before recalibration");
            return Map.of();
        }
    }

    /** Catalog footprints stay fixed; a child's position follows its room's local frame. */
    private static ArrayList<Seat> calibrateChildren(List<Seat> seats, List<String> issues) {
        var byId = new HashMap<Long, Seat>();
        for (var seat : seats) byId.put(seat.resource().getId(), seat);
        var result = new ArrayList<Seat>();
        for (var seat : seats) {
            var parent = seat.resource().getParentRoom();
            if (parent == null) { result.add(seat); continue; }
            var room = byId.get(parent.getId());
            if (room == null) { issues.add(seat.resource().getLabel() + ": containing room is unavailable for recalibration"); result.add(seat); continue; }
            var r = seat.resource();
            var center = roomLocalCenter(r.getPosX(), r.getPosY(), r.getWidth(), r.getHeight(), room);
            result.add(new Seat(r, center.x().subtract(seat.width().divide(BigDecimal.valueOf(2))),
                    center.y().subtract(seat.length().divide(BigDecimal.valueOf(2))), seat.width(), seat.length()));
        }
        return result;
    }

    private static Point roomLocalCenter(BigDecimal x, BigDecimal y, BigDecimal width, BigDecimal height, Seat room) {
        var before = room.resource();
        double angle = Math.toRadians(before.getRotation() == null ? 0 : before.getRotation().doubleValue());
        double dx = x.doubleValue() + width.doubleValue() / 2 - before.getPosX().doubleValue() - before.getWidth().doubleValue() / 2;
        double dy = y.doubleValue() + height.doubleValue() / 2 - before.getPosY().doubleValue() - before.getHeight().doubleValue() / 2;
        double localX = (Math.cos(angle) * dx + Math.sin(angle) * dy) / before.getWidth().doubleValue() * room.width().doubleValue();
        double localY = (-Math.sin(angle) * dx + Math.cos(angle) * dy) / before.getHeight().doubleValue() * room.length().doubleValue();
        return new Point(BigDecimal.valueOf(room.x().doubleValue() + room.width().doubleValue() / 2
                + Math.cos(angle) * localX - Math.sin(angle) * localY).setScale(6, RoundingMode.HALF_UP),
                BigDecimal.valueOf(room.y().doubleValue() + room.length().doubleValue() / 2
                + Math.sin(angle) * localX + Math.cos(angle) * localY).setScale(6, RoundingMode.HALF_UP));
    }

    private static void validatePreviewScene(Area area, BuildingFloorModel sourcePhysical, List<String> issues) {
        var physical = new BuildingFloorModel(); physical.setGeometryVersion(2);
        physical.setOutline(sourcePhysical.getOutline()); physical.setCornerRadiusM(sourcePhysical.getCornerRadiusM());
        var floor = new FloorPlanModel(); floor.setBuildingFloor(physical);
        floor.setUsageWidth(MetricGeometry.pixels(area.width())); floor.setUsageHeight(MetricGeometry.pixels(area.length()));
        floor.setDraftLayoutJson(ResourceCanvas.writeDecorations(floor,
                new ResourceCanvas.Bounds(floor.getUsageWidth(), floor.getUsageHeight()), area.decorations()));
        var copies = new LinkedHashMap<Long, BookableResourceModel>();
        for (var seat : area.seats()) {
            var source = seat.resource(); var item = new BookableResourceModel();
            item.setId(source.getId()); item.setFloorPlan(floor); item.setResourceType(source.getResourceType());
            item.setLabel(source.getLabel()); item.setStatus(source.getStatus()); item.setCapacityOverride(source.getCapacityOverride());
            item.setPosX(MetricGeometry.pixels(seat.x())); item.setPosY(MetricGeometry.pixels(seat.y()));
            item.setWidth(MetricGeometry.pixels(seat.width())); item.setHeight(MetricGeometry.pixels(seat.length()));
            item.setRotation(source.getRotation()); copies.put(item.getId(), item);
        }
        for (var seat : area.seats()) {
            if (seat.resource().getParentRoom() != null) {
                var parent = copies.get(seat.resource().getParentRoom().getId());
                if (parent == null) issues.add(area.floor().getName() + ": incomplete containing room geometry");
                else copies.get(seat.resource().getId()).setParentRoom(parent);
            }
        }
        try { ResourceCanvas.validateScene(floor, List.copyOf(copies.values()), false); }
        catch (ConflictException e) { issues.add(area.floor().getName() + ": " + e.getMessage()); }
    }
    private static BigDecimal metres(BigDecimal pixels, BigDecimal scale) {
        return pixels.divide(scale, 6, RoundingMode.HALF_UP);
    }
}
