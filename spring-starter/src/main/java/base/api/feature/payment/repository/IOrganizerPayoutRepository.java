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

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    List<OrganizerPayoutModel> findByStatusAndEligibleAtBefore(PayoutStatus status, LocalDateTime eligibleAt);

    Optional<OrganizerPayoutModel> findByBookingId(Long bookingId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from OrganizerPayoutModel p where p.booking.id=:bookingId")
    Optional<OrganizerPayoutModel> findByBookingIdForUpdate(@org.springframework.data.repository.query.Param("bookingId") Long bookingId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from OrganizerPayoutModel p where p.organizer.id=:organizerId and p.status=base.api.shared.enums.PayoutStatus.RELEASED and p.withdrawalBatch is null and not exists (select r.id from RefundRequestModel r where r.booking.id=p.booking.id and r.status=base.api.shared.enums.RefundStatus.PENDING) order by p.id")
    List<OrganizerPayoutModel> findWithdrawableForUpdate(@org.springframework.data.repository.query.Param("organizerId") Long organizerId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("select p from OrganizerPayoutModel p where p.organizer.id=:organizerId and p.status=base.api.shared.enums.PayoutStatus.HELD order by p.id")
    List<OrganizerPayoutModel> findHeldForUpdate(@org.springframework.data.repository.query.Param("organizerId") Long organizerId);

    Page<OrganizerPayoutModel> findByStatus(PayoutStatus status, Pageable pageable);

    List<OrganizerPayoutModel> findByWithdrawalBatchId(Long withdrawalBatchId);
}
