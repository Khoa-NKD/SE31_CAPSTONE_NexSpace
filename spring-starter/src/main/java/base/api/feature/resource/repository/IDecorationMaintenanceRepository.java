package base.api.feature.resource.repository;

import base.api.shared.entity.resource.DecorationMaintenanceSlotModel;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IDecorationMaintenanceRepository extends JpaRepository<DecorationMaintenanceSlotModel,Long> {
    @Query("select d from DecorationMaintenanceSlotModel d join fetch d.floorPlan f where f.workspace.id=:workspaceId and d.startTime<:to and d.endTime>:from")
    List<DecorationMaintenanceSlotModel> overlapping(Long workspaceId, LocalDateTime from, LocalDateTime to);
}
