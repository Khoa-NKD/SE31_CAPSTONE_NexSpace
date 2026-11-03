package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IWorkspaceOperatingHourRepository extends JpaRepository<WorkspaceOperatingHourModel, WorkspaceOperatingHourModel.Key> {

    @Query("SELECT w FROM WorkspaceOperatingHourModel w WHERE w.workspace.id = :workspaceId ORDER BY w.id.dayOfWeek ASC")
    List<WorkspaceOperatingHourModel> findByWorkspaceIdOrderByDayOfWeekAsc(@Param("workspaceId") Long workspaceId);
}
