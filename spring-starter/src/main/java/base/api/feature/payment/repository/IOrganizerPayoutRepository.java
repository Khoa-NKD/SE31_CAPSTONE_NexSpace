package base.api.feature.payment.repository;

import base.api.shared.entity.payment.OrganizerPayoutModel;
import base.api.shared.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IOrganizerPayoutRepository extends JpaRepository<OrganizerPayoutModel, Long> {

    List<OrganizerPayoutModel> findByOrganizerId(Long organizerId);

    Page<OrganizerPayoutModel> findByOrganizerId(Long organizerId, Pageable pageable);

    List<OrganizerPayoutModel> findByOrganizerIdAndStatus(Long organizerId, PayoutStatus status);

    List<OrganizerPayoutModel> findByOrganizerIdAndStatusAndWithdrawalBatchIsNull(Long organizerId, PayoutStatus status);

    List<OrganizerPayoutModel> findByStatusAndEligibleAtBefore(PayoutStatus status, LocalDateTime eligibleAt);

    Optional<OrganizerPayoutModel> findByBookingId(Long bookingId);

    Page<OrganizerPayoutModel> findByStatus(PayoutStatus status, Pageable pageable);

    List<OrganizerPayoutModel> findByWithdrawalBatchId(Long withdrawalBatchId);
}
