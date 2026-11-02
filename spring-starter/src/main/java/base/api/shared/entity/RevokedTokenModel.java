package base.api.shared.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDateTime;

/**
 * JWT đã logout. Lưu SHA-256 của token (không lưu token gốc) cho tới khi token hết hạn.
 */
@Getter
@Setter
@Entity
@Table(name = "revoked_tokens", indexes = {
        @Index(name = "idx_revoked_tokens_expires_at", columnList = "expires_at")
})
public class RevokedTokenModel extends BaseModel {

    @Column(name = "token_hash", nullable = false, unique = true, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private LocalDateTime expiresAt;
}
