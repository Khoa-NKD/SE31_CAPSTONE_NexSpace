package base.api.shared.entity.review;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.DeliveryStatus;
import base.api.shared.enums.NotificationType;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

/**
 * Thông báo trong app (gộp Notification_Delivery). Job nền quét dòng PENDING để gửi email/push,
 * thử lại tối đa N lần (setting). relatedEntity* là tham chiếu đa hình, không FK.
 */
@Getter
@Setter
@Entity
@Table(name = "user_notification", indexes = {
        @Index(name = "ix_user_notification_inbox", columnList = "user_id, is_read, created_at"),
        @Index(name = "ix_user_notification_outbox", columnList = "email_status, push_status")
})
public class UserNotificationModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserModel user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    private NotificationType type;

    @Column(nullable = false)
    private String title;

    @Column(nullable = false, columnDefinition = "TEXT")
    private String content;

    @Column(name = "related_entity_type", length = 50)
    private String relatedEntityType;

    @Column(name = "related_entity_id")
    private Long relatedEntityId;

    @Column(name = "is_read", nullable = false)
    private boolean read;

    /** NULL = không gửi email. */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "email_status", length = 10)
    private DeliveryStatus emailStatus;

    /** NULL = không gửi push. */
    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "push_status", length = 10)
    private DeliveryStatus pushStatus;

    @Column(name = "retry_count", nullable = false)
    private int retryCount;
}
