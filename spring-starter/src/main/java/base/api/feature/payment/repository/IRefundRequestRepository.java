package base.api.feature.payment.repository;

import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.enums.RefundStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IRefundRequestRepository extends JpaRepository<RefundRequestModel, Long> {
    List<RefundRequestModel> findByBookingId(Long bookingId);
    Page<RefundRequestModel> findByStatus(RefundStatus status, Pageable pageable);
}

