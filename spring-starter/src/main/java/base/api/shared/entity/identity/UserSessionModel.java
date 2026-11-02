package base.api.shared.entity.identity;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.time.LocalDateTime;

/**
 * Phiên đăng nhập (refresh token). Khoá TK / đổi mật khẩu => set revokedAt cho mọi phiên của user.
 */
@Getter
@Setter
@Entity
@Table(name = "user_session", indexes = {
        @Index(name = "ix_user_session_user", columnList = "user_id, expires_at")
})
public class UserSessionModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserModel user;

    @Column(name = "refresh_token_hash", nullable = false, unique = true)
    private String refreshTokenHash;

    @Column(name = "device_info")
    private String deviceInfo;

    @Column(name = "ip_address", length = 45)
    private String ipAddress;

    /** FCM token; xoá khi logout. */
    @Column(name = "push_token", length = 500)
    private String pushToken;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** NOT NULL = đã thu hồi. */
    @Column(name = "revoked_at")
    private LocalDateTime revokedAt;

    @Column(name = "last_activity_at", nullable = false)
    private LocalDateTime lastActivityAt = LocalDateTime.now();
}
