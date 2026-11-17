package base.api.shared.entity.identity;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.VerificationPurpose;
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

import java.time.LocalDateTime;

/**
 * OTP / token xác minh. Chỉ lưu hash; số lần thử tối đa & thời gian chờ gửi lại lấy từ Platform_Setting.
 */
@Getter
@Setter
@Entity
@Table(name = "user_verification", indexes = {
        @Index(name = "ix_user_verification_lookup", columnList = "destination, purpose, created_at")
})
public class UserVerificationModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private UserModel user;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    private VerificationPurpose purpose;

    /** Email hoặc SĐT nhận mã. */
    @Column(nullable = false)
    private String destination;

    @Column(name = "code_hash", nullable = false)
    private String codeHash;

    @Column(name = "attempt_count", nullable = false)
    private int attemptCount;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;

    /** Dùng xong / bị thay bằng mã mới khi gửi lại. */
    @Column(name = "consumed_at")
    private LocalDateTime consumedAt;
}
