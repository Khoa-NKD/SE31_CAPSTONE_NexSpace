package base.api.feature.governance.repository;

import base.api.shared.entity.governance.SupportCaseModel;
import base.api.shared.enums.SupportCaseStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ISupportCaseRepository extends JpaRepository<SupportCaseModel, Long> {
    Optional<SupportCaseModel> findByCaseNumber(String caseNumber);
    Page<SupportCaseModel> findByCreatorId(Long creatorId, Pageable pageable);
    Page<SupportCaseModel> findByStatus(SupportCaseStatus status, Pageable pageable);
}

