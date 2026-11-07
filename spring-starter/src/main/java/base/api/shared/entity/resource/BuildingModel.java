package base.api.shared.entity.resource;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.Setter;

/** A physical building operated by one organizer; workspace ownership remains independent. */
@Entity
@Table(name = "building", uniqueConstraints = @UniqueConstraint(name = "ux_building_owner_name", columnNames = {"organizer_id", "name"}))
@Getter
@Setter
public class BuildingModel extends BaseModel {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private UserModel organizer;

    @Column(nullable = false, length = 150)
    private String name;

    @Column(nullable = false, length = 500)
    private String address;
}
