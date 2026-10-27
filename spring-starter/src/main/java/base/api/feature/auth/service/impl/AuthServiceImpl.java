package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.*;
import base.api.feature.auth.dto.response.*;
import base.api.feature.auth.mapper.UserMapper;
import base.api.feature.auth.repository.*;
import base.api.feature.auth.service.IAuthService;
import base.api.shared.config.*;
import base.api.shared.entity.*;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import base.api.shared.util.HashUtils;
import java.time.*;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.*;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements IAuthService {
  private final AuthenticationManager authenticationManager;
  private final IUserRepository users;
  private final IVerificationChallengeRepository challenges;
  private final TokenRevocationService sessions;
  private final PasswordEncoder encoder;
  private final JwtUtil jwt;
  private final EmailService emailService;
  private final AuditService audit;

  @Value("${app.auth.email-verification-enabled:false}")
  private boolean emailVerificationEnabled;

  @Value("${app.auth.verification-token-ttl-hours:48}")
  private long verificationTtlHours;

  @Value("${app.auth.reset-token-ttl-minutes:60}")
  private long resetTtlMinutes;

  @Value("${app.api-url}")
  private String apiUrl;

  @Value("${app.client-url}")
  private String clientUrl;

  @Override
  @Transactional
  public AuthResponse login(AuthRequest dto) {
    String email = dto.getEmail().trim();
    try {
      authenticationManager.authenticate(
          new UsernamePasswordAuthenticationToken(email, dto.getPassword()));
    } catch (AuthenticationException ex) {
      throw new UnauthorizedException("Email, mật khẩu hoặc trạng thái tài khoản không hợp lệ");
    }
    UserModel user =
        users
            .findByLogin(email)
            .orElseThrow(() -> new UnauthorizedException("Thông tin đăng nhập không hợp lệ"));
    user.setLastLoginAt(now());
    var issued = sessions.create(user);
    audit.record(user.getId(), user.getId(), "LOGIN");
    return response(issued);
  }

  @Override
  @Transactional
  public AuthResponse refresh(RefreshTokenDto dto) {
    return response(sessions.refresh(dto.getRefreshToken()));
  }

  @Override
  public void logout(String token) {
    sessions.revoke(token);
  }

  @Override
  @Transactional
  public UserDto register(RegisterDto dto) {
    String email = dto.getEmail().trim().toLowerCase(Locale.ROOT);
    if (users.existsByEmailIgnoreCase(email)) throw new ConflictException("Email đã được sử dụng");
    UserModel user = new UserModel();
    user.setEmail(email);
    user.setFullName(dto.getFullName().trim());
    user.setPassword(encoder.encode(dto.getPassword()));
    user.setPhone(trimToNull(dto.getPhone()));
    user.setRole(UserRole.CUSTOMER);
    user.setStatus(emailVerificationEnabled ? UserStatus.UNVERIFIED : UserStatus.ACTIVE);
    if (!emailVerificationEnabled) user.setEmailVerifiedAt(now());
    users.saveAndFlush(user);
    audit.record(user.getId(), user.getId(), "REGISTER");
    if (emailVerificationEnabled) sendVerificationEmail(user);
    return UserMapper.toDto(user);
  }

  @Override
  @Transactional
  public void verifyEmail(String token) {
    VerificationChallengeModel challenge = consume(token, "Email_Verification");
    UserModel user = findUser(challenge);
    // Verification must not reactivate an administratively disabled account.
    if (user.getStatus() != UserStatus.UNVERIFIED)
      throw new BadRequestException("Tài khoản không ở trạng thái chờ xác minh");
    user.setEmailVerifiedAt(now());
    user.setStatus(UserStatus.ACTIVE);
    audit.record(user.getId(), user.getId(), "VERIFY_EMAIL");
  }

  @Override
  @Transactional
  public void resendVerificationEmail(String contactInfo) {
    users
        .findByLogin(contactInfo)
        .filter(u -> u.getStatus() == UserStatus.UNVERIFIED)
        .ifPresent(this::sendVerificationEmail);
  }

  @Override
  @Transactional
  public void initiateForgotPassword(String contactInfo) {
    users
        .findByLogin(contactInfo)
        .filter(u -> u.isActive() && u.getPassword() != null)
        .ifPresent(
            user -> {
              String token = issue(user, "Password_Reset", now().plusMinutes(resetTtlMinutes));
              emailService.sendHtmlEmail(
                  user.getEmail(),
                  "Đặt lại mật khẩu",
                  AuthEmailTemplates.resetPassword(
                      user.getFullName(),
                      clientUrl + "/auth/reset-password?token=" + token,
                      resetTtlMinutes));
            });
  }

  @Override
  @Transactional
  public void completeForgotPassword(CompleteForgotPasswordDto dto) {
    if (!dto.getNewPassword().equals(dto.getConfirmNewPassword()))
      throw new BadRequestException("Mật khẩu xác nhận không khớp");
    VerificationChallengeModel challenge = consume(dto.getResetToken(), "Password_Reset");
    UserModel user = findUser(challenge);
    user.setPassword(encoder.encode(dto.getNewPassword()));
    user.setPasswordChangedAt(now());
    sessions.revokeAll(user.getId());
    audit.record(user.getId(), user.getId(), "RESET_PASSWORD");
    emailService.sendHtmlEmail(
        user.getEmail(),
        "Mật khẩu đã được thay đổi",
        AuthEmailTemplates.passwordChanged(user.getFullName()));
  }

  private void sendVerificationEmail(UserModel user) {
    String token = issue(user, "Email_Verification", now().plusHours(verificationTtlHours));
    emailService.sendHtmlEmail(
        user.getEmail(),
        "Xác thực tài khoản",
        AuthEmailTemplates.verifyEmail(
            user.getFullName(),
            apiUrl + "/api/v1/auth/verify-email?token=" + token,
            verificationTtlHours));
  }

  private String issue(UserModel user, String purpose, LocalDateTime expires) {
    challenges.invalidate(user.getId(), purpose, now());
    String token = TokenRevocationService.randomToken();
    VerificationChallengeModel c = new VerificationChallengeModel();
    c.setUserId(user.getId());
    c.setDestination(user.getEmail());
    c.setPurpose(purpose);
    c.setProofHash(HashUtils.sha256Hex(token));
    c.setExpiresAt(expires);
    challenges.save(c);
    return token;
  }

  private VerificationChallengeModel consume(String token, String purpose) {
    VerificationChallengeModel c =
        challenges
            .findForConsumption(HashUtils.sha256Hex(token), purpose)
            .filter(VerificationChallengeModel::isUsable)
            .orElseThrow(
                () -> new BadRequestException("Token không hợp lệ, đã sử dụng hoặc hết hạn"));
    c.setConsumedAt(now());
    return c;
  }

  private UserModel findUser(VerificationChallengeModel c) {
    return users
        .findById(c.getUserId())
        .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
  }

  private AuthResponse response(TokenRevocationService.SessionIssue issue) {
    String access = jwt.generateToken(issue.user(), issue.sessionId());
    return new AuthResponse(
        access,
        "Bearer",
        jwt.extractExpiration(access),
        UserMapper.toDto(issue.user()),
        issue.refreshToken(),
        issue.expiresAt().toInstant(ZoneOffset.UTC));
  }

  private static LocalDateTime now() {
    return LocalDateTime.now(ZoneOffset.UTC);
  }

  private static String trimToNull(String s) {
    return s == null || s.isBlank() ? null : s.trim();
  }
}
