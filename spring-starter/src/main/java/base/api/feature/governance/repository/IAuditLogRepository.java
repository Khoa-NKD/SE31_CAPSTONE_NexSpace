package base.api.feature.governance.repository;

import base.api.shared.entity.governance.AuditLogModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IAuditLogRepository extends JpaRepository<AuditLogModel, Long> {
    Page<AuditLogModel> findByEntityTypeAndEntityId(String entityType, Long entityId, Pageable pageable);
    Page<AuditLogModel> findByUserId(Long userId, Pageable pageable);
    Page<AuditLogModel> findByModule(String module, Pageable pageable);
}

