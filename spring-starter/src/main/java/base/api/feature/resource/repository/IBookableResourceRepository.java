package base.api.feature.resource.repository;

import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.BookableResourceStatus;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IBookableResourceRepository
        extends JpaRepository<BookableResourceModel, Long>,
                org.springframework.data.jpa.repository.JpaSpecificationExecutor<
                        BookableResourceModel> {
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"resourceType", "floorPlan", "parentRoom"})
    List<BookableResourceModel> findByFloorPlanWorkspaceId(Long workspaceId);
    @org.springframework.data.jpa.repository.EntityGraph(
            attributePaths = {"resourceType", "parentRoom", "parentRoom.resourceType"})
    List<BookableResourceModel> findByFloorPlanId(Long floorPlanId);

    boolean existsByFloorPlanId(Long floorPlanId);

    @org.springframework.data.jpa.repository.EntityGraph(
            attributePaths = {"resourceType", "floorPlan"})
    List<BookableResourceModel> findByParentRoomId(Long parentRoomId);

    @org.springframework.data.jpa.repository.EntityGraph(
            attributePaths = {"resourceType", "floorPlan"})
    List<BookableResourceModel> findByFloorPlanWorkspaceIdAndResourceTypeCategoryAndStatusNot(
            Long workspaceId,
            base.api.shared.enums.ResourceCategory category,
            BookableResourceStatus status);

    @org.springframework.data.jpa.repository.EntityGraph(
            attributePaths = {"resourceType", "floorPlan"})
    List<BookableResourceModel> findByFloorPlanWorkspaceIdAndStatusNot(
            Long workspaceId,
            BookableResourceStatus status);

    @org.springframework.data.jpa.repository.Query("""
            SELECT r FROM BookableResourceModel r
            WHERE r.floorPlan.workspace.id IN :workspaceIds
              AND r.status = :status
            """)
    @org.springframework.data.jpa.repository.EntityGraph(attributePaths={"resourceType", "floorPlan.workspace", "parentRoom"})
    List<BookableResourceModel> findByFloorPlanWorkspaceIdInAndStatus(
            @org.springframework.data.repository.query.Param("workspaceIds") java.util.Collection<Long> workspaceIds,
            @org.springframework.data.repository.query.Param("status") BookableResourceStatus status);

    default List<BookableResourceModel> findAvailableResourcesByWorkspaceIds(java.util.Collection<Long> workspaceIds) {
        if (workspaceIds == null || workspaceIds.isEmpty()) {
            return java.util.Collections.emptyList();
        }
        return findByFloorPlanWorkspaceIdInAndStatus(workspaceIds, BookableResourceStatus.ACTIVE);
    }

    List<BookableResourceModel> findByFloorPlanIdAndStatus(
            Long floorPlanId, BookableResourceStatus status);

    @org.springframework.data.jpa.repository.EntityGraph(
            attributePaths = {"floorPlan", "floorPlan.workspace", "resourceType", "parentRoom"})
    org.springframework.data.domain.Page<BookableResourceModel> findAll(
            org.springframework.data.jpa.domain.Specification<BookableResourceModel> spec,
            org.springframework.data.domain.Pageable pageable);

    @org.springframework.data.jpa.repository.EntityGraph(
            attributePaths = {"floorPlan", "floorPlan.workspace", "resourceType", "parentRoom"})
    @org.springframework.data.jpa.repository.Query(
            "select r from BookableResourceModel r where r.id = :id")
    java.util.Optional<BookableResourceModel> findDetailedById(
            @org.springframework.data.repository.query.Param("id") Long id);

    @org.springframework.data.jpa.repository.Lock(
            jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query(
            "select r from BookableResourceModel r where r.id = :id")
    java.util.Optional<BookableResourceModel> findByIdForUpdate(
            @org.springframework.data.repository.query.Param("id") Long id);

    boolean existsByFloorPlanIdAndLabelIgnoreCaseAndIdNot(Long floorPlanId, String label, Long id);

    @org.springframework.data.jpa.repository.Query("""
            SELECT r.floorPlan.workspace.id, MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
            FROM BookableResourceModel r
            WHERE r.floorPlan.workspace.id IN :workspaceIds
              AND r.status = :status
              AND r.parentRoom IS NULL
            GROUP BY r.floorPlan.workspace.id
            """)
    List<Object[]> findMinPricePerHourByWorkspaceIds(
            @org.springframework.data.repository.query.Param("workspaceIds") List<Long> workspaceIds,
            @org.springframework.data.repository.query.Param("status") BookableResourceStatus status);

    @org.springframework.data.jpa.repository.Query("""
            SELECT r FROM BookableResourceModel r
            JOIN FETCH r.resourceType rt
            JOIN FETCH r.floorPlan fp
            LEFT JOIN FETCH r.parentRoom pr
            WHERE fp.workspace.id = :workspaceId
              AND (:floorPlanId IS NULL OR fp.id = :floorPlanId)
              AND rt.category = :category
              AND r.status <> :excludedStatus
            ORDER BY r.label ASC
            """)
    List<BookableResourceModel> findDeskResourcesForAvailability(
            @org.springframework.data.repository.query.Param("workspaceId") Long workspaceId,
            @org.springframework.data.repository.query.Param("floorPlanId") Long floorPlanId,
            @org.springframework.data.repository.query.Param("category") base.api.shared.enums.ResourceCategory category,
            @org.springframework.data.repository.query.Param("excludedStatus") BookableResourceStatus excludedStatus
    );

    @org.springframework.data.jpa.repository.Query("""
            SELECT r FROM BookableResourceModel r
            JOIN FETCH r.resourceType rt
            JOIN FETCH r.floorPlan fp
            WHERE fp.workspace.id = :workspaceId
              AND (:floorPlanId IS NULL OR fp.id = :floorPlanId)
              AND rt.category = :category
              AND (:minCapacity IS NULL OR COALESCE(r.capacityOverride, rt.capacity) >= :minCapacity)
              AND r.status <> :excludedStatus
            ORDER BY r.label ASC
            """)
    List<BookableResourceModel> findRoomResourcesForAvailability(
            @org.springframework.data.repository.query.Param("workspaceId") Long workspaceId,
            @org.springframework.data.repository.query.Param("floorPlanId") Long floorPlanId,
            @org.springframework.data.repository.query.Param("category") base.api.shared.enums.ResourceCategory category,
            @org.springframework.data.repository.query.Param("minCapacity") Integer minCapacity,
            @org.springframework.data.repository.query.Param("excludedStatus") BookableResourceStatus excludedStatus
    );

    @org.springframework.data.jpa.repository.Query("""
            SELECT r FROM BookableResourceModel r
            JOIN FETCH r.resourceType rt
            WHERE r.parentRoom.id IN :roomIds
              AND r.status <> :excludedStatus
            """)
    List<BookableResourceModel> findChildDesksByRoomIds(
            @org.springframework.data.repository.query.Param("roomIds") java.util.Collection<Long> roomIds,
            @org.springframework.data.repository.query.Param("excludedStatus") BookableResourceStatus excludedStatus
    );
}
