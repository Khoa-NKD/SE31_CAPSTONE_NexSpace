package base.api.feature.resource.service;
import base.api.shared.entity.resource.MetricGeometry;

import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.FloorPlanModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.exception.ConflictException;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.Map;

/** Coordinates are top-left canvas pixels; rotation is around the rectangle center. */
public final class ResourceCanvas {
    private ResourceCanvas() {}

    public static final String SCHEMA = "nexspace.resource-canvas.v1";

    /** Measured legacy layouts with a uniform scale remain compatible until explicit conversion. */
    public static void requireUniformMetricScale(FloorPlanModel floor) {
        var p = floor.getBuildingFloor();
        if (p == null || p.getRealWidthM() == null || p.getRealLengthM() == null)
            throw new ConflictException("Review and confirm the physical floor dimensions before publishing or activation");
        var x = p.getCanvasWidth().divide(p.getRealWidthM(), 8, RoundingMode.HALF_UP);
        var y = p.getCanvasHeight().divide(p.getRealLengthM(), 8, RoundingMode.HALF_UP);
        if (x.subtract(y).abs().compareTo(new BigDecimal("0.000001")) > 0)
            throw new ConflictException("The floor uses unequal axis scales; review and convert its metric geometry first");
    }

    static boolean matchesStandardDimension(BigDecimal pixels, BigDecimal metres, BigDecimal canvas,
            BigDecimal standard) {
        if (pixels == null || metres == null || canvas == null || standard == null || canvas.signum() <= 0) return false;
        var actual = pixels.multiply(metres).divide(canvas, 8, RoundingMode.HALF_UP);
        var tolerance = new BigDecimal("0.005").multiply(metres).divide(canvas, 8, RoundingMode.HALF_UP)
                .add(new BigDecimal("0.000001"));
        return actual.subtract(standard).abs().compareTo(tolerance) <= 0;
    }

    static void requireStandardFootprint(FloorPlanModel floor, ResourceTypeModel type,
            BigDecimal width, BigDecimal height) {
        if (type.getStandardWidthM() == null || type.getStandardLengthM() == null)
            throw new ConflictException("Complete the resource type's real dimensions before placing it");
        var bounds = editorBounds(floor);
        var measuredWidth = FloorDesignService.measuredWidth(floor);
        var measuredLength = FloorDesignService.measuredLength(floor);
        if (bounds == null || measuredWidth == null || measuredLength == null)
            throw new ConflictException("Set the physical floor dimensions before sizing this resource");
        if (!matchesStandardDimension(width, measuredWidth, bounds.width(), type.getStandardWidthM())
                || !matchesStandardDimension(height, measuredLength, bounds.height(), type.getStandardLengthM()))
            throw new ConflictException("Use the standard dimensions for " + type.getName()
                    + " or choose a separate resource type for a different size");
    }

    /** Unknown layouts may contain walls, zones or IDs that cannot safely be copied or deleted. */
    public static boolean simpleLayout(String json, boolean requireEmpty) {
        if (json == null || json.isBlank()) return true;
        var root = readJson(json);
        if (root == null) return false;
        var names = root.fieldNames();
        while (names.hasNext())
            if (!java.util.Set.of("schema", "canvas", "decorations", "metricDecorations", "geometryVersion").contains(names.next()))
                return false;
        if (!root.has("decorations")) return true;
        return root.path("decorations").isArray()
                && (!requireEmpty || root.path("decorations").isEmpty());
    }

    public static boolean ownsDraft(FloorPlanModel floor) {
        return readJson(floor.getDraftLayoutJson()) != null;
    }

