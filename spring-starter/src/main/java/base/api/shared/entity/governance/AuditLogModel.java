package base.api.shared.entity.governance;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.AuditActorType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Chỉ ghi thêm. Nguồn duy nhất cho người thực hiện + lý do của thao tác nhạy cảm (BR-31),
 * kể cả lịch sử trạng thái booking.
 */
@Getter
@Setter
@Entity
@Table(name = "audit_log", indexes = {
        @Index(name = "ix_audit_log_entity", columnList = "entity_type, entity_id, created_at"),
        @Index(name = "ix_audit_log_user", columnList = "user_id, created_at")
})
public class AuditLogModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private UserModel user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "actor_type", nullable = false, length = 20)
    private AuditActorType actorType = AuditActorType.USER;

    @Column(nullable = false, length = 50)
    private String module;

    /** VD: Booking.Cancel, User.Lock, Workspace.Approve. */
    @Column(nullable = false, length = 100)
    private String action;

    @Column(name = "entity_type", nullable = false, length = 50)
    private String entityType;

    @Column(name = "entity_id")
    private Long entityId;

    /** JSON. */
    @Column(name = "old_value", columnDefinition = "LONGTEXT")
    private String oldValue;

    /** JSON. */
    @Column(name = "new_value", columnDefinition = "LONGTEXT")
    private String newValue;

    @Column(length = 500)
    private String reason;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;
}
