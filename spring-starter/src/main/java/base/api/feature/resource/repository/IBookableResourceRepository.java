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
}
