package base.api.shared.entity;

import jakarta.persistence.*;
import java.util.UUID;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UuidGenerator;
import org.hibernate.type.SqlTypes;

/** UUID keys match the CHAR(36) ascii_bin columns in NexSpace v3.3. */
@Getter
@Setter
@MappedSuperclass
public abstract class BaseModel {
  @Id
  @GeneratedValue
  @UuidGenerator
  @JdbcTypeCode(SqlTypes.CHAR)
  @Column(length = 36, nullable = false, updatable = false)
  private UUID id;
}
