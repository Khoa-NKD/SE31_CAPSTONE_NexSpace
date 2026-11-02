package base.api.feature.governance.service;

import base.api.shared.entity.UserModel;
import base.api.shared.enums.AuditActorType;

/**
 * Service ghi log thao tác nhạy cảm (duyệt, từ chối, khoá, huỷ, hoàn tiền, đổi cấu hình) theo BR-31 và API_RULES.md.
 */
public interface IAuditService {

    void log(
            UserModel user,
            AuditActorType actorType,
            String module,
            String action,
            String entityType,
            Long entityId,
            String oldValue,
            String newValue,
            String reason,
            String ipAddress
    );

    void log(
            UserModel user,
            String module,
            String action,
            String entityType,
            Long entityId,
            String reason
    );
}

