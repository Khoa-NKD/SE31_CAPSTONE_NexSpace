package base.api.feature.payment.repository;

import base.api.shared.entity.payment.OrganizerPayoutSettingModel;
import base.api.shared.enums.PayoutApprovalStatus;
import base.api.shared.enums.PayoutMode;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IOrganizerPayoutSettingRepository extends JpaRepository<OrganizerPayoutSettingModel, Long> {

    Optional<OrganizerPayoutSettingModel> findByOrganizerId(Long organizerId);

    Page<OrganizerPayoutSettingModel> findByApprovalStatusIn(List<PayoutApprovalStatus> statuses, Pageable pageable);

    List<OrganizerPayoutSettingModel> findByPayoutModeAndApprovalStatusAndAutoPayoutHour(
            PayoutMode payoutMode,
            PayoutApprovalStatus approvalStatus,
            int autoPayoutHour
    );
}
