package base.api.feature.auth.repository;

import base.api.shared.entity.AuditLogModel;
import java.util.UUID;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IAuditLogRepository extends JpaRepository<AuditLogModel, UUID> {}
