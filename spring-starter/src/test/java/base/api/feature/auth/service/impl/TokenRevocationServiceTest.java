package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.IRevokedTokenRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.repository.IUserSessionRepository;
import base.api.shared.config.JwtUtil;
import base.api.shared.entity.RevokedTokenModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.identity.UserSessionModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class TokenRevocationServiceTest {

    private IRevokedTokenRepository revokedTokenRepository;
    private IUserSessionRepository userSessionRepository;
    private IUserRepository userRepository;
    private JwtUtil jwtUtil;
    private TokenRevocationService service;

    @BeforeEach
    void setUp() {
        revokedTokenRepository = mock(IRevokedTokenRepository.class);
        userSessionRepository = mock(IUserSessionRepository.class);
        userRepository = mock(IUserRepository.class);
        jwtUtil = mock(JwtUtil.class);

        service = new TokenRevocationService(revokedTokenRepository, userSessionRepository, userRepository, jwtUtil);
    }

    @Test
    @DisplayName("revoke: Lưu hash của token và thời hạn vào database")
    void revoke_SavesTokenHash() {
        when(revokedTokenRepository.existsByTokenHash(anyString())).thenReturn(false);
        Instant exp = Instant.now().plusSeconds(3600);
        when(jwtUtil.extractExpiration("valid.token")).thenReturn(exp);

        service.revoke("valid.token");

        verify(revokedTokenRepository).save(any(RevokedTokenModel.class));
    }

    @Test
    @DisplayName("isRevoked: Trả về true nếu token hash tồn tại trong database")
    void isRevoked_ReturnsTrueWhenHashExists() {
        when(revokedTokenRepository.existsByTokenHash(anyString())).thenReturn(true);

        assertThat(service.isRevoked("revoked.token")).isTrue();
    }

    @Test
    @DisplayName("revokeAllUserTokens: Thu hồi toàn bộ active sessions và tạo bản ghi mốc thu hồi")
    void revokeAllUserTokens_RevokesActiveSessionsAndSavesMarker() {
        Long userId = 10L;
        UserModel user = new UserModel();
        user.setId(userId);
        when(userRepository.findById(userId)).thenReturn(Optional.of(user));

        UserSessionModel activeSession = new UserSessionModel();
        activeSession.setId(1L);
        activeSession.setUser(user);
        when(userSessionRepository.findByUserIdAndRevokedAtIsNull(userId)).thenReturn(List.of(activeSession));

        service.revokeAllUserTokens(userId);

        assertThat(activeSession.getRevokedAt()).isNotNull();
        verify(userSessionRepository).saveAll(any());
        verify(userSessionRepository).save(any(UserSessionModel.class));
    }

    @Test
    @DisplayName("isUserTokenRevoked: Trả về true nếu vai trò trong token khác với vai trò hiện tại trong database")
    void isUserTokenRevoked_RoleMismatch_ReturnsTrue() {
        Long userId = 10L;
        Instant issuedAt = Instant.now();

        // Token được phát hành lúc role là USER, nhưng trong DB hiện tại đã đổi thành ORGANIZER
        boolean isRevoked = service.isUserTokenRevoked(userId, issuedAt, "USER", "ORGANIZER");

        assertThat(isRevoked).isTrue();
    }

    @Test
    @DisplayName("isUserTokenRevoked: Trả về true nếu token được phát hành trước khi gọi revokeAllUserTokens")
    void isUserTokenRevoked_IssuedBeforeRevocation_ReturnsTrue() throws InterruptedException {
        Long userId = 10L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        when(userSessionRepository.findByUserIdAndRevokedAtIsNull(userId)).thenReturn(Collections.emptyList());

        Instant issuedAt = Instant.now().minusSeconds(10);

        // Kích hoạt thu hồi toàn bộ token trên mọi thiết bị
        service.revokeAllUserTokens(userId);

        // Token cũ được cấp trước thời điểm thu hồi
        boolean isRevoked = service.isUserTokenRevoked(userId, issuedAt, "ORGANIZER", "ORGANIZER");

        assertThat(isRevoked).isTrue();
    }

    @Test
    @DisplayName("isUserTokenRevoked: Trả về false nếu token mới được phát hành sau khi thu hồi và đúng vai trò")
    void isUserTokenRevoked_IssuedAfterRevocation_ReturnsFalse() throws InterruptedException {
        Long userId = 10L;
        when(userRepository.findById(userId)).thenReturn(Optional.empty());
        when(userSessionRepository.findByUserIdAndRevokedAtIsNull(userId)).thenReturn(Collections.emptyList());

        // Kích hoạt thu hồi toàn bộ token trên mọi thiết bị
        service.revokeAllUserTokens(userId);

        // Người dùng đăng nhập lại, nhận token mới với timestamp tương lai so với thời điểm thu hồi
        Instant newIssuedAt = Instant.now().plusSeconds(5);

        boolean isRevoked = service.isUserTokenRevoked(userId, newIssuedAt, "ORGANIZER", "ORGANIZER");

        assertThat(isRevoked).isFalse();
    }

    @Test
    @DisplayName("isUserTokenRevoked: Phục hồi mốc thời gian thu hồi từ database nếu cache trống")
    void isUserTokenRevoked_LoadsFromDbWhenCacheEmpty() {
        Long userId = 10L;
        LocalDateTime dbRevokedAt = LocalDateTime.now(ZoneId.of("Asia/Ho_Chi_Minh")).minusMinutes(5);
        when(userSessionRepository.findLatestRevokedAtByUserId(userId)).thenReturn(Optional.of(dbRevokedAt));

        // Token cũ được phát hành cách đây 10 phút (trước dbRevokedAt)
        Instant oldIssuedAt = Instant.now().minusSeconds(600);
        assertThat(service.isUserTokenRevoked(userId, oldIssuedAt, "USER", "USER")).isTrue();

        // Token mới được phát hành vừa xong (sau dbRevokedAt)
        Instant newIssuedAt = Instant.now();
        assertThat(service.isUserTokenRevoked(userId, newIssuedAt, "USER", "USER")).isFalse();
    }
}

