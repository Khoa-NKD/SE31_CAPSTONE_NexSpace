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
        @UniqueConstraint(name = "ux_floor_plan_workspace_floor", columnNames = {"workspace_id", "floor_number"}),
        @UniqueConstraint(name = "ux_floor_plan_workspace_physical", columnNames = {"workspace_id", "building_floor_id"})
})
public class FloorPlanModel extends BaseModel {
    @Column(name = "usage_x_m", precision = 16, scale = 6)
    private java.math.BigDecimal usageXM;
    @Column(name = "usage_y_m", precision = 16, scale = 6)
    private java.math.BigDecimal usageYM;
    @Column(name = "usage_width_m", precision = 16, scale = 6)
    private java.math.BigDecimal usageWidthM;
    @Column(name = "usage_length_m", precision = 16, scale = 6)
    private java.math.BigDecimal usageLengthM;
    @Column(name = "published_geometry_json", columnDefinition = "LONGTEXT")
    private String publishedGeometryJson;
    @Column(name = "published_location_json", columnDefinition = "LONGTEXT")
    private String publishedLocationJson;
    @Column(name = "legacy_geometry_json", columnDefinition = "LONGTEXT")
    private String legacyGeometryJson;
    @Column(name = "ai_draft_json", columnDefinition = "LONGTEXT")
    private String aiDraftJson;

    private boolean metric() { return buildingFloor != null && buildingFloor.getGeometryVersion() >= 2; }
    public java.math.BigDecimal getUsageX() { return metric() && usageXM != null ? MetricGeometry.pixels(usageXM) : usageX; }
    public java.math.BigDecimal getUsageY() { return metric() && usageYM != null ? MetricGeometry.pixels(usageYM) : usageY; }
    public java.math.BigDecimal getUsageWidth() { return metric() && usageWidthM != null ? MetricGeometry.pixels(usageWidthM) : usageWidth; }
    public java.math.BigDecimal getUsageHeight() { return metric() && usageLengthM != null ? MetricGeometry.pixels(usageLengthM) : usageHeight; }
    public void setUsageX(java.math.BigDecimal value) { usageX = value; if (metric()) usageXM = MetricGeometry.metres(value); }
    public void setUsageY(java.math.BigDecimal value) { usageY = value; if (metric()) usageYM = MetricGeometry.metres(value); }
    public void setUsageWidth(java.math.BigDecimal value) { usageWidth = value; if (metric()) usageWidthM = MetricGeometry.metres(value); }
    public void setUsageHeight(java.math.BigDecimal value) { usageHeight = value; if (metric()) usageLengthM = MetricGeometry.metres(value); }

    @Column(name = "occupancy_limit")
    private Integer occupancyLimit;


    /** NULL only for retained layouts that have not been explicitly mapped yet. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "building_floor_id")
    private BuildingFloorModel buildingFloor;

    @Column(name = "usage_x", precision = 10, scale = 2)
    private java.math.BigDecimal usageX;

    @Column(name = "usage_y", precision = 10, scale = 2)
    private java.math.BigDecimal usageY;

    @Column(name = "usage_width", precision = 10, scale = 2)
    private java.math.BigDecimal usageWidth;

    @Column(name = "usage_height", precision = 10, scale = 2)
    private java.math.BigDecimal usageHeight;

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
