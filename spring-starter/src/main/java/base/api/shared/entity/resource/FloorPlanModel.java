package base.api.shared.entity.resource;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.FloorPlanStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Sơ đồ tầng. Floor_Section (v3.4) nằm trong layoutJson; tên khu & độ ồn gắn trên Bookable_Resource.
 */
@Getter
@Setter
@Entity
@Table(name = "floor_plan", uniqueConstraints = {
        @UniqueConstraint(name = "ux_floor_plan_workspace_floor", columnNames = {"workspace_id", "floor_number"})
})
public class FloorPlanModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private WorkspaceModel workspace;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "floor_number", nullable = false)
    private int floorNumber;

    /** Ảnh bản vẽ nền. */
    @Column(name = "background_url", length = 500)
    private String backgroundUrl;

    /** Bản đã publish: kích thước canvas, tỉ lệ, tường/cửa, polygon các khu vực. */
    @Column(name = "layout_json", columnDefinition = "LONGTEXT")
    private String layoutJson;

    /** Bản đang chỉnh sửa. */
    @Column(name = "draft_layout_json", columnDefinition = "LONGTEXT")
    private String draftLayoutJson;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private FloorPlanStatus status = FloorPlanStatus.DRAFT;

    /** Tăng mỗi lần publish (BR-08/09). */
    @Column(nullable = false)
    private int version = 1;

    @Column(name = "published_at")
    private LocalDateTime publishedAt;
}
