package base.api.feature.payment.repository;

import base.api.shared.entity.payment.OrganizerPayoutModel;
import base.api.shared.enums.PayoutStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IOrganizerPayoutRepository extends JpaRepository<OrganizerPayoutModel, Long> {
    List<OrganizerPayoutModel> findByOrganizerId(Long organizerId);
    Page<OrganizerPayoutModel> findByStatus(PayoutStatus status, Pageable pageable);
}

