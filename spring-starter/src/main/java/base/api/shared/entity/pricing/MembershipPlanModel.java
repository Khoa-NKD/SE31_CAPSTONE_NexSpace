package base.api.shared.entity.pricing;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.PlanApplicableCategory;
import base.api.shared.enums.QuotaUnit;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;

/**
 * Gói hội viên. workspace = NULL => áp dụng mọi không gian của Organizer.
 */
@Getter
@Setter
@Entity
@Table(name = "membership_plan", indexes = {
        @Index(name = "ix_membership_plan_organizer", columnList = "organizer_id, is_active")
})
public class MembershipPlanModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private UserModel organizer;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "workspace_id")
    private WorkspaceModel workspace;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(nullable = false, precision = 18, scale = 2)
    private BigDecimal price;

    @Column(name = "validity_days", nullable = false)
    private int validityDays;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "quota_unit", nullable = false, length = 10)
    private QuotaUnit quotaUnit;

    @Column(name = "quota_amount", nullable = false, precision = 10, scale = 2)
    private BigDecimal quotaAmount;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "applicable_category", nullable = false, length = 10)
    private PlanApplicableCategory applicableCategory = PlanApplicableCategory.ALL;

    @Column(name = "benefits_desc", columnDefinition = "TEXT")
    private String benefitsDesc;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
