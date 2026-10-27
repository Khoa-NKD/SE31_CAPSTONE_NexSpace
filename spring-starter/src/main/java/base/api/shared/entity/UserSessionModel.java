package base.api.shared.entity;

import jakarta.persistence.*;
import java.time.*;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

@Getter
@Setter
@Entity
@Table(name = "t_user_session")
public class UserSessionModel extends BaseModel {
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "user_id", nullable = false, length = 36)
  private UUID userId;

  @Column(name = "refresh_token_hash", nullable = false, unique = true, length = 255)
  private String refreshTokenHash;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @Column(name = "last_activity_at", nullable = false)
  private LocalDateTime lastActivityAt;

  @Column(name = "expires_at", nullable = false)
  private LocalDateTime expiresAt;

  @Column(name = "is_revoked", nullable = false, columnDefinition = "tinyint unsigned")
  private int revoked;

  @Column(name = "revoked_at")
  private LocalDateTime revokedAt;

  @PrePersist
  void timestamps() {
    createdAt = LocalDateTime.now(ZoneOffset.UTC);
    lastActivityAt = createdAt;
  }

  public boolean isActive() {
    return revoked == 0 && expiresAt.isAfter(LocalDateTime.now(ZoneOffset.UTC));
  }

  public void revoke() {
    revoked = 1;
    revokedAt = LocalDateTime.now(ZoneOffset.UTC);
  }
}
