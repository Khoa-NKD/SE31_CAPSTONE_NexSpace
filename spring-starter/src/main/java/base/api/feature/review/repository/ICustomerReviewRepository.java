package base.api.feature.review.repository;

import base.api.shared.entity.review.CustomerReviewModel;
import base.api.shared.enums.ReviewStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ICustomerReviewRepository extends JpaRepository<CustomerReviewModel, Long> {
    Optional<CustomerReviewModel> findByBookingId(Long bookingId);
    Page<CustomerReviewModel> findByWorkspaceIdAndStatus(Long workspaceId, ReviewStatus status, Pageable pageable);

    @org.springframework.data.jpa.repository.Query("""
            SELECT cr.workspace.id, AVG(cr.rating), COUNT(cr.id)
            FROM CustomerReviewModel cr
            WHERE cr.workspace.id IN :workspaceIds
              AND cr.status = :status
            GROUP BY cr.workspace.id
            """)
    java.util.List<Object[]> findRatingSummariesByWorkspaceIds(
            @org.springframework.data.repository.query.Param("workspaceIds") java.util.List<Long> workspaceIds,
            @org.springframework.data.repository.query.Param("status") ReviewStatus status);
}

