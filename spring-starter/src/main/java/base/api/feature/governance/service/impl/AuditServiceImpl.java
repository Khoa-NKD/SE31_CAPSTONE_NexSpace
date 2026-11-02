package base.api.feature.governance.service.impl;

import base.api.feature.governance.repository.IAuditLogRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.governance.AuditLogModel;
import base.api.shared.enums.AuditActorType;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuditServiceImpl implements IAuditService {

    private final IAuditLogRepository auditLogRepository;

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(
            UserModel user,
            AuditActorType actorType,
            String module,
            String action,
            String entityType,
            Long entityId,
            String oldValue,
            String newValue,
            String reason,
            String ipAddress) {
        try {
            AuditLogModel record = new AuditLogModel();
            record.setUser(user);
            record.setActorType(actorType != null ? actorType : (user != null ? AuditActorType.USER : AuditActorType.SYSTEM));
            record.setModule(module);
            record.setAction(action);
            record.setEntityType(entityType);
            record.setEntityId(entityId);
            record.setOldValue(oldValue);
            record.setNewValue(newValue);
            record.setReason(reason);
            record.setIpAddress(ipAddress);

            auditLogRepository.save(record);
        } catch (Exception e) {
            log.error("Failed to write audit log for action {}: {}", action, e.getMessage(), e);
        }
    }

    @Override
    @Transactional(propagation = Propagation.REQUIRES_NEW)
    public void log(UserModel user, String module, String action, String entityType, Long entityId, String reason) {
        log(user, null, module, action, entityType, entityId, null, null, reason, null);
    }
}

