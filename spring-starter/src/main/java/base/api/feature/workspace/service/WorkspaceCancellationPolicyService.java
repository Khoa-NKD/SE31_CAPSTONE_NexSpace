package base.api.feature.workspace.service;

import base.api.feature.workspace.dto.response.CancellationRuleDto;
import base.api.feature.workspace.repository.IWorkspaceCancellationRuleRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.workspace.WorkspaceCancellationRuleModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.exception.NotFoundException;
import java.util.List;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class WorkspaceCancellationPolicyService {
    private final IWorkspaceCancellationRuleRepository rules;
    private final IWorkspaceRepository workspaces;

    @Transactional(readOnly = true)
    public List<CancellationRuleDto> getRules(Long workspaceId) {
        return CancellationPolicies.effective(rules.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(workspaceId));
    }

    /** Serialize replacement per workspace and flush deletes before reusing unique hour thresholds. */
    @Transactional
    public void save(Long actorId, WorkspaceModel workspace, List<CancellationRuleDto> requested) {
        var checked = requested == null ? null : CancellationPolicies.validate(requested);
        var owned = workspaces.lockOwnedPolicy(workspace.getId(), actorId)
                .orElseThrow(() -> new NotFoundException("Không gian không tồn tại hoặc không thuộc quyền quản lý."));
        var existing = rules.findByWorkspaceIdOrderByMinHoursBeforeStartDesc(owned.getId());
        if (requested == null && !existing.isEmpty()) return;
        if (checked == null) checked = CancellationPolicies.defaults();
        rules.deleteAll(existing);
        rules.flush();
        rules.saveAll(checked.stream().map(item -> {
            var row = new WorkspaceCancellationRuleModel();
            row.setWorkspace(owned);
            row.setMinHoursBeforeStart(item.minHoursBeforeStart().intValueExact());
            row.setRefundPercent(item.refundPercent());
            return row;
        }).toList());
    }
}
