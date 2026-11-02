package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;

/**
 * Mốc hoàn tiền khi huỷ. Áp mốc cao nhất thoả điều kiện; được chụp vào
 * Booking.cancellationPolicySnapshot lúc đặt (BR-18/19). No-show = không hoàn.
 */
@Getter
@Setter
@Entity
@Table(name = "workspace_cancellation_rule", uniqueConstraints = {
        @UniqueConstraint(name = "ux_wcr_workspace_hours", columnNames = {"workspace_id", "min_hours_before_start"})
})
@Check(name = "ck_wcr_percent", constraints = "refund_percent BETWEEN 0 AND 100")
public class WorkspaceCancellationRuleModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private WorkspaceModel workspace;

    @Column(name = "min_hours_before_start", nullable = false)
    private int minHoursBeforeStart;

    @Column(name = "refund_percent", nullable = false, precision = 5, scale = 2)
    private BigDecimal refundPercent;
}
