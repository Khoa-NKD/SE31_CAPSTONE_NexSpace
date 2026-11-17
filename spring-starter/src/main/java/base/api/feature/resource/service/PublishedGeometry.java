package base.api.feature.resource.service;

import base.api.shared.entity.resource.*;
import base.api.feature.resource.dto.BuildingResponses;
import base.api.feature.resource.dto.ResourceResponses;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.FloorPlanStatus;
import base.api.shared.exception.ConflictException;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.math.BigDecimal;
import java.util.*;

/** Published placement is immutable until publish; prices and availability remain live. */
public final class PublishedGeometry {
    private static final ObjectMapper JSON = new ObjectMapper();
    private PublishedGeometry() {}

    public record Placement(Long id, Long typeId, Long parentId, BigDecimal posX, BigDecimal posY,
                            BigDecimal width, BigDecimal height, BigDecimal rotation) {}

    public static Placement placement(BookableResourceModel resource) {
        return new Placement(resource.getId(), resource.getResourceType().getId(),
                resource.getParentRoom() == null ? null : resource.getParentRoom().getId(),
                resource.getPosX(), resource.getPosY(), resource.getWidth(), resource.getHeight(), resource.getRotation());
    }

    public static String snapshot(List<BookableResourceModel> resources) {
        try {
            return JSON.writeValueAsString(resources.stream()
                    .filter(r -> r.getStatus() != BookableResourceStatus.ARCHIVED)
                    .filter(r -> r.getPosX() != null && r.getPosY() != null && r.getWidth() != null && r.getHeight() != null)
                    .map(PublishedGeometry::placement).toList());
        } catch (Exception e) { throw new IllegalStateException("Could not snapshot published geometry", e); }
    }

    public static Map<Long, Placement> read(FloorPlanModel floor) {
        if (floor.getPublishedGeometryJson() == null) return null;
        try {
            List<Placement> items = JSON.readValue(floor.getPublishedGeometryJson(), new TypeReference<>() {});
            var result = new LinkedHashMap<Long, Placement>();
            for (var item : items) {
                if (result.putIfAbsent(item.id(), item) != null) throw new IllegalArgumentException("Duplicate ID");
            }
            return result;
        } catch (Exception e) { throw new ConflictException("Published geometry is invalid; review and republish this floor"); }
    }

    public static void retain(FloorPlanModel floor, List<BookableResourceModel> resources) {
        if (floor.getStatus() == FloorPlanStatus.PUBLISHED && floor.getPublishedGeometryJson() == null)
            floor.setPublishedGeometryJson(snapshot(resources));
        if (floor.getStatus() == FloorPlanStatus.PUBLISHED && floor.getPublishedLocationJson() == null)
            floor.setPublishedLocationJson(locationSnapshot(floor));
    }

    public static String locationSnapshot(FloorPlanModel floor) {
        try { return JSON.writeValueAsString(ResourceResponses.floorOption(floor).location()); }
        catch (Exception e) { throw new IllegalStateException("Could not snapshot workspace area location", e); }
    }

    public static BuildingResponses.Location location(FloorPlanModel floor) {
        if (floor.getPublishedLocationJson() == null) return ResourceResponses.floorOption(floor).location();
        try { return JSON.readValue(floor.getPublishedLocationJson(), BuildingResponses.Location.class); }
        catch (Exception e) { throw new ConflictException("Published workspace location needs review"); }
    }

    public static boolean matches(Placement published, BookableResourceModel current) {
        if (published == null || !Objects.equals(published.typeId(), current.getResourceType().getId())
                || !Objects.equals(published.parentId(), current.getParentRoom() == null ? null : current.getParentRoom().getId())) return false;
        var now = placement(current);
        return same(published.posX(), now.posX()) && same(published.posY(), now.posY())
                && same(published.width(), now.width()) && same(published.height(), now.height())
                && same(published.rotation(), now.rotation());
    }

    public static boolean isCurrentPublishedPlacement(BookableResourceModel resource) {
        var floor = resource.getFloorPlan();
        if (floor == null) return false;
        // Retained layouts remain readable until explicitly reviewed and converted.
        if ((floor.getBuildingFloor() == null || floor.getBuildingFloor().getGeometryVersion() < 2)
                && floor.getPublishedGeometryJson() == null) return true;
        if (floor.getStatus() != FloorPlanStatus.PUBLISHED) return false;
        if (!matchesLocation(floor)) return false;
        var snapshot = read(floor);
        if (snapshot == null || !matches(snapshot.get(resource.getId()), resource)) return false;
        if (resource.getParentRoom() != null)
            return matches(snapshot.get(resource.getParentRoom().getId()), resource.getParentRoom());
        return true;
    }

    public static boolean matchesLocation(FloorPlanModel floor) {
        var location = location(floor);
        return location != null && floor.getBuildingFloor() != null
                && Objects.equals(location.buildingFloorId(), floor.getBuildingFloor().getId())
                && same(location.x(), floor.getUsageX()) && same(location.y(), floor.getUsageY())
                && same(location.width(), floor.getUsageWidth()) && same(location.height(), floor.getUsageHeight());
    }

    private static boolean same(BigDecimal a, BigDecimal b) {
        return a == null ? b == null : b != null && a.compareTo(b) == 0;
    }
}
