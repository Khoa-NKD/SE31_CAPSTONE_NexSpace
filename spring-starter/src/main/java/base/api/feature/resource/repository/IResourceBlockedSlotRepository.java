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
            SELECT s FROM ResourceBlockedSlotModel s
            WHERE s.resource.id = :resourceId
              AND s.startTime < :endTime
              AND s.endTime > :startTime
            """)
    List<ResourceBlockedSlotModel> findConflictingBlockedSlots(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime);
}
