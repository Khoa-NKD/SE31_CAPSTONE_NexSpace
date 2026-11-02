package base.api.shared.entity.pricing;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.SubscriptionStatus;
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
 * Gói hội viên khách đã mua. Trừ quota bằng UPDATE ... WHERE quota_used + :x <= quota_total
 * trong cùng transaction đặt chỗ (BR-21).
 */
@Getter
@Setter
@Entity
@Table(name = "membership_subscription", indexes = {
        @Index(name = "ix_membership_subscription_customer", columnList = "customer_id, status")
})
@Check(name = "ck_membership_subscription_quota", constraints = "quota_used >= 0 AND quota_used <= quota_total")
public class MembershipSubscriptionModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private UserModel customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "plan_id", nullable = false)
    private MembershipPlanModel plan;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private SubscriptionStatus status = SubscriptionStatus.PENDING_PAYMENT;

    @Column(name = "start_date")
    private LocalDateTime startDate;

    @Column(name = "end_date")
    private LocalDateTime endDate;

    @Column(name = "price_paid", nullable = false, precision = 18, scale = 2)
    private BigDecimal pricePaid;

    @Column(name = "quota_total", nullable = false, precision = 10, scale = 2)
    private BigDecimal quotaTotal;

    @Column(name = "quota_used", nullable = false, precision = 10, scale = 2)
    private BigDecimal quotaUsed = BigDecimal.ZERO;

    /** JSON điều khoản gói tại thời điểm mua. */
    @Column(name = "plan_snapshot", nullable = false, columnDefinition = "TEXT")
    private String planSnapshot;
}
