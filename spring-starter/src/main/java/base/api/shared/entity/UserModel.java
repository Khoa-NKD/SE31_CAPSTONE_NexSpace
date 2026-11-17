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
import org.hibernate.annotations.ColumnDefault;

import java.time.LocalDate;
import java.time.LocalDateTime;

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

    @Column(name = "avatar", length = 1000)
    private String avatar;

    @Column(name = "is_verified", nullable = false)
    private boolean verified;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 16)
    private UserStatus status = UserStatus.ACTIVE;

    @ManyToOne(fetch = FetchType.EAGER, optional = false)
    @JoinColumn(name = "role_id", nullable = false)
    private RoleModel roleEntity;

    // ── Cột bổ sung theo thiết kế NexSpace App_User ─────────────────────
    // NOT NULL kèm @ColumnDefault để ddl-auto=update thêm cột được vào bảng đã có dữ liệu.

    /** Đăng nhập Google; thay bảng User_Social_Account. */
    @Column(name = "google_id", unique = true, length = 100)
    private String googleId;

    @Column(name = "facebook_id", unique = true, length = 100)
    private String facebookId;

    @Column(name = "email_verified_at")
    private LocalDateTime emailVerifiedAt;

    @Column(name = "phone_verified_at")
    private LocalDateTime phoneVerifiedAt;

    @ColumnDefault("0")
    @Column(name = "two_factor_enabled", nullable = false)
    private boolean twoFactorEnabled;

    /** Mã hoá. */
    @Column(name = "two_factor_secret")
    private String twoFactorSecret;

    @ColumnDefault("0")
    @Column(name = "failed_login_count", nullable = false)
    private int failedLoginCount;

    /** Khoá tạm (BR-03). */
    @Column(name = "locked_until")
    private LocalDateTime lockedUntil;

    @Column(name = "last_login_at")
    private LocalDateTime lastLoginAt;

    /** vi, en. */
    @ColumnDefault("'vi'")
    @Column(name = "preferred_locale", nullable = false, length = 5)
    private String preferredLocale = "vi";

    public UserRole getRole() {
        return roleEntity == null ? null : UserRole.valueOf(roleEntity.getName());
    }

    public boolean isActive() {
        if (status != UserStatus.ACTIVE) {
            if (status == UserStatus.LOCKED && lockedUntil != null
                    && LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).isAfter(lockedUntil)) {
                return true;
            }
            return false;
        }
        if (lockedUntil != null && LocalDateTime.now(java.time.ZoneId.of("Asia/Ho_Chi_Minh")).isBefore(lockedUntil)) {
            return false;
        }
        return true;
    }

    public String getFullName() {
        String first = firstName == null ? "" : firstName.trim();
        String last = lastName == null ? "" : lastName.trim();
        String name = (first + " " + last).trim();
        return name.isEmpty() ? userName : name;
    }
}
