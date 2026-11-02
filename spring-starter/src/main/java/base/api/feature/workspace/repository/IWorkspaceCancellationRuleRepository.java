package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.WorkspaceCancellationRuleModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IWorkspaceCancellationRuleRepository extends JpaRepository<WorkspaceCancellationRuleModel, Long> {
    List<WorkspaceCancellationRuleModel> findByWorkspaceIdOrderByHoursBeforeCheckinDesc(Long workspaceId);
}

