package base.api.feature.review.repository;

import base.api.shared.entity.review.ReviewReactionModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Collection;
import java.util.List;

@Repository
public interface IReviewReactionRepository extends JpaRepository<ReviewReactionModel, ReviewReactionModel.Key> {

    long countByIdReviewId(Long reviewId);

    boolean existsByIdReviewIdAndIdCustomerId(Long reviewId, Long customerId);

    void deleteByIdReviewIdAndIdCustomerId(Long reviewId, Long customerId);

    @Query("""
            SELECT rr.id.reviewId, COUNT(rr)
            FROM ReviewReactionModel rr
            WHERE rr.id.reviewId IN :reviewIds
            GROUP BY rr.id.reviewId
            """)
    List<Object[]> countReactionsByReviewIds(@Param("reviewIds") Collection<Long> reviewIds);

    @Query("""
            SELECT rr.id.reviewId
            FROM ReviewReactionModel rr
            WHERE rr.id.reviewId IN :reviewIds
              AND rr.id.customerId = :customerId
            """)
    List<Long> findReactedReviewIdsByCustomer(
            @Param("reviewIds") Collection<Long> reviewIds,
            @Param("customerId") Long customerId);
}
