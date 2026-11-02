package base.api.shared.entity.payment;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.governance.SupportCaseModel;
import base.api.shared.enums.PayoutStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Chi trả cho đối tác, 1 dòng / booking. payoutAmount = gross - platformFee - refundDeduction.
 * Tài khoản nhận lấy từ Organizer_Profile lúc chi (BR-32, BR-33).
 */
@Getter
@Setter
@Entity
@Table(name = "organizer_payout", indexes = {
        @Index(name = "ix_organizer_payout_organizer", columnList = "organizer_id, status"),
        @Index(name = "ix_organizer_payout_eligible", columnList = "status, eligible_at")
})
public class OrganizerPayoutModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private UserModel organizer;

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private BookingModel booking;

    /** Case đang chặn => FROZEN. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "support_case_id")
    private SupportCaseModel supportCase;

    @Column(name = "gross_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal grossAmount;

    @Column(name = "platform_fee_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal platformFeeAmount;

    @Column(name = "refund_deduction_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal refundDeductionAmount = BigDecimal.ZERO;

    @Column(name = "payout_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal payoutAmount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private PayoutStatus status = PayoutStatus.HELD;

    /** Thời điểm được phép chi (sau checkout + N ngày). */
    @Column(name = "eligible_at", nullable = false)
    private LocalDateTime eligibleAt;

    @Column(name = "payout_reference", length = 100)
    private String payoutReference;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
