package base.api.shared.entity.review;

import base.api.shared.entity.BaseModel;
import base.api.shared.enums.NotificationChannel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Mẫu thông báo theo sự kiện × kênh × ngôn ngữ (VD: booking_confirmed / EMAIL / vi).
 */
@Getter
@Setter
@Entity
@Table(name = "notification_template", uniqueConstraints = {
        @UniqueConstraint(name = "ux_notification_template", columnNames = {"event_type", "channel", "language"})
})
public class NotificationTemplateModel extends BaseModel {

    @Column(name = "event_type", nullable = false, length = 50)
    private String eventType;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 10)
    private NotificationChannel channel;

    @Column(nullable = false, length = 5)
    private String language = "vi";

    @Column(name = "subject_template", nullable = false)
    private String subjectTemplate;

    @Column(name = "body_template", nullable = false, columnDefinition = "TEXT")
    private String bodyTemplate;

    @Column(name = "is_active", nullable = false)
    private boolean active = true;
}
