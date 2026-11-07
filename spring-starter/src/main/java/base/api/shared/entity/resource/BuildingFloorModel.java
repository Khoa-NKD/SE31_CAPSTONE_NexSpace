package base.api.shared.entity.resource;

import base.api.shared.entity.BaseModel;
import jakarta.persistence.*;
import java.math.BigDecimal;
import lombok.Getter;
import lombok.Setter;

/** Physical identity shared by the separate workspace layouts occupying this floor. */
@Entity
@Table(name = "building_floor", uniqueConstraints = @UniqueConstraint(name = "ux_building_floor_number", columnNames = {"building_id", "floor_number"}))
@Getter
@Setter
public class BuildingFloorModel extends BaseModel {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "building_id", nullable = false)
    private BuildingModel building;

    @Column(nullable = false, length = 100)
    private String name;

    @Column(name = "floor_number", nullable = false)
    private int floorNumber;

    @Column(name = "canvas_width", nullable = false, precision = 10, scale = 2)
    private BigDecimal canvasWidth;

    @Column(name = "canvas_height", nullable = false, precision = 10, scale = 2)
    private BigDecimal canvasHeight;
}
