package base.api.feature.operations.repository;

import base.api.shared.entity.workspace.MaintenanceGroupModel;
import java.time.LocalDateTime;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface MaintenanceGroupRepository extends JpaRepository<MaintenanceGroupModel, Long> {
    @Query("select distinct g.workspace.id from MaintenanceGroupModel g where g.workspace.id in :ids and g.cancelled=false and g.wholeWorkspace=true and g.startTime<:to and g.endTime>:from")
    java.util.Set<Long> wholeWorkspaceOverlappingIds(@Param("ids") java.util.Collection<Long> ids,
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("select g from MaintenanceGroupModel g where g.workspace.id=:workspaceId and g.cancelled=false and locate(concat(',',:key,','),concat(',',g.memberKeys,','))>0")
    java.util.Optional<MaintenanceGroupModel> owningGroup(@Param("workspaceId") Long workspaceId,@Param("key") String key);

    @Query("select g from MaintenanceGroupModel g where g.workspace.id = :workspaceId and g.cancelled = false and g.startTime < :to and g.endTime > :from")
    List<MaintenanceGroupModel> overlapping(@Param("workspaceId") Long workspaceId,
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
    @Query("select (count(g) > 0) from MaintenanceGroupModel g where g.workspace.id = :workspaceId and g.cancelled = false and g.wholeWorkspace = true and g.startTime < :to and g.endTime > :from")
    boolean wholeWorkspaceOverlaps(@Param("workspaceId") Long workspaceId,
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);
}
