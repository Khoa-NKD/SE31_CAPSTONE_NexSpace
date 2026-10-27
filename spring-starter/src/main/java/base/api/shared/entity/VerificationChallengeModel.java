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
@Table(name = "t_user_verification_challenge")
public class VerificationChallengeModel extends BaseModel {
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "user_id", length = 36)
  private UUID userId;

  @Column(nullable = false, length = 30)
  private String purpose;

  @Column(nullable = false, length = 255)
  private String destination;

  @Column(name = "proof_hash", nullable = false, length = 255)
  private String proofHash;

  @Column(name = "expires_at", nullable = false)
  private LocalDateTime expiresAt;

  @Column(name = "attempt_count", nullable = false)
  private int attemptCount;

  @Column(name = "max_attempts", nullable = false)
  private int maxAttempts = 5;

  @Column(name = "consumed_at")
  private LocalDateTime consumedAt;

  @Column(name = "invalidated_at")
  private LocalDateTime invalidatedAt;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
  void timestamps() {
    createdAt = LocalDateTime.now(ZoneOffset.UTC);
  }

  public boolean isUsable() {
    return consumedAt == null
        && invalidatedAt == null
        && expiresAt.isAfter(LocalDateTime.now(ZoneOffset.UTC))
        && attemptCount < maxAttempts;
  }
}
