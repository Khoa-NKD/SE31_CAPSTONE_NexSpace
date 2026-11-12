package base.api.shared.entity.resource;

import base.api.shared.entity.BaseModel;
import base.api.feature.resource.dto.FloorDecorations;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/** Reusable non-bookable presets; placed objects retain their own immutable-at-copy attributes. */
@Entity
@Table(name = "organizer_layout_template")
@Getter
@Setter
public class LayoutTemplateModel extends BaseModel {
    @Column(name = "organizer_id", nullable = false)
    private Long organizerId;
    @Column(nullable = false, length = 100)
    private String name;
    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private FloorDecorations.Kind kind;
    @Column(name = "width_m", nullable = false, precision = 8, scale = 2)
    private BigDecimal widthM;
    @Column(name = "length_m", nullable = false, precision = 8, scale = 2)
    private BigDecimal lengthM;
    @Column(nullable = false, length = 7)
    private String color;
    @Enumerated(EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR)
    @Column(length = 20)
    private FloorDecorations.Icon icon;
    @Column(nullable = false)
    private boolean active = true;
}
