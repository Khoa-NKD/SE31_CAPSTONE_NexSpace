package base.api.shared.entity;

import base.api.shared.enums.UserGender;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
@Entity
@Table(name = "users")
public class UserModel extends BaseModel {

    @Column(name = "user_name", nullable = false, unique = true, length = 100)
    private String userName;

    @Column(nullable = false, unique = true)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String password;

    @Column(name = "first_name", length = 100)
    private String firstName;

    @Column(name = "last_name", length = 100)
    private String lastName;

    @Column(length = 20)
    private String phone;

    @Enumerated(EnumType.STRING)
    @Column(length = 16)
    private UserGender gender;

    @Column(name = "birth_date")
    private LocalDate birthDate;

    private String avatar;

    @Column(name = "is_verified", nullable = false)
    private boolean verified;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status = UserStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleModel roleEntity;

    public UserRole getRole() {
        return roleEntity == null ? null : UserRole.valueOf(roleEntity.getName());
    }

    public boolean isActive() {
        return status == UserStatus.ACTIVE;
    }

    public String getFullName() {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String name = (first + " " + last).trim();
        return name.isEmpty() ? userName : name;
    }
}
