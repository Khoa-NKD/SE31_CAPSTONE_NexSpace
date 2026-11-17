package base.api.shared.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "roles")
public class RoleModel extends BaseModel {

    /** Trùng với tên enum {@link base.api.shared.enums.UserRole}. */
    @Column(nullable = false, unique = true, length = 50)
    private String name;

    private String description;

    public RoleModel(String name, String description) {
        this.name = name;
        this.description = description;
    }
}
