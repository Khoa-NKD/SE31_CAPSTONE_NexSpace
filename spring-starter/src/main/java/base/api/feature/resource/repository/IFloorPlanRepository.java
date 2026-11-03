package base.api.feature.resource.repository;

import base.api.shared.entity.resource.FloorPlanModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IFloorPlanRepository extends JpaRepository<FloorPlanModel, Long> {
    List<FloorPlanModel> findByWorkspaceIdOrderByFloorNumberAsc(Long workspaceId);
}
