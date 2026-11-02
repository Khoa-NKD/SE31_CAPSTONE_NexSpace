package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.governance.SupportCaseModel;
import base.api.shared.entity.resource.ResourceBlockedSlotModel;
import base.api.shared.enums.MaintenanceStatus;
import base.api.shared.enums.MaintenanceType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Lịch sử báo hỏng / bảo trì của 1 tài sản.
 * supportCase: khách báo hỏng qua khiếu nại; blockedSlot: lịch khoá chỗ trong lúc sửa.
 */
@Getter
@Setter
@Entity
@Table(name = "asset_maintenance_log", indexes = {
        @Index(name = "ix_asset_maintenance_log_asset", columnList = "asset_id, created_at"),
        @Index(name = "ix_asset_maintenance_log_status", columnList = "status, scheduled_at")
})
@Check(name = "ck_aml_period", constraints = "completed_at IS NULL OR started_at IS NULL OR completed_at >= started_at")
public class AssetMaintenanceLogModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "asset_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private WorkspaceAssetModel asset;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "maintenance_type", nullable = false, length = 20)
    private MaintenanceType maintenanceType;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private MaintenanceStatus status = MaintenanceStatus.SCHEDULED;

    /** Mô tả sự cố / công việc. */
    @Column(nullable = false, length = 1000)
    private String description;

    /** Người báo / tạo lịch (NULL = hệ thống tạo theo lịch định kỳ). */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reported_by")
    private UserModel reportedBy;

    /** Kỹ thuật viên hoặc đơn vị sửa chữa bên ngoài. */
    @Column(name = "performed_by", length = 100)
    private String performedBy;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_case_id")
    private SupportCaseModel supportCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "blocked_slot_id")
    private ResourceBlockedSlotModel blockedSlot;

    @Column(precision = 18, scale = 2)
    private BigDecimal cost;

    @Column(name = "scheduled_at")
    private LocalDateTime scheduledAt;

    @Column(name = "started_at")
    private LocalDateTime startedAt;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    /** Kết quả xử lý / ghi chú sau khi xong. */
    @Column(name = "result_note", length = 1000)
    private String resultNote;
}
