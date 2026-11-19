package base.api.feature.payment.repository;

import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.RefundStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

@Repository
public interface IRefundRequestRepository extends JpaRepository<RefundRequestModel, Long> {

    List<RefundRequestModel> findByBookingId(Long bookingId);

    List<RefundRequestModel> findByBookingIdIn(java.util.Collection<Long> bookingIds);

    Optional<RefundRequestModel> findTopByBookingIdOrderByCreatedAtDesc(Long bookingId);

    Page<RefundRequestModel> findByStatus(RefundStatus status, Pageable pageable);

    @Query("SELECT r FROM RefundRequestModel r " +
            "LEFT JOIN FETCH r.booking b " +
            "LEFT JOIN FETCH b.customer " +
            "LEFT JOIN FETCH b.workspace " +
            "LEFT JOIN FETCH b.resource " +
            "WHERE r.booking.id = :bookingId ORDER BY r.createdAt DESC")
    List<RefundRequestModel> findByBookingIdWithDetails(@Param("bookingId") Long bookingId);

    @Query("SELECT r FROM RefundRequestModel r " +
            "LEFT JOIN FETCH r.booking b " +
            "LEFT JOIN FETCH b.customer " +
            "LEFT JOIN FETCH b.workspace " +
            "LEFT JOIN FETCH b.resource " +
            "LEFT JOIN FETCH r.paymentTransaction " +
            "LEFT JOIN FETCH r.reviewedBy " +
            "WHERE r.id = :id")
    Optional<RefundRequestModel> findByIdWithDetails(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT r FROM RefundRequestModel r WHERE r.id = :id")
    Optional<RefundRequestModel> findByIdForUpdate(@Param("id") Long id);

    @Query(value = "SELECT r FROM RefundRequestModel r " +
            "JOIN r.booking b " +
            "LEFT JOIN b.customer c " +
            "LEFT JOIN b.workspace w " +
            "WHERE (:status IS NULL OR r.status = :status) " +
            "AND (:workspaceId IS NULL OR w.id = :workspaceId) " +
            "AND (:search IS NULL OR :search = '' OR " +
            "     LOWER(CONCAT(COALESCE(c.firstName, ''), ' ', COALESCE(c.lastName, ''))) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(r.reason) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     CAST(b.id AS string) LIKE CONCAT('%', :search, '%') OR " +
            "     CAST(r.id AS string) LIKE CONCAT('%', :search, '%'))",
            countQuery = "SELECT COUNT(r) FROM RefundRequestModel r " +
            "JOIN r.booking b " +
            "LEFT JOIN b.customer c " +
            "LEFT JOIN b.workspace w " +
            "WHERE (:status IS NULL OR r.status = :status) " +
            "AND (:workspaceId IS NULL OR w.id = :workspaceId) " +
            "AND (:search IS NULL OR :search = '' OR " +
            "     LOWER(CONCAT(COALESCE(c.firstName, ''), ' ', COALESCE(c.lastName, ''))) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(c.email) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(r.reason) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     CAST(b.id AS string) LIKE CONCAT('%', :search, '%') OR " +
            "     CAST(r.id AS string) LIKE CONCAT('%', :search, '%'))")
    Page<RefundRequestModel> searchAdminRefunds(
            @Param("status") RefundStatus status,
            @Param("workspaceId") Long workspaceId,
            @Param("search") String search,
            Pageable pageable);

    long countByStatus(RefundStatus status);

    @Query("SELECT COALESCE(SUM(r.requestedAmount), 0) FROM RefundRequestModel r WHERE r.status = :status")
    BigDecimal sumRequestedAmountByStatus(@Param("status") RefundStatus status);

    @Query("SELECT COALESCE(SUM(r.approvedAmount), 0) FROM RefundRequestModel r WHERE r.status = :status")
    BigDecimal sumApprovedAmountByStatus(@Param("status") RefundStatus status);
}

