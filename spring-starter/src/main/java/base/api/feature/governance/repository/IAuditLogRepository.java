package base.api.feature.governance.repository;

import base.api.shared.entity.governance.AuditLogModel;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IAuditLogRepository extends JpaRepository<AuditLogModel, Long> {
    java.util.Optional<AuditLogModel> findFirstByModuleAndEntityTypeAndEntityIdOrderByIdDesc(String module, String entityType, Long entityId);
    java.util.Optional<AuditLogModel> findFirstByModuleAndActionAndEntityTypeAndEntityIdOrderByIdDesc(String module, String action, String entityType, Long entityId);
    @EntityGraph(attributePaths = "user")
    List<AuditLogModel> findByModuleAndEntityTypeAndEntityIdAndActionInOrderByCreatedAtDescIdDesc(
            String module, String entityType, Long entityId, Collection<String> actions);
    Page<AuditLogModel> findByEntityTypeAndEntityId(String entityType, Long entityId, Pageable pageable);
    Page<AuditLogModel> findByUserId(Long userId, Pageable pageable);
    Page<AuditLogModel> findByModule(String module, Pageable pageable);
}

