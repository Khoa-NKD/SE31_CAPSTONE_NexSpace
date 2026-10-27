package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.*;
import base.api.feature.auth.service.ITokenRevocationService;
import base.api.shared.config.JwtUtil;
import base.api.shared.entity.*;
import base.api.shared.exception.UnauthorizedException;
import base.api.shared.util.HashUtils;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class TokenRevocationService implements ITokenRevocationService {
  private final IUserSessionRepository repository;
  private final IUserRepository users;
  private final JwtUtil jwtUtil;
  private final AuditService audit;

  @Value("${app.auth.session-ttl-days:30}")
  private long sessionTtlDays;

  public record SessionIssue(
      UserModel user, UUID sessionId, String refreshToken, LocalDateTime expiresAt) {}

  public static String randomToken() {
    byte[] bytes = new byte[32];
    new SecureRandom().nextBytes(bytes);
    return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
  }

  @Transactional
  public SessionIssue create(UserModel user) {
    String refresh = randomToken();
    UserSessionModel session = new UserSessionModel();
    session.setUserId(user.getId());
    session.setRefreshTokenHash(HashUtils.sha256Hex(refresh));
    session.setExpiresAt(LocalDateTime.now(ZoneOffset.UTC).plusDays(sessionTtlDays));
    repository.saveAndFlush(session);
    return new SessionIssue(user, session.getId(), refresh, session.getExpiresAt());
  }

  @Transactional
  public SessionIssue refresh(String refreshToken) {
    UserSessionModel session =
        repository
            .findForRefresh(HashUtils.sha256Hex(refreshToken))
            .filter(UserSessionModel::isActive)
            .orElseThrow(
                () -> new UnauthorizedException("Refresh token không hợp lệ hoặc đã hết hạn"));
    UserModel user =
        users
            .findById(session.getUserId())
            .filter(u -> u.isActive() && u.getTwoFactorEnabled() == 0)
            .orElseThrow(() -> new UnauthorizedException("Tài khoản không thể đăng nhập"));
    String rotated = randomToken();
    session.setRefreshTokenHash(HashUtils.sha256Hex(rotated));
    session.setLastActivityAt(LocalDateTime.now(ZoneOffset.UTC));
    repository.saveAndFlush(session);
    return new SessionIssue(user, session.getId(), rotated, session.getExpiresAt());
  }

  @Override
  @Transactional
  public void revoke(String token) {
    UUID userId = jwtUtil.extractUserId(token);
    repository
        .findById(jwtUtil.extractSessionId(token))
        .filter(s -> s.getUserId().equals(userId))
        .ifPresent(UserSessionModel::revoke);
    audit.record(userId, userId, "LOGOUT");
  }

  @Override
  @Transactional(readOnly = true)
  public boolean isRevoked(String token) {
    UUID userId = jwtUtil.extractUserId(token);
    return repository
        .findById(jwtUtil.extractSessionId(token))
        .filter(s -> s.getUserId().equals(userId) && s.isActive())
        .isEmpty();
  }

  @Override
  @Transactional
  public void revokeAll(UUID userId) {
    repository.revokeAll(userId, LocalDateTime.now(ZoneOffset.UTC));
  }
}
