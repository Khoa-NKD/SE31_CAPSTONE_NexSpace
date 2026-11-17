package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.AssetStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.LocalDate;

/**
 * Tài sản / thiết bị vật lý của không gian (máy chiếu, bàn ghế, điều hoà...).
 * resource = NULL => tài sản dùng chung của không gian; có giá trị => gắn với 1 chỗ.
 * amenity (tuỳ chọn) nối tài sản với danh mục tiện ích đang hiển thị cho khách.
 * Thiết bị hỏng / đang sửa ảnh hưởng chỗ đặt => tạo Resource_Blocked_Slot qua Asset_Maintenance_Log.
 */
@Getter
@Setter
@Entity
@Table(name = "workspace_asset", uniqueConstraints = {
        @UniqueConstraint(name = "ux_workspace_asset_code", columnNames = {"workspace_id", "asset_code"})
}, indexes = {
        @Index(name = "ix_workspace_asset_status", columnList = "workspace_id, status"),
        @Index(name = "ix_workspace_asset_maintenance_due", columnList = "status, next_maintenance_date")
})
@Check(name = "ck_workspace_asset_quantity", constraints = "quantity > 0")
public class WorkspaceAssetModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private WorkspaceModel workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private BookableResourceModel resource;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "amenity_id")
    private AmenityModel amenity;

    /** Mã tài sản nội bộ, unique trong 1 không gian (VD: PRJ-001). */
    @Column(name = "asset_code", nullable = false, length = 50)
    private String assetCode;

    @Column(nullable = false)
    private String name;

    @Column(nullable = false)
    private int quantity = 1;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private AssetStatus status = AssetStatus.IN_USE;

    @Column(name = "purchase_date")
    private LocalDate purchaseDate;

    @Column(name = "purchase_price", precision = 18, scale = 2)
    private BigDecimal purchasePrice;

    @Column(name = "warranty_until")
    private LocalDate warrantyUntil;

    /** Lịch bảo trì định kỳ tiếp theo; job nhắc việc quét theo cột này. */
    @Column(name = "next_maintenance_date")
    private LocalDate nextMaintenanceDate;

    @Column(length = 1000)
    private String note;
}
