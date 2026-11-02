package base.api.feature.payment.repository;

import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.PaymentStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IPaymentTransactionRepository extends JpaRepository<PaymentTransactionModel, Long> {
    Optional<PaymentTransactionModel> findByOrderCode(Long orderCode);
    List<PaymentTransactionModel> findByBookingId(Long bookingId);
    List<PaymentTransactionModel> findByStatus(PaymentStatus status);
}

