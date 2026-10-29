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
@Table(name = "log_audit_log")
public class AuditLogModel extends BaseModel {
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "user_id", length = 36)
  private UUID userId;

  @Column(name = "actor_type", nullable = false, length = 20)
  private String actorType = "User";

  @Column(nullable = false, length = 50)
  private String module = "Authentication";

  @Column(nullable = false, length = 100)
  private String action;

  @Column(name = "entity_type", nullable = false, length = 50)
  private String entityType = "App_User";

  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(name = "entity_id", length = 36)
  private UUID entityId;

  @Column(name = "request_id", length = 100)
  private String requestId;

  @Column(name = "created_at", nullable = false, updatable = false)
  private LocalDateTime createdAt;

  @PrePersist
  void timestamps() {
    createdAt = LocalDateTime.now(ZoneOffset.UTC);
  }
}
