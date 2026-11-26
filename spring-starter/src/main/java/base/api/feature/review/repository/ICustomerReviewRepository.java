package base.api.feature.review.repository;

import base.api.shared.entity.review.CustomerReviewModel;
import base.api.shared.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ICustomerReviewRepository extends JpaRepository<CustomerReviewModel, Long> {
    Optional<CustomerReviewModel> findByBookingId(Long bookingId);
    Page<CustomerReviewModel> findByWorkspaceIdAndStatus(Long workspaceId, ReviewStatus status, Pageable pageable);

    @Query("""
            SELECT cr.workspace.id, AVG(cr.rating), COUNT(cr.id)
            FROM CustomerReviewModel cr
            WHERE cr.workspace.id IN :workspaceIds
              AND cr.status = :status
            GROUP BY cr.workspace.id
            """)
    List<Object[]> findRatingSummariesByWorkspaceIds(
            @Param("workspaceIds") List<Long> workspaceIds,
            @Param("status") ReviewStatus status);

    @Query(
            value = """
                SELECT cr FROM CustomerReviewModel cr
                JOIN FETCH cr.booking b
                JOIN FETCH b.customer u
                LEFT JOIN FETCH b.resource r
                WHERE cr.workspace.id = :workspaceId
                  AND cr.status = :status
                  AND (:resourceId IS NULL OR b.resource.id = :resourceId)
                ORDER BY cr.createdAt DESC
            """,
            countQuery = """
                SELECT count(cr) FROM CustomerReviewModel cr
                JOIN cr.booking b
                WHERE cr.workspace.id = :workspaceId
                  AND cr.status = :status
                  AND (:resourceId IS NULL OR b.resource.id = :resourceId)
            """)
    Page<CustomerReviewModel> findByWorkspaceIdAndOptionalResourceIdAndStatus(
            @Param("workspaceId") Long workspaceId,
            @Param("resourceId") Long resourceId,
            @Param("status") ReviewStatus status,
            Pageable pageable);

    @Query("""
            SELECT cr FROM CustomerReviewModel cr
            JOIN FETCH cr.booking b
            JOIN FETCH b.customer u
            LEFT JOIN FETCH b.resource r
            WHERE cr.workspace.id = :workspaceId
              AND cr.status = :status
            ORDER BY cr.createdAt DESC
            """)
    List<CustomerReviewModel> findAllPublishedByWorkspaceId(
            @Param("workspaceId") Long workspaceId,
            @Param("status") ReviewStatus status);

    long countByWorkspaceIdAndStatus(Long workspaceId, ReviewStatus status);
}
