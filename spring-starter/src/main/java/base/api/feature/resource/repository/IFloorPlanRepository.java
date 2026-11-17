package base.api.feature.resource.repository;

import base.api.shared.entity.resource.FloorPlanModel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IFloorPlanRepository extends JpaRepository<FloorPlanModel, Long> {
    @org.springframework.data.jpa.repository.Query("select distinct f.workspace.id from FloorPlanModel f where f.buildingFloor.building.id = :buildingId order by f.workspace.id")
    List<Long> findWorkspaceIdsByBuildingId(@org.springframework.data.repository.query.Param("buildingId") Long buildingId);
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"workspace", "buildingFloor", "buildingFloor.building"})
    List<FloorPlanModel> findByBuildingFloorId(Long buildingFloorId);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"workspace", "buildingFloor", "buildingFloor.building"})
    List<FloorPlanModel> findByWorkspaceOrganizerIdAndBuildingFloorIsNotNull(Long organizerId);

    boolean existsByBuildingFloorId(Long buildingFloorId);

    boolean existsByWorkspaceIdAndFloorNumber(Long workspaceId, int floorNumber);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths = {"buildingFloor", "buildingFloor.building"})
    List<FloorPlanModel> findByWorkspaceIdOrderByFloorNumberAsc(Long workspaceId);
}
