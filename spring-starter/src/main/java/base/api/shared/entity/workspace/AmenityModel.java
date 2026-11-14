package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.AmenityCategory;
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

@Getter
@Setter
@Entity
@Table(name = "amenity", indexes = {
        @Index(name = "ix_amenity_organizer", columnList = "organizer_id, is_active"),
        @Index(name = "ix_amenity_category", columnList = "category, is_active")
})
public class AmenityModel extends BaseModel {

    @Column(nullable = false, length = 100)
    private String name;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private AmenityCategory category;

    private String icon;

    @Column(length = 500)
    private String description;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;

    /**
     * Đối tác sở hữu bộ tiện ích riêng này.
     * Nếu null: Tiện ích tiêu chuẩn toàn hệ thống do Quản trị viên (Admin) tạo.
     */
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "organizer_id")
    private UserModel organizer;
}
