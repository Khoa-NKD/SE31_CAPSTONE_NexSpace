package base.api.feature.resource.dto;

import java.math.BigDecimal;
import java.util.List;

public final class BuildingResponses {
    private BuildingResponses() {}
    public record Building(Long id, String name, String address, String revision, List<PhysicalFloor> floors,
                           BigDecimal latitude, BigDecimal longitude, String city, String ward) {}
    public record PhysicalFloor(Long id, String name, int floorNumber, BigDecimal width,
                                BigDecimal height, String revision, List<Occupant> occupants,
                                BigDecimal realWidthM, BigDecimal realLengthM, int geometryVersion) {
        public PhysicalFloor(Long id, String name, int floorNumber, BigDecimal width, BigDecimal height,
                String revision, List<Occupant> occupants) {
            this(id, name, floorNumber, width, height, revision, occupants, null, null, 1);
        }
    }
    public record Occupant(Long workspaceId, String workspaceName, Long floorPlanId,
                           String layoutName, String status, BigDecimal x, BigDecimal y,
                           BigDecimal width, BigDecimal height) {}
    public record Location(Long buildingId, String buildingName, String buildingAddress,
                           Long buildingFloorId, String physicalFloorName, int floorNumber,
                           BigDecimal x, BigDecimal y, BigDecimal width, BigDecimal height) {}
}
