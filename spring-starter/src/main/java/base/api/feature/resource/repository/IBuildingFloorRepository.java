package base.api.feature.resource.repository;

import base.api.shared.entity.resource.BuildingFloorModel;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IBuildingFloorRepository extends JpaRepository<BuildingFloorModel, Long> {
    @EntityGraph(attributePaths = "building")
    List<BuildingFloorModel> findByBuildingOrganizerIdOrderByFloorNumberAsc(Long organizerId);
    boolean existsByBuildingIdAndFloorNumber(Long buildingId, int floorNumber);
    boolean existsByBuildingId(Long buildingId);
}
