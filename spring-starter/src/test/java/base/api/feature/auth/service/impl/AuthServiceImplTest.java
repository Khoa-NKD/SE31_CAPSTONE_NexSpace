package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.TokenValidationResponseDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.repository.IEmailVerificationTokenRepository;
import base.api.feature.auth.repository.IPasswordResetTokenRepository;
import base.api.feature.auth.repository.IRoleRepository;
import base.api.feature.auth.repository.IUserRepository;
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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.DisabledException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class AuthServiceImplTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);

    private AuthenticationManager authenticationManager;
    private IUserRepository userRepository;
    private IRoleRepository roleRepository;
    private IEmailVerificationTokenRepository emailVerificationTokenRepository;
    private IPasswordResetTokenRepository passwordResetTokenRepository;
    private ITokenRevocationService tokenRevocationService;
    private JwtUtil jwtUtil;
    private EmailService emailService;

    private AuthServiceImpl authService;
    private UserModel activeUser;

    @BeforeEach
    void setUp() {
        authenticationManager = mock(AuthenticationManager.class);
        userRepository = mock(IUserRepository.class);
        roleRepository = mock(IRoleRepository.class);
        emailVerificationTokenRepository = mock(IEmailVerificationTokenRepository.class);
        passwordResetTokenRepository = mock(IPasswordResetTokenRepository.class);
        tokenRevocationService = mock(ITokenRevocationService.class);
        jwtUtil = mock(JwtUtil.class);
        emailService = mock(EmailService.class);

        authService = new AuthServiceImpl(
                authenticationManager,
                userRepository,
                roleRepository,
                emailVerificationTokenRepository,
                passwordResetTokenRepository,
                tokenRevocationService,
                passwordEncoder,
                jwtUtil,
                emailService
        );

        ReflectionTestUtils.setField(authService, "emailVerificationEnabled", false);
        ReflectionTestUtils.setField(authService, "verificationTtlHours", 48L);
        ReflectionTestUtils.setField(authService, "resetTtlMinutes", 60L);
        ReflectionTestUtils.setField(authService, "apiUrl", "http://localhost:8080");
        ReflectionTestUtils.setField(authService, "clientUrl", "http://localhost:5173");

        activeUser = new UserModel();
        activeUser.setId(10L);
        activeUser.setUserName("tester");
        activeUser.setEmail("tester@nexspace.vn");
        activeUser.setPassword(passwordEncoder.encode("Password@123"));
        activeUser.setFirstName("Khoa");
        activeUser.setLastName("Dang");
        activeUser.setRoleEntity(new RoleModel(UserRole.USER.name(), "User"));
        activeUser.setStatus(UserStatus.ACTIVE);
        activeUser.setVerified(true);

        when(userRepository.save(any(UserModel.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. ĐĂNG KÝ TÀI KHOẢN (REGISTER)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Đăng ký tài khoản thành công khi thông tin hợp lệ (Verification Disabled)")
    void register_Success_EmailVerificationDisabled() {
        RegisterDto dto = new RegisterDto();
        dto.setUserName("newuser");
        dto.setEmail("newuser@nexspace.vn");
        dto.setPassword("Secret@123");
        dto.setFirstName("Nguyen");
        dto.setLastName("Van A");
        dto.setPhone("0912345678");

        when(userRepository.existsByUserNameIgnoreCase("newuser")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("newuser@nexspace.vn")).thenReturn(false);
        when(roleRepository.findByName(UserRole.USER.name()))
                .thenReturn(Optional.of(new RoleModel(UserRole.USER.name(), "User")));

        UserDto result = authService.register(dto);

        assertThat(result).isNotNull();
        assertThat(result.getUserName()).isEqualTo("newuser");
        assertThat(result.getEmail()).isEqualTo("newuser@nexspace.vn");
        assertThat(result.isVerified()).isTrue();
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
        verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Đăng ký tài khoản khi bật xác thực email: tài khoản ở trạng thái chưa verify và gửi mail")
    void register_Success_EmailVerificationEnabled() {
        ReflectionTestUtils.setField(authService, "emailVerificationEnabled", true);

        RegisterDto dto = new RegisterDto();
        dto.setUserName("unverified");
        dto.setEmail("unverified@nexspace.vn");
        dto.setPassword("Secret@123");
        dto.setFirstName("Le");
        dto.setLastName("Thi B");

        when(userRepository.existsByUserNameIgnoreCase("unverified")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("unverified@nexspace.vn")).thenReturn(false);
        when(roleRepository.findByName(UserRole.USER.name()))
                .thenReturn(Optional.of(new RoleModel(UserRole.USER.name(), "User")));

        UserDto result = authService.register(dto);

        assertThat(result.isVerified()).isFalse();
        verify(emailVerificationTokenRepository).save(any(EmailVerificationTokenModel.class));
        verify(emailService).sendHtmlEmail(eq("unverified@nexspace.vn"), eq("Xác thực tài khoản"), anyString());
    }

    @Test
    @DisplayName("Đăng ký thất bại khi trùng tên đăng nhập")
    void register_DuplicateUserName_ThrowsConflict() {
        RegisterDto dto = new RegisterDto();
        dto.setUserName("tester");
        dto.setEmail("unique@nexspace.vn");
        dto.setPassword("Secret@123");
        dto.setFirstName("Khoa");

        when(userRepository.existsByUserNameIgnoreCase("tester")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Tên đăng nhập đã tồn tại");
    }

    @Test
    @DisplayName("Đăng ký thất bại khi trùng email")
    void register_DuplicateEmail_ThrowsConflict() {
        RegisterDto dto = new RegisterDto();
        dto.setUserName("uniqueuser");
        dto.setEmail("tester@nexspace.vn");
        dto.setPassword("Secret@123");
        dto.setFirstName("Khoa");

        when(userRepository.existsByUserNameIgnoreCase("uniqueuser")).thenReturn(false);
        when(userRepository.existsByEmailIgnoreCase("tester@nexspace.vn")).thenReturn(true);

        assertThatThrownBy(() -> authService.register(dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Email đã được sử dụng");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. ĐĂNG NHẬP & BẢO VỆ BRUTE-FORCE (LOGIN & BR-03)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Đăng nhập thành công: cấp JWT, cập nhật lastLoginAt và reset failedLoginCount")
    void login_Success() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        activeUser.setFailedLoginCount(2);
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));
        when(jwtUtil.generateToken(activeUser)).thenReturn("jwt.token.nexspace");
        when(jwtUtil.extractExpiration("jwt.token.nexspace")).thenReturn(Instant.now().plusSeconds(3600));

        AuthResponse resp = authService.login(req);

        assertThat(resp).isNotNull();
        assertThat(resp.getAccessToken()).isEqualTo("jwt.token.nexspace");
        assertThat(resp.getTokenType()).isEqualTo("Bearer");
        assertThat(resp.getUser().getUserName()).isEqualTo("tester");
        assertThat(activeUser.getFailedLoginCount()).isZero();
        assertThat(activeUser.getLastLoginAt()).isNotNull();
    }

    @Test
    @DisplayName("Đăng nhập sai mật khẩu: tăng failedLoginCount")
    void login_WrongPassword_IncrementsFailedCount() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("WrongPassword");

        activeUser.setFailedLoginCount(2);
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Sai tên đăng nhập hoặc mật khẩu");

        assertThat(activeUser.getFailedLoginCount()).isEqualTo(3);
        assertThat(activeUser.getLockedUntil()).isNull();
    }

    @Test
    @DisplayName("Đăng nhập sai lần thứ 5: kích hoạt BR-03 tự động tạm khóa tài khoản 15 phút")
    void login_FifthWrongPassword_LocksAccountFor15Minutes() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("WrongPassword");

        activeUser.setFailedLoginCount(4);
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));
        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("tạm khóa 15 phút do nhập sai mật khẩu 5 lần");

        assertThat(activeUser.getFailedLoginCount()).isEqualTo(5);
        assertThat(activeUser.getLockedUntil()).isNotNull();
        assertThat(activeUser.getLockedUntil()).isAfter(LocalDateTime.now().plusMinutes(14));
    }

    @Test
    @DisplayName("Đang trong thời gian phạt tạm khóa: từ chối đăng nhập ngay lập tức")
    void login_CurrentlyTemporarilyLocked_RejectsImmediately() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("AnyPassword");

        activeUser.setLockedUntil(LocalDateTime.now().plusMinutes(10));
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Tài khoản đang bị tạm khóa do nhập sai mật khẩu quá 5 lần");

        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    @DisplayName("Đã hết thời gian phạt: tự động mở khóa và cho phép đăng nhập thành công")
    void login_LockoutExpired_AutoUnlocksAndAllowsLogin() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        activeUser.setFailedLoginCount(5);
        activeUser.setLockedUntil(LocalDateTime.now().minusMinutes(1)); // Đã hết hạn phạt
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));
        when(jwtUtil.generateToken(activeUser)).thenReturn("valid.token");
        when(jwtUtil.extractExpiration("valid.token")).thenReturn(Instant.now().plusSeconds(3600));

        AuthResponse resp = authService.login(req);

        assertThat(resp).isNotNull();
        assertThat(activeUser.getLockedUntil()).isNull();
        assertThat(activeUser.getFailedLoginCount()).isZero();
    }

    @Test
    @DisplayName("Tài khoản bị Quản trị viên khóa vĩnh viễn (LOCKED): chặn đăng nhập")
    void login_AdminLockedAccount_ThrowsUnauthorized() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        activeUser.setStatus(UserStatus.LOCKED);
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Tài khoản đã bị khóa bởi Quản trị viên");

        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    @DisplayName("Tài khoản chưa xác thực email: chặn đăng nhập")
    void login_UnverifiedUser_ThrowsUnauthorized() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        activeUser.setVerified(false);
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Vui lòng xác thực email trước khi đăng nhập");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 3. ĐĂNG XUẤT (LOGOUT)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Đăng xuất: thu hồi JWT đưa vào danh sách đen blacklist")
    void logout_RevokesToken() {
        String token = "jwt.valid.token";

        authService.logout(token);

        verify(tokenRevocationService).revoke(token);
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 4. QUÊN MẬT KHẨU (FORGOT PASSWORD INITIATE & VALIDATE)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Quên mật khẩu với tài khoản tồn tại: xóa token cũ, tạo token mới và gửi email")
    void initiateForgotPassword_ExistingUser_GeneratesTokenAndSendsEmail() {
        when(userRepository.findByLogin("tester@nexspace.vn")).thenReturn(Optional.of(activeUser));

        authService.initiateForgotPassword("tester@nexspace.vn");

        verify(passwordResetTokenRepository).deleteByUserId(activeUser.getId());
        verify(passwordResetTokenRepository).save(any(PasswordResetTokenModel.class));
        verify(emailService).sendHtmlEmail(eq(activeUser.getEmail()), eq("Đặt lại mật khẩu"), anyString());
    }

    @Test
    @DisplayName("Quên mật khẩu với tài khoản không tồn tại: hoàn thành trong im lặng (chống user enumeration)")
    void initiateForgotPassword_NonExistingUser_SilentSuccess() {
        when(userRepository.findByLogin("unknown@nexspace.vn")).thenReturn(Optional.empty());

        authService.initiateForgotPassword("unknown@nexspace.vn");

        verify(passwordResetTokenRepository, never()).deleteByUserId(any());
        verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Kiểm tra tính hợp lệ của token đặt lại mật khẩu: thành công khi token còn hiệu lực")
    void validateResetToken_Valid() {
        PasswordResetTokenModel tokenModel = new PasswordResetTokenModel();
        tokenModel.setToken("reset-uuid-token");
        tokenModel.setUserId(10L);
        tokenModel.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        tokenModel.setUsed(false);

        when(passwordResetTokenRepository.findByToken("reset-uuid-token")).thenReturn(Optional.of(tokenModel));
        when(userRepository.findById(10L)).thenReturn(Optional.of(activeUser));

        TokenValidationResponseDto resp = authService.validateResetToken("reset-uuid-token");

        assertThat(resp.isValid()).isTrue();
        assertThat(resp.getEmail()).isEqualTo("tester@nexspace.vn");
    }

    @Test
    @DisplayName("Kiểm tra tính hợp lệ của token đặt lại mật khẩu: thất bại khi token đã dùng hoặc hết hạn")
    void validateResetToken_ExpiredOrUsed() {
        PasswordResetTokenModel usedToken = new PasswordResetTokenModel();
        usedToken.setToken("used-token");
        usedToken.setUserId(10L);
        usedToken.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        usedToken.setUsed(true);

        when(passwordResetTokenRepository.findByToken("used-token")).thenReturn(Optional.of(usedToken));

        TokenValidationResponseDto resp = authService.validateResetToken("used-token");

        assertThat(resp.isValid()).isFalse();
        assertThat(resp.getMessage()).contains("đã được sử dụng");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 5. ĐẶT LẠI MẬT KHẨU (COMPLETE FORGOT PASSWORD)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Đặt lại mật khẩu thành công: băm mật khẩu mới, đánh dấu token đã dùng, xóa khóa tạm")
    void completeForgotPassword_Success() {
        CompleteForgotPasswordDto dto = new CompleteForgotPasswordDto();
        dto.setResetToken("valid-token");
        dto.setNewPassword("NewPass@123");
        dto.setConfirmNewPassword("NewPass@123");

        PasswordResetTokenModel tokenModel = new PasswordResetTokenModel();
        tokenModel.setToken("valid-token");
        tokenModel.setUserId(activeUser.getId());
        tokenModel.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        tokenModel.setUsed(false);

        activeUser.setFailedLoginCount(5);
        activeUser.setLockedUntil(LocalDateTime.now().plusMinutes(10));

        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(tokenModel));
        when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));

        authService.completeForgotPassword(dto);

        assertThat(passwordEncoder.matches("NewPass@123", activeUser.getPassword())).isTrue();
        assertThat(tokenModel.isUsed()).isTrue();
        assertThat(activeUser.getFailedLoginCount()).isZero();
        assertThat(activeUser.getLockedUntil()).isNull();
        verify(emailService).sendHtmlEmail(eq(activeUser.getEmail()), eq("Mật khẩu đã được thay đổi"), anyString());
    }

    @Test
    @DisplayName("Đặt lại mật khẩu thất bại khi mật khẩu xác nhận không khớp")
    void completeForgotPassword_MismatchedConfirmation_ThrowsBadRequest() {
        CompleteForgotPasswordDto dto = new CompleteForgotPasswordDto();
        dto.setResetToken("valid-token");
        dto.setNewPassword("NewPass@123");
        dto.setConfirmNewPassword("OtherPass@123");

        assertThatThrownBy(() -> authService.completeForgotPassword(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Mật khẩu xác nhận không khớp");
    }

    @Test
    @DisplayName("Đặt lại mật khẩu thất bại khi mật khẩu mới trùng mật khẩu hiện tại")
    void completeForgotPassword_SameAsOldPassword_ThrowsBadRequest() {
        CompleteForgotPasswordDto dto = new CompleteForgotPasswordDto();
        dto.setResetToken("valid-token");
        dto.setNewPassword("Password@123");
        dto.setConfirmNewPassword("Password@123");

        PasswordResetTokenModel tokenModel = new PasswordResetTokenModel();
        tokenModel.setToken("valid-token");
        tokenModel.setUserId(activeUser.getId());
        tokenModel.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        tokenModel.setUsed(false);

        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(tokenModel));
        when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));

        assertThatThrownBy(() -> authService.completeForgotPassword(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Mật khẩu mới không được trùng với mật khẩu hiện tại");
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 6. XÁC MINH EMAIL (VERIFY EMAIL & RESEND)
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Xác minh email thành công: cập nhật is_verified=true và email_verified_at")
    void verifyEmail_Success() {
        EmailVerificationTokenModel tokenModel = new EmailVerificationTokenModel();
        tokenModel.setToken("verify-token");
        tokenModel.setUserId(activeUser.getId());
        tokenModel.setExpiresAt(LocalDateTime.now().plusHours(24));
        tokenModel.setUsed(false);

        activeUser.setVerified(false);
        when(emailVerificationTokenRepository.findByToken("verify-token")).thenReturn(Optional.of(tokenModel));
        when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));

        authService.verifyEmailDirect("verify-token");

        assertThat(activeUser.isVerified()).isTrue();
        assertThat(activeUser.getEmailVerifiedAt()).isNotNull();
        assertThat(tokenModel.isUsed()).isTrue();
    }

    @Test
    @DisplayName("Xác minh email thất bại khi token không hợp lệ hoặc đã sử dụng")
    void verifyEmail_UsedToken_ThrowsBadRequest() {
        EmailVerificationTokenModel tokenModel = new EmailVerificationTokenModel();
        tokenModel.setToken("used-token");
        tokenModel.setUserId(activeUser.getId());
        tokenModel.setExpiresAt(LocalDateTime.now().plusHours(24));
        tokenModel.setUsed(true);

        when(emailVerificationTokenRepository.findByToken("used-token")).thenReturn(Optional.of(tokenModel));

        assertThatThrownBy(() -> authService.verifyEmailDirect("used-token"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Token đã được sử dụng hoặc đã hết hạn");
    }

    @Test
    @DisplayName("Gửi lại email xác thực cho tài khoản chưa verify")
    void resendVerificationEmail_UnverifiedUser_GeneratesToken() {
        activeUser.setVerified(false);
        when(userRepository.findByLogin("tester@nexspace.vn")).thenReturn(Optional.of(activeUser));

        authService.resendVerificationEmail("tester@nexspace.vn");

        verify(emailVerificationTokenRepository).deleteByUserId(activeUser.getId());
        verify(emailVerificationTokenRepository).save(any(EmailVerificationTokenModel.class));
        verify(emailService).sendHtmlEmail(eq(activeUser.getEmail()), eq("Xác thực tài khoản"), anyString());
    }
}
