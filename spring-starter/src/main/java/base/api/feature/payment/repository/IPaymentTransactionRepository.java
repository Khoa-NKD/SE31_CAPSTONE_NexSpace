package base.api.feature.payment.repository;

import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IPaymentTransactionRepository extends JpaRepository<PaymentTransactionModel, Long>, JpaSpecificationExecutor<PaymentTransactionModel> {

    Optional<PaymentTransactionModel> findByOrderCode(Long orderCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM PaymentTransactionModel p WHERE p.orderCode = :orderCode")
    Optional<PaymentTransactionModel> findByOrderCodeForUpdate(@Param("orderCode") Long orderCode);

    List<PaymentTransactionModel> findByBookingId(Long bookingId);

    Optional<PaymentTransactionModel> findTopByBookingIdOrderByCreatedAtDesc(Long bookingId);

    Optional<PaymentTransactionModel> findTopByBookingIdAndStatus(Long bookingId, PaymentStatus status);

    List<PaymentTransactionModel> findByStatus(PaymentStatus status);

    @Query("SELECT p FROM PaymentTransactionModel p WHERE p.status = :status AND p.expiresAt < :now")
    List<PaymentTransactionModel> findExpiredTransactions(
            @Param("status") PaymentStatus status,
            @Param("now") LocalDateTime now
    );

    @Query(value = "SELECT p FROM PaymentTransactionModel p " +
            "LEFT JOIN FETCH p.booking b " +
            "LEFT JOIN FETCH b.customer " +
            "LEFT JOIN FETCH b.workspace " +
            "WHERE b.customer.id = :customerId " +
            "AND (:status IS NULL OR p.status = :status)",
            countQuery = "SELECT COUNT(p) FROM PaymentTransactionModel p WHERE p.booking.customer.id = :customerId " +
                    "AND (:status IS NULL OR p.status = :status)")
    Page<PaymentTransactionModel> findByCustomerIdAndStatus(
            @Param("customerId") Long customerId,
            @Param("status") PaymentStatus status,
            Pageable pageable
    );

    @Query(value = "SELECT p FROM PaymentTransactionModel p " +
            "LEFT JOIN FETCH p.booking b " +
            "LEFT JOIN FETCH b.customer " +
            "LEFT JOIN FETCH b.workspace w " +
            "WHERE w.id = :workspaceId AND w.organizer.id = :organizerId " +
            "AND (:status IS NULL OR p.status = :status)",
            countQuery = "SELECT COUNT(p) FROM PaymentTransactionModel p " +
                    "WHERE p.booking.workspace.id = :workspaceId AND p.booking.workspace.organizer.id = :organizerId " +
                    "AND (:status IS NULL OR p.status = :status)")
    Page<PaymentTransactionModel> findByWorkspaceIdAndOrganizerId(
            @Param("workspaceId") Long workspaceId,
            @Param("organizerId") Long organizerId,
            @Param("status") PaymentStatus status,
            Pageable pageable
    );

    @Query(value = "SELECT p FROM PaymentTransactionModel p " +
            "LEFT JOIN FETCH p.booking b " +
            "LEFT JOIN FETCH b.customer " +
            "LEFT JOIN FETCH b.workspace " +
            "WHERE (:status IS NULL OR p.status = :status) " +
            "AND (:reconciliationStatus IS NULL OR p.reconciliationStatus = :reconciliationStatus)",
            countQuery = "SELECT COUNT(p) FROM PaymentTransactionModel p " +
                    "WHERE (:status IS NULL OR p.status = :status) " +
                    "AND (:reconciliationStatus IS NULL OR p.reconciliationStatus = :reconciliationStatus)")
    Page<PaymentTransactionModel> findAllWithFilters(
            @Param("status") PaymentStatus status,
            @Param("reconciliationStatus") ReconciliationStatus reconciliationStatus,
            Pageable pageable
    );

    List<PaymentTransactionModel> findByReconciliationStatus(ReconciliationStatus reconciliationStatus);

    long countByReconciliationStatus(ReconciliationStatus reconciliationStatus);
}
