package base.api.feature.payment.repository;

import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.RefundSource;
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

    List<RefundRequestModel> findByPaymentTransactionId(Long paymentTransactionId);

    Optional<RefundRequestModel> findTopByBookingIdOrderByCreatedAtDesc(Long bookingId);

    Page<RefundRequestModel> findByStatus(RefundStatus status, Pageable pageable);

    @Query("SELECT r FROM RefundRequestModel r " +
            "LEFT JOIN FETCH r.booking b " +
            "LEFT JOIN FETCH b.customer " +
            "LEFT JOIN FETCH b.workspace " +
            "LEFT JOIN FETCH b.resource " +
            "LEFT JOIN FETCH r.paymentTransaction " +
            "LEFT JOIN FETCH r.reviewedBy " +
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

    @Query("SELECT r FROM RefundRequestModel r " +
            "JOIN FETCH r.booking b " +
            "JOIN FETCH b.customer c " +
            "LEFT JOIN FETCH b.workspace " +
            "LEFT JOIN FETCH b.resource " +
            "LEFT JOIN FETCH r.paymentTransaction " +
            "LEFT JOIN FETCH r.reviewedBy " +
            "WHERE c.id = :customerId ORDER BY r.createdAt DESC")
    List<RefundRequestModel> findAllByCustomerIdWithDetails(@Param("customerId") Long customerId);

    @Query(value = "SELECT r FROM RefundRequestModel r " +
            "JOIN FETCH r.booking b " +
            "JOIN FETCH b.customer c " +
            "LEFT JOIN FETCH b.workspace w " +
            "LEFT JOIN FETCH b.resource res " +
            "LEFT JOIN FETCH r.paymentTransaction tx " +
            "LEFT JOIN FETCH r.reviewedBy " +
            "WHERE c.id = :customerId " +
            "AND (:status IS NULL OR r.status = :status) " +
            "AND (:source IS NULL OR r.source = :source) " +
            "AND (:search IS NULL OR :search = '' OR " +
            "     LOWER(COALESCE(b.bookingCode, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(w.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(res.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(r.reason, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(r.refundReference, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     CAST(r.id AS string) LIKE CONCAT('%', :search, '%'))",
            countQuery = "SELECT COUNT(r) FROM RefundRequestModel r " +
            "JOIN r.booking b " +
            "JOIN b.customer c " +
            "LEFT JOIN b.workspace w " +
            "LEFT JOIN b.resource res " +
            "WHERE c.id = :customerId " +
            "AND (:status IS NULL OR r.status = :status) " +
            "AND (:source IS NULL OR r.source = :source) " +
            "AND (:search IS NULL OR :search = '' OR " +
            "     LOWER(COALESCE(b.bookingCode, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(w.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(res.name, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(r.reason, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     LOWER(COALESCE(r.refundReference, '')) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
            "     CAST(r.id AS string) LIKE CONCAT('%', :search, '%'))")
    Page<RefundRequestModel> searchCustomerRefunds(
            @Param("customerId") Long customerId,
            @Param("status") RefundStatus status,
            @Param("source") RefundSource source,
            @Param("search") String search,
            Pageable pageable);

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
