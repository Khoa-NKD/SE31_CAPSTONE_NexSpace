package base.api.shared.entity.payment;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.pricing.MembershipSubscriptionModel;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
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
 * Mỗi dòng = 1 lần thanh toán PayOS cho đúng 1 booking HOẶC 1 subscription.
 * Webhook: kiểm chữ ký, tra orderCode, chỉ xử lý khi status còn PENDING.
 */
@Getter
@Setter
@Entity
@Table(name = "payment_transaction", indexes = {
        @Index(name = "ix_payment_reconciliation", columnList = "reconciliation_status, created_at")
})
@Check(name = "ck_payment_one_owner", constraints = "(booking_id IS NOT NULL AND subscription_id IS NULL) "
        + "OR (booking_id IS NULL AND subscription_id IS NOT NULL)")
public class PaymentTransactionModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private BookingModel booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private MembershipSubscriptionModel subscription;

    /** orderCode gửi PayOS; khoá chống xử lý webhook trùng. */
    @Column(name = "order_code", nullable = false, unique = true)
    private Long orderCode;

    @Column(name = "gateway_transaction_id", length = 100)
    private String gatewayTransactionId;

    @Column(name = "checkout_url", length = 1000)
    private String checkoutUrl;

    /** Số tiền phải trả. */
    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal amount;

    /** Số tiền cổng báo đã nhận. */
    @Column(name = "received_amount", precision = 18, scale = 2)
    private BigDecimal receivedAmount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.PENDING;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "reconciliation_status", nullable = false, length = 20)
    private ReconciliationStatus reconciliationStatus = ReconciliationStatus.UNRECONCILED;

    @Column(name = "reconciliation_note", length = 1000)
    private String reconciliationNote;

    /** Payload webhook cuối cùng (đã che dữ liệu nhạy cảm). */
    @Column(name = "webhook_payload", columnDefinition = "LONGTEXT")
    private String webhookPayload;

    @Column(name = "failure_reason", length = 500)
    private String failureReason;

    @Column(name = "expires_at")
    private LocalDateTime expiresAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;
}
