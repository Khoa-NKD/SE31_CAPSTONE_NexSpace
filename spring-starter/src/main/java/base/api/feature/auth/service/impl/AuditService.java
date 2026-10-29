package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.IAuditLogRepository;
import base.api.shared.entity.AuditLogModel;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.slf4j.MDC;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class AuditService {
  private final IAuditLogRepository repository;

  public void record(UUID actor, UUID target, String action) {
    AuditLogModel log = new AuditLogModel();
    log.setUserId(actor);
    log.setActorType(actor == null ? "System" : "User");
    log.setEntityId(target);
    log.setAction(action);
    log.setRequestId(MDC.get("requestId"));
    repository.save(log);
  }
}
