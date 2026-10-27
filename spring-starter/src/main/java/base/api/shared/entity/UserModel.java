package base.api.shared.entity;

import base.api.shared.enums.*;
import jakarta.persistence.*;
import java.time.*;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@Entity
@Table(name = "m_app_user")
public class UserModel extends BaseModel {
  @Column(nullable = false, unique = true, length = 255)
  private String email;

  @Column(name = "password_hash", length = 255)
  private String password;

  @Column(name = "password_changed_at")
  private LocalDateTime passwordChangedAt;

  @Column(name = "full_name", nullable = false, length = 100)
  private String fullName;

  @Column(length = 20)
  private String phone;

  @Column(name = "date_of_birth")
  private LocalDate birthDate;

  @Column(length = 500)
  private String address;

  @Column(name = "avatar_url", length = 500)
  private String avatarUrl;

  @Column(nullable = false, length = 20)
  private UserRole role = UserRole.CUSTOMER;

  @Column(nullable = false, length = 20)
  private UserStatus status = UserStatus.UNVERIFIED;

  @Column(name = "email_verified_at")
  private LocalDateTime emailVerifiedAt;

  @Column(name = "two_factor_enabled", nullable = false, columnDefinition = "tinyint unsigned")
  private int twoFactorEnabled;

  @Column(name = "locked_until")
  private LocalDateTime lockedUntil;

  @Column(name = "last_login_at")
  private LocalDateTime lastLoginAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "updated_at", nullable = false)
  private LocalDateTime updatedAt;

  @PrePersist
  void createTimestamps() {
    createdAt = LocalDateTime.now(ZoneOffset.UTC);
    updatedAt = createdAt;
  }

  @PreUpdate
  void updateTimestamp() {
    updatedAt = LocalDateTime.now(ZoneOffset.UTC);
  }

  public boolean isVerified() {
    return emailVerifiedAt != null;
  }

  public boolean isActive() {
    return status == UserStatus.ACTIVE
        && isVerified()
        && (lockedUntil == null || !lockedUntil.isAfter(LocalDateTime.now(ZoneOffset.UTC)));
  }
}
