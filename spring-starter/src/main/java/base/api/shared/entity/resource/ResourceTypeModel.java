package base.api.shared.entity.resource;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.ResourceCategory;
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
 * Loại chỗ (VD: Hot desk, Phòng họp 6 người). Phải có ít nhất 1 mức giá.
 */
@Getter
@Setter
@Entity
@Table(name = "resource_type", uniqueConstraints = {
        @UniqueConstraint(name = "ux_resource_type_workspace_name", columnNames = {"workspace_id", "name"})
})
@Check(name = "ck_resource_type_has_price",
        constraints = "price_per_hour IS NOT NULL OR price_per_day IS NOT NULL OR price_per_month IS NOT NULL")
public class ResourceTypeModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private WorkspaceModel workspace;

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 10)
    private ResourceCategory category;

    @Column(length = 1000)
    private String description;

    @Column(nullable = false)
    private int capacity = 1;

    @Column(name = "price_per_hour", precision = 18, scale = 2)
    private BigDecimal pricePerHour;

    @Column(name = "price_per_day", precision = 18, scale = 2)
    private BigDecimal pricePerDay;

    @Column(name = "price_per_month", precision = 18, scale = 2)
    private BigDecimal pricePerMonth;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
