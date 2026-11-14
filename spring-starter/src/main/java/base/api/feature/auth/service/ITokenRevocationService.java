package base.api.feature.auth.service;

import java.time.Instant;

public interface ITokenRevocationService {

    void revoke(String token);

    boolean isRevoked(String token);

    /**
     * Thu hồi toàn bộ phiên đăng nhập và token của người dùng trên mọi thiết bị.
     * Áp dụng khi đổi vai trò (role), đổi mật khẩu, hoặc khóa/xóa tài khoản.
     */
    void revokeAllUserTokens(Long userId);

    /**
     * Kiểm tra token của người dùng có bị thu hồi hay không (do lệch vai trò hoặc được cấp trước thời điểm thu hồi toàn bộ).
     */
    boolean isUserTokenRevoked(Long userId, Instant issuedAt, String tokenRole, String currentDbRole);
}
