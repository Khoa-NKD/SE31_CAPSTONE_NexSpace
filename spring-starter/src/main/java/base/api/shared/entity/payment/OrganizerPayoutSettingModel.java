package base.api.shared.entity.payment;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.PayoutApprovalStatus;
import base.api.shared.enums.PayoutMode;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Cấu hình chế độ Payout của từng Organizer (Manual hoặc Auto-daily kèm giờ rút và phê duyệt của Admin).
 */
@Getter
@Setter
@Entity
@Table(name = "organizer_payout_setting")
public class OrganizerPayoutSettingModel extends BaseModel {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false, unique = true)
    private UserModel organizer;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "payout_mode", nullable = false, length = 30)
    private PayoutMode payoutMode = PayoutMode.MANUAL;

    @Column(name = "auto_payout_hour", nullable = false)
    private int autoPayoutHour = 9;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "approval_status", nullable = false, length = 30)
    private PayoutApprovalStatus approvalStatus = PayoutApprovalStatus.NONE;

    @Column(name = "pending_auto_payout_hour")
    private Integer pendingAutoPayoutHour;

    @Column(name = "request_note", length = 500)
    private String requestNote;

    @Column(name = "admin_feedback", length = 500)
    private String adminFeedback;

    @Column(name = "requested_at")
    private LocalDateTime requestedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private UserModel reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;
}
