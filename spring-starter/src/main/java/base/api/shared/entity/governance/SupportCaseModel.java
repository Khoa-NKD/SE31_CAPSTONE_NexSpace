package base.api.shared.entity.governance;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.enums.SupportCaseCategory;
import base.api.shared.enums.SupportCasePriority;
import base.api.shared.enums.SupportCaseStatus;
import base.api.shared.enums.SupportCaseType;
import base.api.shared.enums.SupportTargetEntity;
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
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Khiếu nại / báo cáo / cảnh báo hệ thống. targetId là tham chiếu đa hình, kiểm tra ở backend.
 * Hạn SLA = createdAt + số giờ theo priority (Platform_Setting). Payout FROZEN chỉ mở khi case đóng (BR-26, BR-33).
 */
@Getter
@Setter
@Entity
@Table(name = "support_case", indexes = {
        @Index(name = "ix_support_case_target", columnList = "target_entity, target_id"),
        @Index(name = "ix_support_case_queue", columnList = "status, priority, created_at")
})
@Check(name = "ck_support_case_reporter", constraints = "reporter_id IS NOT NULL OR case_type = 'SYSTEM_ALERT'")
public class SupportCaseModel extends BaseModel {

    @Column(name = "case_code", nullable = false, unique = true, length = 30)
    private String caseCode;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "case_type", nullable = false, length = 20)
    private SupportCaseType caseType;

    /** NULL chỉ khi SYSTEM_ALERT. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reporter_id")
    private UserModel reporter;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "target_entity", nullable = false, length = 30)
    private SupportTargetEntity targetEntity;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private BookingModel booking;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    private SupportCaseCategory category;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String reason;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 10)
    private SupportCasePriority priority = SupportCasePriority.NORMAL;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private SupportCaseStatus status = SupportCaseStatus.OPEN;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "assigned_to")
    private UserModel assignedTo;

    /** JSON cho SYSTEM_ALERT: anomaly_type, rule, risk_score... */
    @Column(name = "detection_context", columnDefinition = "TEXT")
    private String detectionContext;

    /** Dismiss, Warn, Hide_Content, Refund, Release_Funds, Lock_User, ... (danh sách mở). */
    @Column(name = "resolution_action", length = 30)
    private String resolutionAction;

    @Column(name = "resolution_amount", precision = 18, scale = 2)
    private BigDecimal resolutionAmount;

    @Column(name = "resolution_note", columnDefinition = "TEXT")
    private String resolutionNote;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resolved_by")
    private UserModel resolvedBy;

    @Column(name = "resolved_at")
    private LocalDateTime resolvedAt;
}
