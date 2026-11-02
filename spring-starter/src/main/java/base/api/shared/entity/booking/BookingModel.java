package base.api.shared.entity.booking;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.pricing.DiscountRuleModel;
import base.api.shared.entity.pricing.MembershipSubscriptionModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingSource;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.CancelSource;
import base.api.shared.enums.PriceType;
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
 * Đặt chỗ (gộp Booking_Snapshot). Kiểm tra trùng + trừ quota + giữ mã KM chạy trong 1 transaction có khoá resource.
 * finalPrice = base + surcharge + addon - discount + tax + serviceFee. Lịch sử trạng thái ở Audit_Log.
 */
@Getter
@Setter
@Entity
@Table(name = "booking", indexes = {
        @Index(name = "ix_booking_resource_time", columnList = "resource_id, start_time"),
        @Index(name = "ix_booking_customer", columnList = "customer_id, start_time"),
        @Index(name = "ix_booking_workspace", columnList = "workspace_id, status, start_time"),
        @Index(name = "ix_booking_hold_expiry", columnList = "status, hold_expires_at")
})
@Check(name = "ck_booking_time", constraints = "end_time > start_time")
public class BookingModel extends BaseModel {

    @Column(name = "booking_code", nullable = false, unique = true, length = 30)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "customer_id", nullable = false)
    private UserModel customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resource_id", nullable = false)
    private BookableResourceModel resource;

    /** Phi chuẩn hoá có chủ đích để lọc/báo cáo nhanh. */
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private WorkspaceModel workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "discount_rule_id")
    private DiscountRuleModel discountRule;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "subscription_id")
    private MembershipSubscriptionModel subscription;

    /** Đổi lịch = tạo booking mới, booking cũ CANCELLED. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "rescheduled_from_id")
    private BookingModel rescheduledFrom;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private BookingSource source = BookingSource.SEARCH;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    @Column(name = "party_size", nullable = false)
    private int partySize = 1;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "price_type", nullable = false, length = 10)
    private PriceType priceType;

    @Column(name = "base_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal baseAmount;

    /** Phụ thu từ Pricing_Rule (giờ cao điểm, cuối tuần, lễ). */
    @Column(name = "surcharge_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal surchargeAmount = BigDecimal.ZERO;

    @Column(name = "addon_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal addonAmount = BigDecimal.ZERO;

    /** Tổng giảm (mã KM + hội viên). */
    @Column(name = "discount_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal discountAmount = BigDecimal.ZERO;

    @Column(name = "tax_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal taxAmount = BigDecimal.ZERO;

    @Column(name = "service_fee_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal serviceFeeAmount = BigDecimal.ZERO;

    @Column(name = "final_price", nullable = false, precision = 18, scale = 2)
    private BigDecimal finalPrice;

    /** Hoa hồng nền tảng, chốt lúc đặt (BR-30..32). */
    @Column(name = "platform_fee_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal platformFeeAmount = BigDecimal.ZERO;

    @Column(name = "quota_used_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal quotaUsedAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private BookingStatus status = BookingStatus.PENDING_PAYMENT;

    /** Hạn duyệt / hạn thanh toán (BR-11, BR-14). */
    @Column(name = "hold_expires_at")
    private LocalDateTime holdExpiresAt;

    /** QR check-in; cửa sổ hợp lệ = startTime ± setting (BR-38). */
    @Column(name = "qr_token_hash", unique = true)
    private String qrTokenHash;

    @Column(name = "checked_in_at")
    private LocalDateTime checkedInAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "checked_in_by")
    private UserModel checkedInBy;

    @Column(name = "checked_out_at")
    private LocalDateTime checkedOutAt;

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "cancel_source", length = 20)
    private CancelSource cancelSource;

    @Column(name = "cancel_reason", length = 500)
    private String cancelReason;

    /** JSON: tên/loại chỗ, đơn giá, rule áp dụng, add-on đã chọn. */
    @Column(name = "pricing_snapshot", columnDefinition = "TEXT")
    private String pricingSnapshot;

    /** JSON các mốc hoàn tiền; căn cứ tính hoàn. */
    @Column(name = "cancellation_policy_snapshot", columnDefinition = "TEXT")
    private String cancellationPolicySnapshot;
}