    private static com.fasterxml.jackson.databind.JsonNode readJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            var root = new ObjectMapper().readTree(json);
            return root.isObject() && SCHEMA.equals(root.path("schema").asText()) ? root : null;
        } catch (java.io.IOException | RuntimeException ex) {
            return null;
        }
    }

    public static Bounds editorBounds(FloorPlanModel floor) {
        if (!ownsDraft(floor)) return withOutline(floor, read(floor));
        var temporary = new FloorPlanModel();
        temporary.setLayoutJson(floor.getDraftLayoutJson());
        return withOutline(floor, read(temporary));
    }

    public static Bounds withOutline(FloorPlanModel floor, Bounds bounds) {
        if (bounds == null || floor.getBuildingFloor() == null) return bounds;
        return new Bounds(bounds.width(), bounds.height(), MetricGeometry.pixels(floor.getBuildingFloor().getCornerRadiusM()));
    }

    public static java.util.List<base.api.feature.resource.dto.FloorDecorations.Item> decorations(
            FloorPlanModel floor, boolean editor) {
        var root =
                readJson(
                        editor && ownsDraft(floor)
                                ? floor.getDraftLayoutJson()
                                : floor.getLayoutJson());
        if (root == null || !root.has("decorations")) return java.util.List.of();
        try {
            if (floor.getBuildingFloor() != null && floor.getBuildingFloor().getGeometryVersion() >= 2
                    && root.has("metricDecorations")) {
                var metric = new ObjectMapper().treeToValue(root.get("metricDecorations"),
                        base.api.feature.resource.dto.FloorDecorations.Item[].class);
                return java.util.Arrays.stream(metric).map(item -> convertDecoration(item, true)).toList();
            }
            var items =
                    new ObjectMapper()
                            .treeToValue(
                                    root.get("decorations"),
                                    base.api.feature.resource.dto.FloorDecorations.Item[].class);
            if (items == null || items.length > 500)
                throw new ConflictException("Invalid stored layout decorations");
            return java.util.List.of(items);
        } catch (java.io.IOException | IllegalArgumentException ex) {
            throw new ConflictException("Invalid stored layout decorations");
        }
    }

    public static String writeDecorations(
            FloorPlanModel floor,
            Bounds bounds,
            java.util.List<base.api.feature.resource.dto.FloorDecorations.Item> decorations) {
        return writeDecorations(floor, bounds, decorations, true);
    }

    public static String writeDecorations(
            FloorPlanModel floor,
            Bounds bounds,
            java.util.List<base.api.feature.resource.dto.FloorDecorations.Item> decorations,
            boolean editor) {
        if (floor.getBuildingFloor() != null && (floor.getUsageWidth().compareTo(bounds.width()) != 0
                || floor.getUsageHeight().compareTo(bounds.height()) != 0))
            throw new ConflictException("Canvas dimensions must match this workspace's allocated area on the physical floor");
        var mapper = new ObjectMapper();
        var existing =
                readJson(
                        editor && ownsDraft(floor)
                                ? floor.getDraftLayoutJson()
                                : floor.getLayoutJson());
        var root =
                existing == null
                        ? mapper.createObjectNode()
                        : ((com.fasterxml.jackson.databind.node.ObjectNode) existing).deepCopy();
        root.put("schema", SCHEMA);
        root.set(
                "canvas",
                mapper.valueToTree(
                        Map.of(
                                "width",
                                bounds.width(),
                                "height",
                                bounds.height(),
                                "unit",
                                "px",
                                "origin",
                                "top-left",
                                "rotationOrigin",
                                "center")));
        root.set("decorations", mapper.valueToTree(decorations));
        if (floor.getBuildingFloor() != null && floor.getBuildingFloor().getGeometryVersion() >= 2) {
            root.put("geometryVersion", 2);
            root.set("metricDecorations", mapper.valueToTree(decorations.stream().map(item -> convertDecoration(item, false)).toList()));
        }
        return root.toString();
    }

    private static base.api.feature.resource.dto.FloorDecorations.Item convertDecoration(
            base.api.feature.resource.dto.FloorDecorations.Item item, boolean toPixels) {
        java.util.function.Function<BigDecimal, BigDecimal> convert = toPixels
                ? base.api.shared.entity.resource.MetricGeometry::pixels : base.api.shared.entity.resource.MetricGeometry::metres;
        return new base.api.feature.resource.dto.FloorDecorations.Item(item.id(), item.kind(), item.label(),
                convert.apply(item.posX()), convert.apply(item.posY()), convert.apply(item.width()), convert.apply(item.height()),
                item.rotation(), item.color(), item.icon(), item.visual3d());
    }

    /** Every final scene is checked using stable model pixels (one scale on both axes). */
    public static void validateScene(FloorPlanModel floor, java.util.List<BookableResourceModel> resources, boolean requireStandards) {
        var bounds = editorBounds(floor);
        if (bounds == null) throw new ConflictException("Complete the workspace canvas before validating geometry");
        var current = resources.stream().filter(r -> r.getStatus() != base.api.shared.enums.BookableResourceStatus.ARCHIVED).toList();
        for (var item : current) {
            fits(item, bounds, requireStandards);
            if (requireStandards) requireStandardFootprint(floor, item.getResourceType(), item.getWidth(), item.getHeight());
            if (item.getParentRoom() != null) {
                var parent = item.getParentRoom();
                if (item.getResourceType().getCategory() != base.api.shared.enums.ResourceCategory.DESK
                        || parent.getResourceType().getCategory() != base.api.shared.enums.ResourceCategory.ROOM
                        || current.stream().noneMatch(r -> sameResource(r, parent)))
                    throw new ConflictException("The containing room must belong to the same workspace area");
                fitsInsideRoom(item, parent);
            }
            long children = current.stream().filter(r -> r.getParentRoom() != null
                    && sameResource(r.getParentRoom(), item)).count();
            int capacity = item.getCapacityOverride() == null ? item.getResourceType().getCapacity() : item.getCapacityOverride();
            if (children > capacity) throw new ConflictException("Room capacity is smaller than its desk count: " + item.getLabel());
        }
        for (int i = 0; i < current.size(); i++) for (int j = i + 1; j < current.size(); j++) {
            var a = current.get(i); var b = current.get(j);
            boolean aInsideB = sameResource(a.getParentRoom(), b);
            boolean bInsideA = sameResource(b.getParentRoom(), a);
            if (!aInsideB && !bInsideA && overlaps(a, b))
                throw new ConflictException("Resources overlap: " + a.getLabel() + " / " + b.getLabel());
        }
        var objects = decorations(floor, true);
        validateDecorations(objects, bounds); validateDecorationResources(objects, current);
    }

    private static boolean sameResource(BookableResourceModel a, BookableResourceModel b) {
        return a != null && b != null && (a == b || a.getId() != null && a.getId().equals(b.getId()));
    }

    public static void validateDecorations(
            java.util.List<base.api.feature.resource.dto.FloorDecorations.Item> items,
            Bounds bounds) {
        validateDecorationBounds(items, bounds);
        for (int i = 0; i < items.size(); i++)
            for (int j = i + 1; j < items.size(); j++)
                if (overlaps(shape(items.get(i)), shape(items.get(j))))
                    throw new ConflictException(
                            "Layout objects overlap: "
                                    + items.get(i).label()
                                    + " / "
                                    + items.get(j).label());
    }

    static void validateDecorationBounds(
            java.util.List<base.api.feature.resource.dto.FloorDecorations.Item> items, Bounds bounds) {
        var ids = new java.util.HashSet<String>();
        for (var item : items) {
            if (!ids.add(item.id())) throw new ConflictException("Duplicate decoration ID");
            if (item.posX().signum() < 0 || item.posY().signum() < 0)
                throw new ConflictException(
                        "Layout object has unsupported negative coordinates: " + item.label());
            var shape = new BookableResourceModel();
            shape.setLabel(item.label());
            shape.setPosX(item.posX());
            shape.setPosY(item.posY());
            shape.setWidth(item.width());
            shape.setHeight(item.height());
            shape.setRotation(item.rotation());
            fits(shape, bounds, true);
        }
    }

    public static BookableResourceModel shape(
            base.api.feature.resource.dto.FloorDecorations.Item item) {
        var result = new BookableResourceModel();
        result.setLabel(item.label());
        result.setPosX(item.posX());
        result.setPosY(item.posY());
        result.setWidth(item.width());
        result.setHeight(item.height());
        result.setRotation(item.rotation());
        return result;
    }

    public static boolean contained(BookableResourceModel item, BookableResourceModel room) {
        if (!hasGeometry(item) || !hasGeometry(room)) return false;
        try {
            fitsInsideRoom(item, room);
            return true;
        } catch (ConflictException ex) {
            return false;
        }
    }

    public static boolean decorationBelongsToRoom(base.api.feature.resource.dto.FloorDecorations.Item item, BookableResourceModel room) {
        return contained(shape(item), room) || RoomDoorGeometry.onBoundary(item, room);
    }

    /** Room containment is spatial only; decorations never acquire booking ownership. */
    public static java.util.List<base.api.feature.resource.dto.FloorDecorations.Item>
            moveDecorations(
                    java.util.List<base.api.feature.resource.dto.FloorDecorations.Item> items,
                    Pose before,
                    BookableResourceModel room) {
        var oldRoom = new BookableResourceModel();
        oldRoom.setPosX(before.x());
        oldRoom.setPosY(before.y());
        oldRoom.setWidth(before.width());
        oldRoom.setHeight(before.height());
        oldRoom.setRotation(before.rotation());
        return items.stream()
                .map(
                        item -> {
                            var object = shape(item);
                            if (!decorationBelongsToRoom(item, oldRoom)) return item;
                            moveWithRoom(object, before, room);
                            var moved = new base.api.feature.resource.dto.FloorDecorations.Item(item.id(), item.kind(), item.label(),
                                    object.getPosX(), object.getPosY(), item.width(), item.height(), object.getRotation(), item.color(), item.icon(), item.visual3d());
                            if (!decorationBelongsToRoom(moved, room))
                                throw new ConflictException(
                                        "Resizing the room would leave a layout object outside: "
                                                + item.label());
                            return new base.api.feature.resource.dto.FloorDecorations.Item(
                                    item.id(),
                                    item.kind(),
                                    item.label(),
                                    object.getPosX(),
                                    object.getPosY(),
                                    item.width(),
                                    item.height(),
                                    object.getRotation(),
                                    item.color(), item.icon(), item.visual3d());
                        })
                .toList();
    }

    public static void validateDecorationResources(
            java.util.List<base.api.feature.resource.dto.FloorDecorations.Item> items,
            java.util.List<BookableResourceModel> resources) {
        for (var item : items) {
            var object = shape(item);
            for (var resource : resources) {
                if (resource.getStatus() == base.api.shared.enums.BookableResourceStatus.ARCHIVED)
                    continue;
                if (overlaps(object, resource)
                        && !(resource.getResourceType().getCategory()
                                        == base.api.shared.enums.ResourceCategory.ROOM
                                && decorationBelongsToRoom(item, resource)))
                    throw new ConflictException(
                            "Layout object "
                                    + item.label()
                                    + " overlaps resource "
                                    + resource.getLabel());
            }
        }
    }

    public record Bounds(BigDecimal width, BigDecimal height, BigDecimal cornerRadius) {
        public Bounds(BigDecimal width, BigDecimal height) { this(width, height, BigDecimal.ZERO); }
        public Bounds(BigDecimal width, BigDecimal height, boolean rounded) {
            this(width, height, rounded ? width.min(height).multiply(new BigDecimal("0.12")) : BigDecimal.ZERO);
        }
        public boolean rounded() { return cornerRadius.signum() > 0; }
    }

    public record Pose(
            BigDecimal x, BigDecimal y, BigDecimal width, BigDecimal height, BigDecimal rotation) {}

    public static Pose pose(BookableResourceModel resource) {
        return new Pose(
                resource.getPosX(),
                resource.getPosY(),
                resource.getWidth(),
                resource.getHeight(),
                resource.getRotation() == null ? BigDecimal.ZERO : resource.getRotation());
    }

    /** Preserve desk-local position and size when the containing room moves, rotates or resizes. */
    public static void moveWithRoom(
            BookableResourceModel desk, Pose before, BookableResourceModel room) {
        if (before.x() == null
                || before.y() == null
                || before.width() == null
                || before.height() == null
                || !hasGeometry(desk)
                || !hasGeometry(room))
            throw new ConflictException(
                    "Complete room and desk geometry is required before moving a room group");
        double oldAngle = Math.toRadians(before.rotation().doubleValue());
        double newAngle = Math.toRadians(room.getRotation().doubleValue());
        double dx =
                desk.getPosX().doubleValue()
                        + desk.getWidth().doubleValue() / 2
                        - before.x().doubleValue()
                        - before.width().doubleValue() / 2;
        double dy =
                desk.getPosY().doubleValue()
                        + desk.getHeight().doubleValue() / 2
                        - before.y().doubleValue()
                        - before.height().doubleValue() / 2;
        double localX =
                Math.cos(oldAngle) * dx
                        + Math.sin(oldAngle) * dy
                        + before.width().doubleValue() / 2;
        double localY =
                -Math.sin(oldAngle) * dx
                        + Math.cos(oldAngle) * dy
                        + before.height().doubleValue() / 2;
        double relativeX = localX - room.getWidth().doubleValue() / 2;
        double relativeY = localY - room.getHeight().doubleValue() / 2;
        double cx =
                room.getPosX().doubleValue()
                        + room.getWidth().doubleValue() / 2
                        + Math.cos(newAngle) * relativeX
                        - Math.sin(newAngle) * relativeY;
        double cy =
                room.getPosY().doubleValue()
                        + room.getHeight().doubleValue() / 2
                        + Math.sin(newAngle) * relativeX
                        + Math.cos(newAngle) * relativeY;
        desk.setPosX(
                BigDecimal.valueOf(cx - desk.getWidth().doubleValue() / 2)
                        .setScale(2, java.math.RoundingMode.HALF_UP));
        desk.setPosY(
                BigDecimal.valueOf(cy - desk.getHeight().doubleValue() / 2)
                        .setScale(2, java.math.RoundingMode.HALF_UP));
        double rotation =
                (desk.getRotation().doubleValue()
                                + room.getRotation().doubleValue()
                                - before.rotation().doubleValue())
                        % 360;
        desk.setRotation(
                BigDecimal.valueOf(rotation < 0 ? rotation + 360 : rotation)
                        .setScale(2, java.math.RoundingMode.HALF_UP));
        if (desk.getRotation().compareTo(new BigDecimal("360")) >= 0)
            desk.setRotation(BigDecimal.ZERO);
    }

    public static Bounds read(FloorPlanModel floor) {
        if (floor.getLayoutJson() == null || floor.getLayoutJson().isBlank()) return null;
        try {
            var root = new ObjectMapper().readTree(floor.getLayoutJson());
            if (!SCHEMA.equals(root.path("schema").asText())) return null;
            var canvas = root.path("canvas");
            BigDecimal width = canvas.path("width").decimalValue(),
                    height = canvas.path("height").decimalValue();
            return width.signum() > 0 && height.signum() > 0 ? new Bounds(width, height) : null;
        } catch (java.io.IOException | RuntimeException ex) {
            return null;
        }
    }

    public static String write(BigDecimal width, BigDecimal height) {
        try {
            return new ObjectMapper()
                    .writeValueAsString(
                            Map.of(
                                    "schema",
                                    SCHEMA,
                                    "canvas",
                                    Map.of(
                                            "width",
                                            width,
                                            "height",
                                            height,
                                            "unit",
                                            "px",
                                            "origin",
                                            "top-left",
                                            "rotationOrigin",
                                            "center")));
        } catch (com.fasterxml.jackson.core.JsonProcessingException ex) {
            throw new IllegalStateException("Could not encode floor canvas");
        }
    }

    /** Coordinates remain floor-absolute; transform desk corners into the rotated room frame. */
    public static void fitsInsideRoom(BookableResourceModel desk, BookableResourceModel room) {
        if (!hasGeometry(desk) || !hasGeometry(room))
            throw new ConflictException(
                    "Both the desk and its room need complete coordinates and dimensions");
        double roomWidth = room.getWidth().doubleValue(),
                roomHeight = room.getHeight().doubleValue();
        double roomX = room.getPosX().doubleValue() + roomWidth / 2;
        double roomY = room.getPosY().doubleValue() + roomHeight / 2;
        double roomAngle =
                Math.toRadians(room.getRotation() == null ? 0 : room.getRotation().doubleValue());
        double deskAngle =
                Math.toRadians(desk.getRotation() == null ? 0 : desk.getRotation().doubleValue());
        double deskWidth = desk.getWidth().doubleValue(),
                deskHeight = desk.getHeight().doubleValue();
        double centerX = desk.getPosX().doubleValue() + deskWidth / 2;
        double centerY = desk.getPosY().doubleValue() + deskHeight / 2;
        for (int sx : new int[] {-1, 1})
            for (int sy : new int[] {-1, 1}) {
                double dx = sx * deskWidth / 2, dy = sy * deskHeight / 2;
                double x = centerX + Math.cos(deskAngle) * dx - Math.sin(deskAngle) * dy - roomX;
                double y = centerY + Math.sin(deskAngle) * dx + Math.cos(deskAngle) * dy - roomY;
                double localX = Math.cos(roomAngle) * x + Math.sin(roomAngle) * y;
                double localY = -Math.sin(roomAngle) * x + Math.cos(roomAngle) * y;
                if (Math.abs(localX) > roomWidth / 2 + 0.000001
                        || Math.abs(localY) > roomHeight / 2 + 0.000001)
                    throw new ConflictException(
                            "Desk "
                                    + desk.getLabel()
                                    + " must fit entirely inside its containing room, including"
                                    + " rotation");
            }
    }

    private static boolean hasGeometry(BookableResourceModel resource) {
        return resource.getPosX() != null
                && resource.getPosY() != null
                && resource.getWidth() != null
                && resource.getHeight() != null
                && resource.getWidth().signum() > 0
                && resource.getHeight().signum() > 0;
    }

    /** Separating-axis test for two rotated rectangles; touching edges do not overlap. */
    public static boolean overlaps(BookableResourceModel a, BookableResourceModel b) {
        if (!hasGeometry(a) || !hasGeometry(b)) return false;
        double[][] first = corners(a), second = corners(b);
        for (double[][] polygon : new double[][][] {first, second}) {
            for (int i = 0; i < 2; i++) {
                double axisX = polygon[i + 1][0] - polygon[i][0];
                double axisY = polygon[i + 1][1] - polygon[i][1];
                double length = Math.hypot(axisX, axisY);
                double nx = -axisY / length, ny = axisX / length;
                double minA = Double.POSITIVE_INFINITY, maxA = Double.NEGATIVE_INFINITY;
                double minB = Double.POSITIVE_INFINITY, maxB = Double.NEGATIVE_INFINITY;
                for (double[] point : first) {
                    double value = point[0] * nx + point[1] * ny;
                    minA = Math.min(minA, value);
                    maxA = Math.max(maxA, value);
                }
                for (double[] point : second) {
                    double value = point[0] * nx + point[1] * ny;
                    minB = Math.min(minB, value);
                    maxB = Math.max(maxB, value);
                }
                if (maxA <= minB + 0.000001 || maxB <= minA + 0.000001) return false;
            }
        }
        return true;
    }

    private static double[][] corners(BookableResourceModel resource) {
        double width = resource.getWidth().doubleValue(),
                height = resource.getHeight().doubleValue();
        double cx = resource.getPosX().doubleValue() + width / 2,
                cy = resource.getPosY().doubleValue() + height / 2;
        double angle =
                Math.toRadians(
                        resource.getRotation() == null ? 0 : resource.getRotation().doubleValue());
        double[][] points = {
            {-width / 2, -height / 2},
            {width / 2, -height / 2},
            {width / 2, height / 2},
            {-width / 2, height / 2}
        };
        for (double[] point : points) {
            double x = point[0], y = point[1];
            point[0] = cx + Math.cos(angle) * x - Math.sin(angle) * y;
            point[1] = cy + Math.sin(angle) * x + Math.cos(angle) * y;
        }
        return points;
    }

    public static void fits(BookableResourceModel resource, Bounds bounds, boolean required) {
        if (resource.getPosX() == null
                || resource.getPosY() == null
                || resource.getWidth() == null
                || resource.getHeight() == null) {
            if (required)
                throw new ConflictException(
                        "Resource "
                                + resource.getLabel()
                                + " needs X, Y, width and height before publishing or activation");
            return;
        }
        double x = resource.getPosX().doubleValue(),
                y = resource.getPosY().doubleValue(),
                width = resource.getWidth().doubleValue(),
                height = resource.getHeight().doubleValue();
        double angle =
                Math.toRadians(
                        resource.getRotation() == null ? 0 : resource.getRotation().doubleValue());
        double halfX = (Math.abs(Math.cos(angle)) * width + Math.abs(Math.sin(angle)) * height) / 2;
        double halfY = (Math.abs(Math.sin(angle)) * width + Math.abs(Math.cos(angle)) * height) / 2;
        double centerX = x + width / 2, centerY = y + height / 2, epsilon = 0.000001;
        if (width <= 0
                || height <= 0
                || centerX - halfX < -epsilon
                || centerY - halfY < -epsilon
                || centerX + halfX > bounds.width().doubleValue() + epsilon
                || centerY + halfY > bounds.height().doubleValue() + epsilon)
            throw new ConflictException(
                    "Resource "
                            + resource.getLabel()
                            + " is outside the floor canvas, including its rotation");
        if (bounds.rounded()) {
            double canvasWidth = bounds.width().doubleValue(), canvasHeight = bounds.height().doubleValue();
            double radius = bounds.cornerRadius().doubleValue();
            for (double[] point : corners(resource)) {
                double dx = point[0] - Math.max(radius, Math.min(canvasWidth - radius, point[0]));
                double dy = point[1] - Math.max(radius, Math.min(canvasHeight - radius, point[1]));
                if (Math.hypot(dx, dy) > radius + epsilon)
                    throw new ConflictException("Resource " + resource.getLabel() + " is outside a rounded floor corner");
            }
        }
    }
}
