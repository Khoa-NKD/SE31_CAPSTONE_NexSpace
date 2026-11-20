package base.api.feature.payment.repository;

import base.api.shared.entity.payment.OrganizerWithdrawalBatchModel;
import base.api.shared.enums.WithdrawalBatchStatus;
import base.api.shared.enums.WithdrawalType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IOrganizerWithdrawalBatchRepository extends JpaRepository<OrganizerWithdrawalBatchModel, Long> {

    Page<OrganizerWithdrawalBatchModel> findByOrganizerId(Long organizerId, Pageable pageable);

    Page<OrganizerWithdrawalBatchModel> findByOrganizerIdAndStatus(Long organizerId, WithdrawalBatchStatus status, Pageable pageable);

    Page<OrganizerWithdrawalBatchModel> findByStatus(WithdrawalBatchStatus status, Pageable pageable);

    Page<OrganizerWithdrawalBatchModel> findByPayoutType(WithdrawalType payoutType, Pageable pageable);

    Page<OrganizerWithdrawalBatchModel> findByStatusAndPayoutType(WithdrawalBatchStatus status, WithdrawalType payoutType, Pageable pageable);

    Optional<OrganizerWithdrawalBatchModel> findByBatchCode(String batchCode);
}
