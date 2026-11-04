package base.api.feature.organizer.service;

import base.api.feature.governance.repository.IAuditLogRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.governance.AuditLogModel;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class OrganizerLifecycleAudit {
    public static final String MODULE = "ORGANIZER_ONBOARDING";
    public static final String ENTITY = "OrganizerProfile";
    private final IAuditLogRepository records;
    private final ObjectMapper mapper;

    public long revision(Long profileId) {
        return records.findFirstByModuleAndEntityTypeAndEntityIdOrderByIdDesc(MODULE, ENTITY, profileId)
                .map(AuditLogModel::getId).orElse(0L);
    }

    public String suspensionReason(Long profileId) {
        return records.findFirstByModuleAndActionAndEntityTypeAndEntityIdOrderByIdDesc(MODULE, "Organizer.Suspend", ENTITY, profileId)
                .map(AuditLogModel::getReason).orElse(null);
    }

    /** Audit failure must roll back the decision; the shared best-effort REQUIRES_NEW writer is unchanged. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void write(UserModel actor, Long profileId, String action, Object before, Object after, String reason) {
        var record = new AuditLogModel();
        record.setUser(actor); record.setModule(MODULE); record.setEntityType(ENTITY); record.setEntityId(profileId);
        record.setAction(action); record.setReason(reason);
        try { record.setOldValue(mapper.writeValueAsString(before)); record.setNewValue(mapper.writeValueAsString(after)); }
        catch (JsonProcessingException ex) { throw new IllegalStateException("Could not serialize organizer audit event"); }
        records.saveAndFlush(record);
    }
}
