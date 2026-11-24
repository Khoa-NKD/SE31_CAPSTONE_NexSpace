package base.api.feature.workspace.service;

import base.api.shared.entity.workspace.MaintenanceGroupModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class WorkspaceMaintenanceStateTest {
    private MaintenanceGroupModel group(LocalDateTime start, LocalDateTime end, boolean whole) {
        var group = new MaintenanceGroupModel(); group.setStartTime(start); group.setEndTime(end); group.setWholeWorkspace(whole); return group;
    }
    @Test void futureAndPartialSchedulesNeverPauseWorkspace() {
        var workspace = new WorkspaceModel(); workspace.setStatus(WorkspaceStatus.ACTIVE);
        var now = LocalDateTime.now();
        workspace.setMaintenanceGroups(List.of(group(now.plusDays(1),now.plusDays(2),true),group(now.minusDays(1),now.plusDays(1),false)));
        assertThat(workspace.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
    }
    @Test void overlaysRestoreBaseStateAndDoNotBypassAdminSuspension() {
        var workspace = new WorkspaceModel(); workspace.setStatus(WorkspaceStatus.ACTIVE);
        var now = LocalDateTime.now(); var group = group(now.minusDays(1),now.plusDays(1),true);
        workspace.setMaintenanceGroups(List.of(group));
        assertThat(workspace.getStatus()).isEqualTo(WorkspaceStatus.MAINTENANCE);
        assertThat(workspace.getBaseStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        group.setCancelled(true);
        assertThat(workspace.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        group.setCancelled(false); group.setEndTime(now.minusHours(1));
        assertThat(workspace.getStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        group.setEndTime(now.plusDays(1)); workspace.setStatus(WorkspaceStatus.DRAFT);
        assertThat(workspace.getStatus()).isEqualTo(WorkspaceStatus.DRAFT);
        workspace.setStatus(WorkspaceStatus.SUSPENDED);
        assertThat(workspace.getStatus()).isEqualTo(WorkspaceStatus.SUSPENDED);
    }
}
