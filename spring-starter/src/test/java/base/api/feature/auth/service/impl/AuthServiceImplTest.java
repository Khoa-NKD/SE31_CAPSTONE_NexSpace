package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.GoogleAuthRequestDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.GoogleAuthResponseDto;
import base.api.feature.auth.dto.response.TokenValidationResponseDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.impl.GoogleTokenVerifierService.GoogleUserPayload;
import base.api.feature.auth.repository.IEmailVerificationTokenRepository;
import base.api.feature.auth.repository.IPasswordResetTokenRepository;
import base.api.feature.auth.repository.IRoleRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.service.ITokenRevocationService;
import base.api.shared.config.EmailService;
import base.api.shared.config.JwtUtil;
import base.api.shared.config.TrustedClockService;
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
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
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
    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private LocalDateTime nowInVietnam() {
        return LocalDateTime.now(VIETNAM_ZONE);
    }

    private AuthenticationManager authenticationManager;
    private IUserRepository userRepository;
    private IRoleRepository roleRepository;
    private IEmailVerificationTokenRepository emailVerificationTokenRepository;
    private IPasswordResetTokenRepository passwordResetTokenRepository;
    private ITokenRevocationService tokenRevocationService;
    private JwtUtil jwtUtil;
    private EmailService emailService;
    private EmailDeliverabilityValidator emailDeliverabilityValidator;
    private TrustedClockService trustedClockService;
    private GoogleTokenVerifierService googleTokenVerifierService;

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
        emailDeliverabilityValidator = mock(EmailDeliverabilityValidator.class);
        trustedClockService = mock(TrustedClockService.class);
        googleTokenVerifierService = mock(GoogleTokenVerifierService.class);
        when(trustedClockService.nowInVietnam()).thenAnswer(inv -> nowInVietnam());

        authService = new AuthServiceImpl(
                authenticationManager,
                userRepository,
                roleRepository,
                emailVerificationTokenRepository,
                passwordResetTokenRepository,
                tokenRevocationService,
                passwordEncoder,
                jwtUtil,
                emailService,
                emailDeliverabilityValidator,
                trustedClockService,
                googleTokenVerifierService
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
    @DisplayName("Đăng nhập tài khoản không tồn tại: ném UnauthorizedException với thông báo Tài khoản không tồn tại")
    void login_NonExistingUser_ThrowsUnauthorized() {
        AuthRequest req = new AuthRequest();
        req.setUsername("ghostuser");
        req.setPassword("Password@123");

        when(userRepository.findByLogin("ghostuser")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Tài khoản không tồn tại");
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
                .hasMessageContaining("Mật khẩu không chính xác");

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
        assertThat(activeUser.getLockedUntil()).isAfter(nowInVietnam().plusMinutes(14));
    }

    @Test
    @DisplayName("Đang trong thời gian phạt tạm khóa: từ chối đăng nhập ngay lập tức")
    void login_CurrentlyTemporarilyLocked_RejectsImmediately() {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("AnyPassword");

        activeUser.setLockedUntil(nowInVietnam().plusMinutes(10));
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
        activeUser.setLockedUntil(nowInVietnam().minusMinutes(1)); // Đã hết hạn phạt
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
    void initiateForgotPassword_NonExistingUser_ThrowsBadRequest() {
        when(userRepository.findByLogin("unknown@nexspace.vn")).thenReturn(Optional.empty());

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.initiateForgotPassword("unknown@nexspace.vn"))
                .isInstanceOf(base.api.shared.exception.BadRequestException.class)
                .hasMessageContaining("Tài khoản không tồn tại");

        verify(passwordResetTokenRepository, never()).deleteByUserId(any());
        verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Quên mật khẩu với tài khoản chưa xác thực email: ném BadRequestException")
    void initiateForgotPassword_UnverifiedUser_ThrowsBadRequest() {
        UserModel unverifiedUser = new UserModel();
        unverifiedUser.setId(20L);
        unverifiedUser.setEmail("unverified@nexspace.vn");
        unverifiedUser.setVerified(false);

        when(userRepository.findByLogin("unverified@nexspace.vn")).thenReturn(Optional.of(unverifiedUser));

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> authService.initiateForgotPassword("unverified@nexspace.vn"))
                .isInstanceOf(base.api.shared.exception.BadRequestException.class)
                .hasMessageContaining("chưa được xác thực email");

        verify(passwordResetTokenRepository, never()).deleteByUserId(any());
        verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Kiểm tra token đặt lại mật khẩu: thất bại khi tài khoản bị khóa hoặc vô hiệu hóa")
    void validateResetToken_LockedOrInactiveUser_ReturnsInvalid() {
        PasswordResetTokenModel tokenModel = new PasswordResetTokenModel();
        tokenModel.setToken("token-locked-user");
        tokenModel.setUserId(30L);
        tokenModel.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        tokenModel.setUsed(false);

        UserModel lockedUser = new UserModel();
        lockedUser.setId(30L);
        lockedUser.setStatus(UserStatus.LOCKED);

        when(passwordResetTokenRepository.findByToken("token-locked-user")).thenReturn(Optional.of(tokenModel));
        when(userRepository.findById(30L)).thenReturn(Optional.of(lockedUser));

        TokenValidationResponseDto resp = authService.validateResetToken("token-locked-user");
        assertThat(resp.isValid()).isFalse();
        assertThat(resp.getMessage()).contains("Tài khoản đã bị khóa bởi Quản trị viên");

        UserModel inactiveUser = new UserModel();
        inactiveUser.setId(30L);
        inactiveUser.setStatus(UserStatus.INACTIVE);
        when(userRepository.findById(30L)).thenReturn(Optional.of(inactiveUser));

        TokenValidationResponseDto resp2 = authService.validateResetToken("token-locked-user");
        assertThat(resp2.isValid()).isFalse();
        assertThat(resp2.getMessage()).contains("Tài khoản đang bị tạm vô hiệu hóa bởi Quản trị viên");
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
        activeUser.setLockedUntil(nowInVietnam().plusMinutes(10));

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

    @Test
    @DisplayName("Đặt lại mật khẩu thất bại khi tài khoản bị khóa hoặc tạm vô hiệu hóa")
    void completeForgotPassword_LockedOrInactiveUser_ThrowsBadRequest() {
        CompleteForgotPasswordDto dto = new CompleteForgotPasswordDto();
        dto.setResetToken("valid-token");
        dto.setNewPassword("NewPass@123");
        dto.setConfirmNewPassword("NewPass@123");

        PasswordResetTokenModel tokenModel = new PasswordResetTokenModel();
        tokenModel.setToken("valid-token");
        tokenModel.setUserId(30L);
        tokenModel.setExpiresAt(LocalDateTime.now().plusMinutes(30));
        tokenModel.setUsed(false);

        UserModel lockedUser = new UserModel();
        lockedUser.setId(30L);
        lockedUser.setStatus(UserStatus.LOCKED);

        when(passwordResetTokenRepository.findByToken("valid-token")).thenReturn(Optional.of(tokenModel));
        when(userRepository.findById(30L)).thenReturn(Optional.of(lockedUser));

        assertThatThrownBy(() -> authService.completeForgotPassword(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tài khoản đã bị khóa bởi Quản trị viên");

        UserModel inactiveUser = new UserModel();
        inactiveUser.setId(30L);
        inactiveUser.setStatus(UserStatus.INACTIVE);
        when(userRepository.findById(30L)).thenReturn(Optional.of(inactiveUser));

        assertThatThrownBy(() -> authService.completeForgotPassword(dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Tài khoản đang bị tạm vô hiệu hóa bởi Quản trị viên");
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

    @Test
    @DisplayName("Tài khoản đã bị xóa mềm (DELETED): chặn đăng nhập ngay lập tức")
    void login_DeletedAccount_ThrowsUnauthorized() {
        activeUser.setStatus(UserStatus.DELETED);
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));

        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("đã bị xóa");

        verify(authenticationManager, never()).authenticate(any());
    }

    @Test
    @DisplayName("Tài khoản không đăng nhập quá ngưỡng ngày cấu hình: tự động chuyển INACTIVE, hủy verified và gửi email xác thực lại")
    void login_InactiveBeyondThreshold_MarksInactiveAndSendsReverificationEmail() {
        ReflectionTestUtils.setField(authService, "inactiveThresholdDays", 90L);
        activeUser.setLastLoginAt(LocalDateTime.now().minusDays(95));
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));

        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Vui lòng xác thực email trước khi đăng nhập");

        assertThat(activeUser.getStatus()).isEqualTo(UserStatus.INACTIVE);
        assertThat(activeUser.isVerified()).isFalse();
        verify(emailVerificationTokenRepository).save(any(EmailVerificationTokenModel.class));
        verify(emailService).sendHtmlEmail(eq(activeUser.getEmail()), eq("Xác thực lại tài khoản không hoạt động"), anyString());
    }

    @Test
    @DisplayName("Ngưỡng ngày không đăng nhập thay đổi theo biến môi trường cấu hình")
    void login_RespectsConfigurableInactiveThresholdDays() {
        ReflectionTestUtils.setField(authService, "inactiveThresholdDays", 30L);
        activeUser.setLastLoginAt(LocalDateTime.now().minusDays(35));
        when(userRepository.findByLogin("tester")).thenReturn(Optional.of(activeUser));

        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        assertThatThrownBy(() -> authService.login(req))
                .isInstanceOf(UnauthorizedException.class);
        assertThat(activeUser.getStatus()).isEqualTo(UserStatus.INACTIVE);
    }

    @Test
    @DisplayName("Xác thực lại email cho tài khoản INACTIVE sẽ kích hoạt ACTIVE và cập nhật lastLoginAt")
    void verifyEmail_InactiveAccount_ReactivatesAndUpdatesLastLogin() {
        activeUser.setStatus(UserStatus.INACTIVE);
        activeUser.setVerified(false);
        activeUser.setLastLoginAt(LocalDateTime.now().minusDays(120));

        EmailVerificationTokenModel tokenModel = new EmailVerificationTokenModel();
        tokenModel.setToken("reverify-token");
        tokenModel.setUserId(activeUser.getId());
        tokenModel.setExpiresAt(LocalDateTime.now().plusHours(24));
        tokenModel.setUsed(false);

        when(emailVerificationTokenRepository.findByToken("reverify-token")).thenReturn(Optional.of(tokenModel));
        when(userRepository.findById(activeUser.getId())).thenReturn(Optional.of(activeUser));

        authService.verifyEmailDirect("reverify-token");

        assertThat(activeUser.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(activeUser.isVerified()).isTrue();
        assertThat(activeUser.getLastLoginAt()).isAfter(nowInVietnam().minusMinutes(1));
    }

    @Test
    @DisplayName("Gửi lại email xác thực hoạt động cho tài khoản INACTIVE nhưng bỏ qua tài khoản DELETED")
    void resendVerificationEmail_InactiveAllowedButDeletedSkipped() {
        activeUser.setStatus(UserStatus.INACTIVE);
        activeUser.setVerified(false);
        activeUser.setEmailVerifiedAt(LocalDateTime.now().minusDays(100));
        when(userRepository.findByLogin("tester@nexspace.vn")).thenReturn(Optional.of(activeUser));

        authService.resendVerificationEmail("tester@nexspace.vn");
        verify(emailService).sendHtmlEmail(eq(activeUser.getEmail()), eq("Xác thực lại tài khoản không hoạt động"), anyString());

        UserModel deletedUser = new UserModel();
        deletedUser.setId(99L);
        deletedUser.setEmail("deleted@nexspace.vn");
        deletedUser.setStatus(UserStatus.DELETED);
        deletedUser.setVerified(false);
        when(userRepository.findByLogin("deleted@nexspace.vn")).thenReturn(Optional.of(deletedUser));

        authService.resendVerificationEmail("deleted@nexspace.vn");
        verify(emailService, never()).sendHtmlEmail(eq("deleted@nexspace.vn"), anyString(), anyString());
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 7. GOOGLE AUTHENTICATION TESTS
    // ──────────────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Google Login: tài khoản mới chưa từng sử dụng -> khởi tạo tài khoản INACTIVE và gửi email xác thực")
    void loginWithGoogle_NewUser_CreatesInactiveAccountAndSendsVerificationEmail() {
        GoogleAuthRequestDto requestDto = new GoogleAuthRequestDto("valid-google-id-token");
        GoogleUserPayload payload = GoogleUserPayload.builder()
                .sub("google-sub-12345")
                .email("newuser@gmail.com")
                .emailVerified(true)
                .name("New User")
                .givenName("New")
                .familyName("User")
                .picture("https://lh3.googleusercontent.com/avatar.jpg")
                .build();

        when(googleTokenVerifierService.verifyToken("valid-google-id-token")).thenReturn(payload);
        when(userRepository.findByEmailIgnoreCase("newuser@gmail.com")).thenReturn(Optional.empty());
        when(userRepository.findByGoogleId("google-sub-12345")).thenReturn(Optional.empty());
        when(userRepository.existsByUserNameIgnoreCase(anyString())).thenReturn(false);

        RoleModel userRole = new RoleModel();
        userRole.setName("USER");
        when(roleRepository.findByName("USER")).thenReturn(Optional.of(userRole));

        when(userRepository.save(any(UserModel.class))).thenAnswer(inv -> {
            UserModel u = inv.getArgument(0);
            u.setId(101L);
            return u;
        });

        GoogleAuthResponseDto response = authService.loginWithGoogle(requestDto);

        assertThat(response.isRequiresVerification()).isTrue();
        assertThat(response.getEmail()).isEqualTo("newuser@gmail.com");
        assertThat(response.getAccessToken()).isNull();
        assertThat(response.getMessage()).contains("Chúng tôi đã gửi email xác thực");

        verify(emailService).sendHtmlEmail(eq("newuser@gmail.com"), eq("Xác thực tài khoản"), anyString());
    }

    @Test
    @DisplayName("Google Login: tài khoản đã tồn tại và ACTIVE -> đăng nhập thành công và trả về JWT")
    void loginWithGoogle_ExistingActiveUser_LogsInSuccessfully() {
        GoogleAuthRequestDto requestDto = new GoogleAuthRequestDto("existing-google-id-token");
        GoogleUserPayload payload = GoogleUserPayload.builder()
                .sub("google-sub-existing")
                .email("tester@nexspace.vn")
                .emailVerified(true)
                .name("Tester User")
                .build();

        when(googleTokenVerifierService.verifyToken("existing-google-id-token")).thenReturn(payload);
        when(userRepository.findByEmailIgnoreCase("tester@nexspace.vn")).thenReturn(Optional.of(activeUser));
        when(jwtUtil.generateToken(activeUser)).thenReturn("jwt-token-google-success");
        when(jwtUtil.extractExpiration("jwt-token-google-success")).thenReturn(Instant.now().plusSeconds(3600));

        GoogleAuthResponseDto response = authService.loginWithGoogle(requestDto);

        assertThat(response.isRequiresVerification()).isFalse();
        assertThat(response.getEmail()).isEqualTo("tester@nexspace.vn");
        assertThat(response.getAccessToken()).isEqualTo("jwt-token-google-success");
        assertThat(response.getUser()).isNotNull();
        assertThat(response.getUser().getEmail()).isEqualTo("tester@nexspace.vn");

        verify(emailService, never()).sendHtmlEmail(anyString(), anyString(), anyString());
    }

    @Test
    @DisplayName("Google Login: tài khoản đã tồn tại nhưng chưa xác thực email (INACTIVE) -> gửi lại email xác thực")
    void loginWithGoogle_ExistingInactiveUser_SendsVerificationEmail() {
        GoogleAuthRequestDto requestDto = new GoogleAuthRequestDto("unverified-google-id-token");
        GoogleUserPayload payload = GoogleUserPayload.builder()
                .sub("google-sub-unverified")
                .email("unverified@nexspace.vn")
                .emailVerified(true)
                .name("Unverified User")
                .build();

        UserModel unverifiedUser = new UserModel();
        unverifiedUser.setId(88L);
        unverifiedUser.setEmail("unverified@nexspace.vn");
        unverifiedUser.setStatus(UserStatus.INACTIVE);
        unverifiedUser.setVerified(false);

        when(googleTokenVerifierService.verifyToken("unverified-google-id-token")).thenReturn(payload);
        when(userRepository.findByEmailIgnoreCase("unverified@nexspace.vn")).thenReturn(Optional.of(unverifiedUser));

        GoogleAuthResponseDto response = authService.loginWithGoogle(requestDto);

        assertThat(response.isRequiresVerification()).isTrue();
        assertThat(response.getAccessToken()).isNull();
        assertThat(response.getMessage()).contains("chưa được kích hoạt");

        verify(emailService).sendHtmlEmail(eq("unverified@nexspace.vn"), eq("Xác thực tài khoản"), anyString());
    }

    @Test
    @DisplayName("Google Login: tài khoản bị khóa (LOCKED) hoặc xóa (DELETED) -> ném UnauthorizedException")
    void loginWithGoogle_LockedOrDeletedUser_ThrowsUnauthorized() {
        GoogleAuthRequestDto requestDto = new GoogleAuthRequestDto("locked-google-id-token");
        GoogleUserPayload payload = GoogleUserPayload.builder()
                .sub("google-sub-locked")
                .email("locked@nexspace.vn")
                .emailVerified(true)
                .build();

        UserModel lockedUser = new UserModel();
        lockedUser.setId(90L);
        lockedUser.setEmail("locked@nexspace.vn");
        lockedUser.setStatus(UserStatus.LOCKED);

        when(googleTokenVerifierService.verifyToken("locked-google-id-token")).thenReturn(payload);
        when(userRepository.findByEmailIgnoreCase("locked@nexspace.vn")).thenReturn(Optional.of(lockedUser));

        assertThatThrownBy(() -> authService.loginWithGoogle(requestDto))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Tài khoản đã bị khóa bởi Quản trị viên");

        UserModel deletedUser = new UserModel();
        deletedUser.setId(91L);
        deletedUser.setEmail("locked@nexspace.vn");
        deletedUser.setStatus(UserStatus.DELETED);
        when(userRepository.findByEmailIgnoreCase("locked@nexspace.vn")).thenReturn(Optional.of(deletedUser));

        assertThatThrownBy(() -> authService.loginWithGoogle(requestDto))
                .isInstanceOf(UnauthorizedException.class)
                .hasMessageContaining("Tài khoản đã bị xóa");
    }
}
