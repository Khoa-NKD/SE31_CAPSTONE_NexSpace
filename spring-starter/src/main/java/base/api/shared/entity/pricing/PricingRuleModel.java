package base.api.shared.entity.pricing;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.PricingModifierType;
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
import java.time.LocalDate;
import java.time.LocalTime;

/**
 * Giá động. Phạm vi: workspace / loại chỗ / 1 chỗ — chọn theo độ cụ thể rồi priority (BR-22).
 * Ngày lễ lấy từ Platform_Setting.public_holidays.
 */
@Getter
@Setter
@Entity
@Table(name = "pricing_rule", indexes = {
        @Index(name = "ix_pricing_rule_workspace", columnList = "workspace_id, is_active")
})
@Check(name = "ck_pricing_rule_scope", constraints = "resource_type_id IS NULL OR resource_id IS NULL")
@Check(name = "ck_pricing_rule_multiplier", constraints = "multiplier > 0")
public class PricingRuleModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private WorkspaceModel workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_type_id")
    private ResourceTypeModel resourceType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private BookableResourceModel resource;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "modifier_type", nullable = false, length = 20)
    private PricingModifierType modifierType;

    @Column(name = "start_time")
    private LocalTime startTime;

    @Column(name = "end_time")
    private LocalTime endTime;

    @Column(name = "start_date")
    private LocalDate startDate;

    @Column(name = "end_date")
    private LocalDate endDate;

    @Column(nullable = false, precision = 5, scale = 2)
    private BigDecimal multiplier = BigDecimal.ONE;

    /** Cộng thêm / giờ. */
    @Column(name = "fixed_amount", nullable = false, precision = 18, scale = 2)
    private BigDecimal fixedAmount = BigDecimal.ZERO;

    @Column(nullable = false)
    private int priority;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
