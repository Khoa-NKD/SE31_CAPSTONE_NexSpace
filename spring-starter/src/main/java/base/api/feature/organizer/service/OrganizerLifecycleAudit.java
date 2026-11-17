package base.api.feature.organizer.service;

import base.api.feature.governance.repository.IAuditLogRepository;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationDetailsResponse.DocumentFeedback;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationDetailsResponse.ReviewDecision;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationDetailsResponse.ReviewDecision.Decision;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.governance.AuditLogModel;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
@Slf4j
public class OrganizerLifecycleAudit {
    public static final String MODULE = "ORGANIZER_ONBOARDING";
    public static final String ENTITY = "OrganizerProfile";
    private static final Map<String, Decision> REVIEW_ACTIONS = Map.of(
            "Organizer.Approve", Decision.APPROVED,
            "Organizer.Reject", Decision.REJECTED,
            "Organizer.RequestChanges", Decision.CHANGES_REQUESTED);
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

    public List<ReviewDecision> reviewHistory(Long profileId) {
        return records.findByModuleAndEntityTypeAndEntityIdAndActionInOrderByCreatedAtDescIdDesc(
                MODULE, ENTITY, profileId, REVIEW_ACTIONS.keySet()).stream().map(record -> {
                    var decision = REVIEW_ACTIONS.get(record.getAction());
                    var reviewer = record.getUser();
                    return new ReviewDecision(record.getId(), decision, record.getCreatedAt(),
                            reviewer == null ? null : reviewer.getFullName(), record.getReason(),
                            decision == Decision.CHANGES_REQUESTED ? documentFeedback(record) : List.of());
                }).toList();
    }

    private List<DocumentFeedback> documentFeedback(AuditLogModel record) {
        if (record.getNewValue() == null || record.getNewValue().isBlank()) return List.of();
        try {
            var feedback = new ArrayList<DocumentFeedback>();
            for (JsonNode document : mapper.readTree(record.getNewValue()).path("documents")) {
                var id = document.path("id");
                var message = document.path("feedback").textValue();
                if (id.isIntegralNumber() && id.canConvertToLong() && id.longValue() > 0
                        && "REJECTED".equals(document.path("status").asText())
                        && message != null && !message.isBlank()) {
                    feedback.add(new DocumentFeedback(id.longValue(), message));
                }
            }
            return List.copyOf(feedback);
        } catch (JsonProcessingException ex) {
            log.warn("Could not read document feedback from organizer audit event {}", record.getId());
            return List.of();
        }
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
