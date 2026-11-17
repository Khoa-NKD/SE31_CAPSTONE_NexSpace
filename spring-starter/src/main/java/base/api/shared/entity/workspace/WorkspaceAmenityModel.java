package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.resource.BookableResourceModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.math.BigDecimal;

/**
 * Tiện ích của không gian (resource = NULL) hoặc của 1 chỗ (gộp Workspace_Amenity + Resource_Amenity).
 */
@Getter
@Setter
@Entity
@Table(name = "workspace_amenity", uniqueConstraints = {
        @UniqueConstraint(name = "ux_workspace_amenity", columnNames = {"workspace_id", "resource_id", "amenity_id"})
})
public class WorkspaceAmenityModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private WorkspaceModel workspace;

    /** NULL = tiện ích chung của không gian. */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private BookableResourceModel resource;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "amenity_id", nullable = false)
    private AmenityModel amenity;

    /** NULL/0 = miễn phí; > 0 = dịch vụ thêm có phí. */
    @Column(name = "addon_price_per_hour", precision = 18, scale = 2)
    private BigDecimal addonPricePerHour;
}
