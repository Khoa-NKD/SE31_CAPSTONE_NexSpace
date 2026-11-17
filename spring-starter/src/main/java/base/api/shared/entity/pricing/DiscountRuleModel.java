package base.api.shared.entity.pricing;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.DiscountRuleStatus;
import base.api.shared.enums.DiscountType;
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
 * Khuyến mãi. workspace = NULL => toàn nền tảng (Admin tạo); code = NULL => giảm tự động.
 * 1 booking tối đa 1 mã; lượt dùng đếm từ Booking (đã TT + đang giữ chỗ).
 * code unique: MariaDB cho phép nhiều NULL trong unique index nên tương đương filtered index.
 */
@Getter
@Setter
@Entity
@Table(name = "discount_rule", indexes = {
        @Index(name = "ix_discount_rule_active", columnList = "workspace_id, status, start_at, end_at")
})
@Check(name = "ck_discount_rule_period", constraints = "end_at > start_at")
public class DiscountRuleModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private WorkspaceModel workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_type_id")
    private ResourceTypeModel resourceType;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private UserModel createdBy;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(length = 1000)
    private String description;

    @Column(unique = true, length = 50)
    private String code;

    /** Hiện ở trang khuyến mãi. */
    @Column(name = "is_public", nullable = false)
    private boolean publicVisible;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "discount_type", nullable = false, length = 20)
    private DiscountType discountType;

    @Column(name = "discount_value", nullable = false, precision = 18, scale = 2)
    private BigDecimal discountValue;

    @Column(name = "max_discount_amount", precision = 18, scale = 2)
    private BigDecimal maxDiscountAmount;

    @Column(name = "min_booking_amount", precision = 18, scale = 2)
    private BigDecimal minBookingAmount;

    /** Giảm theo thời lượng (O13). */
    @Column(name = "min_duration_minutes")
    private Integer minDurationMinutes;

    @Column(name = "usage_limit_total")
    private Integer usageLimitTotal;

    @Column(name = "usage_limit_per_customer")
    private Integer usageLimitPerCustomer;

    @Column(name = "start_at", nullable = false)
    private LocalDateTime startAt;

    @Column(name = "end_at", nullable = false)
    private LocalDateTime endAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private DiscountRuleStatus status = DiscountRuleStatus.DRAFT;
}
