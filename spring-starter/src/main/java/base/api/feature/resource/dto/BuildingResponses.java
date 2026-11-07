package base.api.feature.resource.dto;

import java.math.BigDecimal;
import java.util.List;

public final class BuildingResponses {
    private BuildingResponses() {}
    public record Building(Long id, String name, String address, String revision, List<PhysicalFloor> floors) {}
    public record PhysicalFloor(Long id, String name, int floorNumber, BigDecimal width,
                                BigDecimal height, String revision, List<Occupant> occupants) {}
    public record Occupant(Long workspaceId, String workspaceName, Long floorPlanId,
                           String layoutName, String status, BigDecimal x, BigDecimal y,
                           BigDecimal width, BigDecimal height) {}
    public record Location(Long buildingId, String buildingName, String buildingAddress,
                           Long buildingFloorId, String physicalFloorName, int floorNumber,
                           BigDecimal x, BigDecimal y, BigDecimal width, BigDecimal height) {}
}
