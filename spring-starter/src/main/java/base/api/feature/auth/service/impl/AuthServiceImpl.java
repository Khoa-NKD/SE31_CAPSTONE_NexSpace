package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.response.AuthResponse;
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

import java.time.LocalDateTime;
import java.util.Locale;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements IAuthService {

    private static final String TOKEN_TYPE = "Bearer";

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
    @Transactional(readOnly = true)
    public AuthResponse login(AuthRequest dto) {
        String login = dto.getUsername().trim();
        try {
            authenticationManager.authenticate(new UsernamePasswordAuthenticationToken(login, dto.getPassword()));
        } catch (DisabledException ex) {
            throw new UnauthorizedException("Tài khoản đã bị khóa");
        } catch (AuthenticationException ex) {
            throw new UnauthorizedException("Sai tên đăng nhập hoặc mật khẩu");
        }

        UserModel user = userRepository.findByLogin(login)
                .orElseThrow(() -> new UnauthorizedException("Sai tên đăng nhập hoặc mật khẩu"));
        if (!user.isVerified()) {
            throw new UnauthorizedException("Vui lòng xác thực email trước khi đăng nhập");
        }

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

        UserModel saved = userRepository.save(user);
        if (emailVerificationEnabled) {
            sendVerificationEmail(saved);
        }
        return UserMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void verifyEmail(String token) {
        EmailVerificationTokenModel tokenModel = emailVerificationTokenRepository.findByToken(token)
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        if (tokenModel.isUsed() || tokenModel.isExpired()) {
            throw new BadRequestException("Token đã được sử dụng hoặc đã hết hạn");
        }

        UserModel user = userRepository.findById(tokenModel.getUserId())
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        user.setVerified(true);
        tokenModel.setUsed(true);
    }

    @Override
    @Transactional
    public void resendVerificationEmail(String contactInfo) {
        // Không tiết lộ tài khoản có tồn tại hay không.
        userRepository.findByLogin(contactInfo)
                .filter(user -> !user.isVerified())
                .ifPresent(this::sendVerificationEmail);
    }

    @Override
    @Transactional
    public void initiateForgotPassword(String contactInfo) {
        // Không tiết lộ tài khoản có tồn tại hay không.
        userRepository.findByLogin(contactInfo).ifPresent(user -> {
            passwordResetTokenRepository.deleteByUserId(user.getId());

            PasswordResetTokenModel tokenModel = new PasswordResetTokenModel();
            tokenModel.setToken(UUID.randomUUID().toString());
            tokenModel.setUserId(user.getId());
            tokenModel.setExpiresAt(LocalDateTime.now().plusMinutes(resetTtlMinutes));
            passwordResetTokenRepository.save(tokenModel);

            String resetUrl = clientUrl + "/reset-password?token=" + tokenModel.getToken();
            emailService.sendHtmlEmail(user.getEmail(), "Đặt lại mật khẩu",
                    AuthEmailTemplates.resetPassword(user.getFullName(), resetUrl, resetTtlMinutes));
        });
    }

    @Override
    @Transactional
    public void completeForgotPassword(CompleteForgotPasswordDto dto) {
        if (!dto.getNewPassword().equals(dto.getConfirmNewPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp");
        }

        PasswordResetTokenModel tokenModel = passwordResetTokenRepository.findByToken(dto.getResetToken())
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        if (tokenModel.isUsed() || tokenModel.isExpired()) {
            throw new BadRequestException("Token đã được sử dụng hoặc đã hết hạn");
        }

        UserModel user = userRepository.findById(tokenModel.getUserId())
                .orElseThrow(() -> new BadRequestException("Token không hợp lệ"));
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        tokenModel.setUsed(true);

        emailService.sendHtmlEmail(user.getEmail(), "Mật khẩu đã được thay đổi",
                AuthEmailTemplates.passwordChanged(user.getFullName()));
    }

    private void sendVerificationEmail(UserModel user) {
        emailVerificationTokenRepository.deleteByUserId(user.getId());

        EmailVerificationTokenModel tokenModel = new EmailVerificationTokenModel();
        tokenModel.setToken(UUID.randomUUID().toString());
        tokenModel.setUserId(user.getId());
        tokenModel.setExpiresAt(LocalDateTime.now().plusHours(verificationTtlHours));
        emailVerificationTokenRepository.save(tokenModel);

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
