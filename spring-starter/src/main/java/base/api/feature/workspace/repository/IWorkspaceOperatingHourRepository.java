package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IWorkspaceOperatingHourRepository extends JpaRepository<WorkspaceOperatingHourModel, Long> {
    List<WorkspaceOperatingHourModel> findByWorkspaceIdOrderByDayOfWeekAsc(Long workspaceId);
}

