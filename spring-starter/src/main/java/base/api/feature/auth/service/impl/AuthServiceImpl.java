package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.TokenValidationResponseDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.mapper.UserMapper;
import base.api.feature.auth.repository.IEmailVerificationTokenRepository;
import base.api.feature.auth.repository.IPasswordResetTokenRepository;
import base.api.feature.auth.repository.IRoleRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.service.IAuthService;
import base.api.feature.auth.service.ITokenRevocationService;
import base.api.shared.config.EmailService;
import base.api.shared.config.JwtUtil;
import base.api.shared.entity.EmailVerificationTokenModel;
import base.api.shared.entity.PasswordResetTokenModel;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Optional;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements IAuthService {

    private static final String TOKEN_TYPE = "Bearer";
    private static final int MAX_FAILED_LOGIN_ATTEMPTS = 5;
    private static final long LOCKOUT_DURATION_MINUTES = 15;

    private final AuthenticationManager authenticationManager;
    private final IUserRepository userRepository;
    private final IRoleRepository roleRepository;
    private final IEmailVerificationTokenRepository emailVerificationTokenRepository;
    private final IPasswordResetTokenRepository passwordResetTokenRepository;
    private final ITokenRevocationService tokenRevocationService;
    private final PasswordEncoder passwordEncoder;
    private final JwtUtil jwtUtil;
    private final EmailService emailService;

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
        String login = dto.getUsername().trim();

        // Kiểm tra trạng thái tài khoản trước khi xác thực thông tin đăng nhập
        Optional<UserModel> userOpt = userRepository.findByLogin(login);
        if (userOpt.isPresent()) {
            UserModel candidate = userOpt.get();

            // 1. Kiểm tra tài khoản bị quản trị viên khóa
            if (candidate.getStatus() == UserStatus.LOCKED) {
                throw new UnauthorizedException("Tài khoản đã bị khóa bởi Quản trị viên");
            }

            // 2. Kiểm tra tài khoản bị tạm khóa do nhập sai nhiều lần (BR-03)
            if (candidate.getLockedUntil() != null) {
                LocalDateTime now = LocalDateTime.now();
                if (now.isBefore(candidate.getLockedUntil())) {
                    long remainingMinutes = Duration.between(now, candidate.getLockedUntil()).toMinutes() + 1;
                    throw new UnauthorizedException("Tài khoản đang bị tạm khóa do nhập sai mật khẩu quá 5 lần. Vui lòng thử lại sau " + remainingMinutes + " phút");
                } else {
                    // Đã hết thời gian tạm khóa => tự động mở lại
                    candidate.setLockedUntil(null);
                    candidate.setFailedLoginCount(0);
                    userRepository.save(candidate);
                }
            }
        }

        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(login, dto.getPassword()));
        } catch (DisabledException ex) {
            throw new UnauthorizedException("Tài khoản đã bị khóa");
        } catch (AuthenticationException ex) {
            // Ghi nhận số lần đăng nhập sai nếu tài khoản có tồn tại
            if (userOpt.isPresent()) {
                UserModel candidate = userOpt.get();
                int currentFailures = candidate.getFailedLoginCount() + 1;
                candidate.setFailedLoginCount(currentFailures);
                if (currentFailures >= MAX_FAILED_LOGIN_ATTEMPTS) {
                    candidate.setLockedUntil(LocalDateTime.now().plusMinutes(LOCKOUT_DURATION_MINUTES));
                    userRepository.save(candidate);
                    throw new UnauthorizedException("Tài khoản đã bị tạm khóa 15 phút do nhập sai mật khẩu 5 lần liên tiếp");
                }
                userRepository.save(candidate);
            }
            throw new UnauthorizedException("Sai tên đăng nhập hoặc mật khẩu");
        }

        UserModel user = userOpt.orElseGet(() -> userRepository.findByLogin(login)
                .orElseThrow(() -> new UnauthorizedException("Sai tên đăng nhập hoặc mật khẩu")));

        if (!user.isVerified()) {
            throw new UnauthorizedException("Vui lòng xác thực email trước khi đăng nhập");
        }

        // Đăng nhập thành công: xóa bộ đếm đăng nhập sai và cập nhật thời gian đăng nhập gần nhất
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        user.setLastLoginAt(LocalDateTime.now());
        userRepository.save(user);

        String token = jwtUtil.generateToken(user);
        return new AuthResponse(token, TOKEN_TYPE, jwtUtil.extractExpiration(token), UserMapper.toDto(user));
    }

    @Override
    public void logout(String token) {
        tokenRevocationService.revoke(token);
    }

    @Override
    @Transactional
    public UserDto register(RegisterDto dto) {
        String userName = dto.getUserName().trim().toLowerCase(Locale.ROOT);
        String email = dto.getEmail().trim().toLowerCase(Locale.ROOT);

        if (userRepository.existsByUserNameIgnoreCase(userName)) {
            throw new ConflictException("Tên đăng nhập đã tồn tại");
        }
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ConflictException("Email đã được sử dụng");
        }

        UserModel user = new UserModel();
        user.setUserName(userName);
        user.setEmail(email);
        user.setPassword(passwordEncoder.encode(dto.getPassword()));
        user.setFirstName(dto.getFirstName().trim());
        user.setLastName(trimToNull(dto.getLastName()));
        user.setPhone(trimToNull(dto.getPhone()));
        user.setRoleEntity(findRole(UserRole.USER));
        user.setStatus(UserStatus.ACTIVE);
        user.setVerified(!emailVerificationEnabled);
        user.setPreferredLocale("vi");

        UserModel saved = userRepository.save(user);
        if (emailVerificationEnabled) {
            sendVerificationEmail(saved);
        }
        return UserMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        verifyEmailInternal(token);
    }

    @Override
    @Transactional
    public void verifyEmailDirect(String token) {
        verifyEmailInternal(token);
    }

    private void verifyEmailInternal(String token) {
        if (token == null || token.isBlank()) {
            throw new BadRequestException("Token không hợp lệ");
        }
        EmailVerificationTokenModel tokenModel = emailVerificationTokenRepository.findByToken(token.trim())
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        if (tokenModel.isUsed() || tokenModel.isExpired()) {
            throw new BadRequestException("Token đã được sử dụng hoặc đã hết hạn");
        }

        UserModel user = userRepository.findById(tokenModel.getUserId())
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        user.setVerified(true);
        user.setEmailVerifiedAt(LocalDateTime.now());
        tokenModel.setUsed(true);
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String contactInfo) {
        if (contactInfo == null || contactInfo.isBlank()) {
            return;
        }
        // Không tiết lộ tài khoản có tồn tại hay không
        userRepository.findByLogin(contactInfo.trim())
                .filter(user -> !user.isVerified())
                .ifPresent(this::sendVerificationEmail);
    }

    @Override
    @Transactional
    public void initiateForgotPassword(String contactInfo) {
        if (contactInfo == null || contactInfo.isBlank()) {
            return;
        }
        // Không tiết lộ tài khoản có tồn tại hay không
        userRepository.findByLogin(contactInfo.trim()).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUserId(user.getId());

            PasswordResetTokenModel tokenModel = new PasswordResetTokenModel();
            tokenModel.setToken(UUID.randomUUID().toString());
            tokenModel.setUserId(user.getId());
            tokenModel.setExpiresAt(LocalDateTime.now().plusMinutes(resetTtlMinutes));
            passwordResetTokenRepository.save(tokenModel);

            log.info("[AUTH] Đã tạo Password Reset Token cho user {}: {}", user.getEmail(), tokenModel.getToken());
            String resetUrl = clientUrl + "/reset-password?token=" + tokenModel.getToken();
            emailService.sendHtmlEmail(user.getEmail(), "Đặt lại mật khẩu",
                    AuthEmailTemplates.resetPassword(user.getFullName(), resetUrl, resetTtlMinutes));
        });
    }

    @Override
    @Transactional(readOnly = true)
    public TokenValidationResponseDto validateResetToken(String token) {
        if (token == null || token.isBlank()) {
            return TokenValidationResponseDto.builder()
                    .valid(false)
                    .message("Token không được để trống")
                    .build();
        }

        Optional<PasswordResetTokenModel> tokenOpt = passwordResetTokenRepository.findByToken(token.trim());
        if (tokenOpt.isEmpty()) {
            return TokenValidationResponseDto.builder()
                    .valid(false)
                    .message("Token không tồn tại hoặc không hợp lệ")
                    .build();
        }

        PasswordResetTokenModel tokenModel = tokenOpt.get();
        if (tokenModel.isUsed()) {
            return TokenValidationResponseDto.builder()
                    .valid(false)
                    .message("Token đã được sử dụng")
                    .build();
        }

        if (tokenModel.isExpired()) {
            return TokenValidationResponseDto.builder()
                    .valid(false)
                    .message("Token đã hết hạn")
                    .build();
        }

        UserModel user = userRepository.findById(tokenModel.getUserId()).orElse(null);
        return TokenValidationResponseDto.builder()
                .valid(true)
                .message("Token hợp lệ")
                .email(user != null ? user.getEmail() : null)
                .build();
    }

    @Override
    @Transactional
    public void completeForgotPassword(CompleteForgotPasswordDto dto) {
        if (!dto.getNewPassword().equals(dto.getConfirmNewPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp");
        }

        PasswordResetTokenModel tokenModel = passwordResetTokenRepository.findByToken(dto.getResetToken().trim())
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        if (tokenModel.isUsed() || tokenModel.isExpired()) {
            throw new BadRequestException("Token đã được sử dụng hoặc đã hết hạn");
        }

        UserModel user = userRepository.findById(tokenModel.getUserId())
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
        tokenModel.setUsed(true);

        emailService.sendHtmlEmail(user.getEmail(), "Mật khẩu đã được thay đổi",
                AuthEmailTemplates.passwordChanged(user.getFullName()));
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isAccountVerified(String contactInfo) {
        if (contactInfo == null || contactInfo.isBlank()) {
            return false;
        }
        return userRepository.findByLogin(contactInfo.trim())
                .map(UserModel::isVerified)
                .orElse(false);
    }

    private void sendVerificationEmail(UserModel user) {
        emailVerificationTokenRepository.deleteByUserId(user.getId());

        EmailVerificationTokenModel tokenModel = new EmailVerificationTokenModel();
        tokenModel.setToken(UUID.randomUUID().toString());
        tokenModel.setUserId(user.getId());
        tokenModel.setExpiresAt(LocalDateTime.now().plusHours(verificationTtlHours));
        emailVerificationTokenRepository.save(tokenModel);

        log.info("[AUTH] Đã tạo Email Verification Token cho user {}: {}", user.getEmail(), tokenModel.getToken());
        String verifyUrl = apiUrl + "/api/auth/verify-email?token=" + tokenModel.getToken();
        emailService.sendHtmlEmail(user.getEmail(), "Xác thực tài khoản",
                AuthEmailTemplates.verifyEmail(user.getFullName(), verifyUrl, verificationTtlHours));
    }

    private RoleModel findRole(UserRole role) {
        return roleRepository.findByName(role.name())
                .orElseThrow(() -> new IllegalStateException("Role " + role + " chưa được seed"));
    }

    private static String trimToNull(String value) {
        if (value == null) {
            return null;
        }
        String trimmed = value.trim();
        return trimmed.isEmpty() ? null : trimmed;
    }
}
