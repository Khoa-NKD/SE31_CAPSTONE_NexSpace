package base.api.shared.entity.resource;

import base.api.shared.entity.BaseModel;
import base.api.shared.enums.BookableResourceStatus;
import base.api.shared.enums.NoiseLevel;
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
import org.hibernate.annotations.Check;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;

/**
 * Chỗ đặt cụ thể trên sơ đồ. Chỉ ACTIVE mới đặt được.
 * Giá giờ hiệu lực = COALESCE(pricePerHour, resourceType.pricePerHour); giá ngày/tháng lấy từ Resource_Type,
 * sau đó mới áp Pricing_Rule.
 */
@Getter
@Setter
@Entity
@Table(name = "bookable_resource", uniqueConstraints = {
        @UniqueConstraint(name = "ux_bookable_resource_floor_label", columnNames = {"floor_plan_id", "label"})
})
@Check(name = "ck_bookable_resource_price", constraints = "price_per_hour IS NULL OR price_per_hour > 0")
public class BookableResourceModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "floor_plan_id", nullable = false)
    private FloorPlanModel floorPlan;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resource_type_id", nullable = false)
    private ResourceTypeModel resourceType;

    /** VD: A-01, Phòng Sao Mai. */
    @Column(nullable = false, length = 50)
    private String label;

    @Column(name = "zone_name", length = 100)
    private String zoneName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "noise_level", length = 20)
    private NoiseLevel noiseLevel;

    /** NULL = lấy resourceType.capacity. */
    @Column(name = "capacity_override")
    private Integer capacityOverride;

    @Column(name = "price_per_hour", precision = 18, scale = 2)
    private BigDecimal pricePerHour;

    @Column(length = 1000)
    private String description;

    @Column(name = "pos_x", precision = 10, scale = 2)
    private BigDecimal posX;

    @Column(name = "pos_y", precision = 10, scale = 2)
    private BigDecimal posY;

    @Column(precision = 8, scale = 2)
    private BigDecimal width;

    @Column(precision = 8, scale = 2)
    private BigDecimal height;

    @Column(nullable = false, precision = 6, scale = 2)
    private BigDecimal rotation = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private BookableResourceStatus status = BookableResourceStatus.DRAFT;
}
