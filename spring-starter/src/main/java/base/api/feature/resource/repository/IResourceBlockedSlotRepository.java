package base.api.feature.resource.repository;

import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface IResourceBlockedSlotRepository extends JpaRepository<ResourceBlockedSlotModel, Long> {
    @Query("""
            select distinct r.id from BookableResourceModel r
            where r.floorPlan.workspace.id in :workspaceIds and exists (
              select b.id from ResourceBlockedSlotModel b
              where (b.resource = r or b.resource.parentRoom = r or b.resource = r.parentRoom)
                and b.startTime < :to and b.endTime > :from)
            """)
    java.util.Set<Long> findSearchBlockedResourceIds(@Param("workspaceIds") java.util.Collection<Long> workspaceIds,
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"resource", "resource.floorPlan", "resource.parentRoom"})
    @Query("select b from ResourceBlockedSlotModel b where b.resource.floorPlan.workspace.id=:workspaceId and b.startTime < :to and b.endTime > :from order by b.startTime, b.id")
    List<ResourceBlockedSlotModel> findForWorkspace(@Param("workspaceId") Long workspaceId,
            @Param("from") LocalDateTime from, @Param("to") LocalDateTime to);

    @Query("""
            SELECT s FROM ResourceBlockedSlotModel s
            WHERE (s.resource.id = :resourceId OR s.resource.parentRoom.id = :resourceId
              OR s.resource.id = (SELECT r.parentRoom.id FROM BookableResourceModel r WHERE r.id = :resourceId))
              AND s.startTime < :endTime
              AND s.endTime > :startTime
            """)
    List<ResourceBlockedSlotModel> findConflictingBlockedSlots(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);

    @Query("""
            SELECT s FROM ResourceBlockedSlotModel s
            WHERE s.resource.id IN :resourceIds
              AND s.startTime < :endTime
              AND s.endTime > :startTime
            """)
    List<ResourceBlockedSlotModel> findActiveBlockedSlotsByResourceIds(
            @Param("resourceIds") List<Long> resourceIds,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);
}
