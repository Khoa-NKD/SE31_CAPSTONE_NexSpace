package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

/** The schedule is an overlay: cancelling it never changes manual activation flags. */
@Getter @Setter @Entity @Table(name = "maintenance_group")
public class MaintenanceGroupModel extends BaseModel {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private WorkspaceModel workspace;
    @Column(nullable = false) private boolean wholeWorkspace;
    @Column(nullable = false) private LocalDateTime startTime;
    @Column(nullable = false) private LocalDateTime endTime;
    @Column(nullable = false, length = 255) private String reason;
    @Column(nullable = false) private boolean cancelled;
    @Column(columnDefinition = "LONGTEXT", nullable = false) private String memberKeys;
}
