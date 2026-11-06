package base.api.feature.resource.dto;

import base.api.shared.entity.resource.*;
import base.api.shared.enums.*;

import java.math.BigDecimal;
import java.util.List;

public final class ResourceResponses {
    private ResourceResponses() {}

    public record WorkspaceOption(Long id, String name, WorkspaceStatus status) {}

    public record FloorOption(
            Long id, String name, int floorNumber, FloorPlanStatus status, String revision) {}

    public record TypeOption(
            Long id,
            String name,
            ResourceCategory category,
            int capacity,
            @com.fasterxml.jackson.annotation.JsonFormat(
                            shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
                    BigDecimal pricePerHour,
            @com.fasterxml.jackson.annotation.JsonFormat(
                            shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
                    BigDecimal pricePerDay,
            @com.fasterxml.jackson.annotation.JsonFormat(
                            shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
                    BigDecimal pricePerMonth,
            boolean active,
            ResourceCurrency currency,
            String revision) {}

    public record Options(
            Long workspaceId,
            WorkspaceStatus workspaceStatus,
            List<FloorOption> floors,
            List<TypeOption> types,
            List<RoomOption> rooms) {}

    public record RoomOption(
            Long id,
            Long floorPlanId,
            String code,
            String name,
            int capacity,
            BookableResourceStatus status) {}

    public record LayoutItem(
            Long id,
            String code,
            String name,
            BigDecimal posX,
            BigDecimal posY,
            BigDecimal width,
            BigDecimal height,
            BigDecimal rotation,
            BookableResourceStatus status,
            String revision,
            ResourceCategory category,
            Long parentRoomId) {}

    public record FloorLayout(
            FloorOption floor,
            BigDecimal width,
            BigDecimal height,
            boolean editableLayout,
            List<LayoutItem> resources,
            List<FloorDecorations.Item> decorations,
            boolean draftChanges) {}

    public record Detail(
            Long id,
            Long workspaceId,
            Long floorPlanId,
            String floorName,
            Long resourceTypeId,
            String resourceTypeName,
            ResourceCategory category,
            String code,
            String name,
            String zoneName,
            NoiseLevel noiseLevel,
            Integer capacityOverride,
            int capacity,
            @com.fasterxml.jackson.annotation.JsonFormat(
                            shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
                    BigDecimal pricePerHour,
            @com.fasterxml.jackson.annotation.JsonFormat(
                            shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
                    BigDecimal effectivePricePerHour,
            @com.fasterxml.jackson.annotation.JsonFormat(
                            shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
                    BigDecimal pricePerDay,
            @com.fasterxml.jackson.annotation.JsonFormat(
                            shape = com.fasterxml.jackson.annotation.JsonFormat.Shape.STRING)
                    BigDecimal pricePerMonth,
            String description,
            BigDecimal posX,
            BigDecimal posY,
            BigDecimal width,
            BigDecimal height,
            BigDecimal rotation,
            BookableResourceStatus status,
            ResourceCurrency currency,
            String revision,
            Long parentRoomId,
            String parentRoomName) {}

    public static Detail detail(BookableResourceModel r) {
        var type = r.getResourceType();
        var floor = r.getFloorPlan();
        return new Detail(
                r.getId(),
                floor.getWorkspace().getId(),
                floor.getId(),
                floor.getName(),
                type.getId(),
                type.getName(),
                type.getCategory(),
                r.getLabel(),
                r.getName() == null || r.getName().isBlank() ? r.getLabel() : r.getName(),
                r.getZoneName(),
                r.getNoiseLevel(),
                r.getCapacityOverride(),
                r.getCapacityOverride() == null ? type.getCapacity() : r.getCapacityOverride(),
                r.getPricePerHour(),
                r.getPricePerHour() == null ? type.getPricePerHour() : r.getPricePerHour(),
                type.getPricePerDay(),
                type.getPricePerMonth(),
                r.getDescription(),
                r.getPosX(),
                r.getPosY(),
                r.getWidth(),
                r.getHeight(),
                r.getRotation(),
                r.getStatus(),
                type.getCurrency(),
                revision(r),
                r.getParentRoom() == null ? null : r.getParentRoom().getId(),
                r.getParentRoom() == null
                        ? null
                        : (r.getParentRoom().getName() == null
                                ? r.getParentRoom().getLabel()
                                : r.getParentRoom().getName()));
    }

    public static String revision(base.api.shared.entity.BaseModel r) {
        return r.getUpdatedAt() == null ? "initial" : r.getUpdatedAt().toString();
    }
}
