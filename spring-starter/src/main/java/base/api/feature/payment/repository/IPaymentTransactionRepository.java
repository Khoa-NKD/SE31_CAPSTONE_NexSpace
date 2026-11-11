package base.api.feature.payment.repository;

import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.PaymentStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IPaymentTransactionRepository extends JpaRepository<PaymentTransactionModel, Long> {

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
}
