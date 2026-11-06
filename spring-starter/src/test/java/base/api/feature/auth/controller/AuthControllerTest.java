package base.api.feature.auth.controller;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.InitiateForgotPasswordDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.request.VerifyTokenRequestDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.TokenValidationResponseDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IAuthService;
import base.api.feature.auth.service.IUserService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.AuthUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.Instant;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doNothing;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AuthControllerTest {

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private MockMvc mockMvc;
    private IAuthService authService;
    private IUserService userService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        authService = mock(IAuthService.class);
        userService = mock(IUserService.class);
        objectMapper = new ObjectMapper();

        AuthController controller = new AuthController(authService, userService);
        ReflectionTestUtils.setField(controller, "clientUrl", "http://localhost:5173");
        ReflectionTestUtils.setField(controller, "currentUserProvider", new base.api.shared.security.CurrentUserProvider());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        UserModel user = new UserModel();
        user.setId(10L);
        user.setUserName("authenticated_user");
        user.setPassword("hashed");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoleEntity(new RoleModel(UserRole.USER.name(), "User"));

        AuthUser principal = new AuthUser(user);
        var auth = UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("POST /api/auth/login - Đăng nhập thành công trả về 200 OK và Token")
    void login_Success() throws Exception {
        AuthRequest req = new AuthRequest();
        req.setUsername("tester");
        req.setPassword("Password@123");

        UserDto userDto = UserDto.builder()
                .id(10L)
                .userName("tester")
                .email("tester@nexspace.vn")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .build();

        AuthResponse resp = new AuthResponse("mock.jwt.token", "Bearer", Instant.now().plusSeconds(3600), userDto);
        when(authService.login(any(AuthRequest.class))).thenReturn(resp);

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.accessToken").value("mock.jwt.token"))
                .andExpect(jsonPath("$.data.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.data.user.userName").value("tester"));
    }

    @Test
    @DisplayName("POST /api/auth/login - Thất bại do thiếu trường bắt buộc trả về 400 Bad Request")
    void login_ValidationError() throws Exception {
        AuthRequest req = new AuthRequest();
        req.setUsername("");
        req.setPassword("");

        mockMvc.perform(post("/api/auth/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    @DisplayName("POST /api/auth/register - Đăng ký thành công trả về 201 Created")
    void register_Success() throws Exception {
        RegisterDto dto = new RegisterDto();
        dto.setUserName("newuser");
        dto.setEmail("newuser@nexspace.vn");
        dto.setPassword("Secret@123");
        dto.setFirstName("Khoa");
        dto.setLastName("Dang");
        dto.setPhone("0912345678");

        UserDto userDto = UserDto.builder()
                .id(11L)
                .userName("newuser")
                .email("newuser@nexspace.vn")
                .role(UserRole.USER)
                .status(UserStatus.ACTIVE)
                .verified(true)
                .build();

        when(authService.register(any(RegisterDto.class))).thenReturn(userDto);

        mockMvc.perform(post("/api/auth/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.data.userName").value("newuser"));
    }

    @Test
    @DisplayName("POST /api/auth/logout - Đăng xuất thành công thu hồi token")
    void logout_Success() throws Exception {
        doNothing().when(authService).logout("valid.bearer.token");

        mockMvc.perform(post("/api/auth/logout")
                        .header(HttpHeaders.AUTHORIZATION, "Bearer valid.bearer.token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đăng xuất thành công"));

        verify(authService).logout("valid.bearer.token");
    }

    @Test
    @DisplayName("POST /api/auth/logout - Thiếu Header Authorization trả về 401 Unauthorized")
    void logout_MissingHeader_ThrowsUnauthorized() throws Exception {
        mockMvc.perform(post("/api/auth/logout"))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(401));
    }

    @Test
    @DisplayName("GET /api/auth/verify-email - Click link trong email redirect 302 về Client")
    void verifyEmail_Redirects302() throws Exception {
        when(authService.verifyEmail("email-token-123")).thenReturn("tester@nexspace.vn");

        mockMvc.perform(get("/api/auth/verify-email").param("token", "email-token-123"))
                .andExpect(status().isFound())
                .andExpect(header().string(HttpHeaders.LOCATION, "http://localhost:5173/auth/sign-up?verified=true&email=tester%40nexspace.vn"));
    }

    @Test
    @DisplayName("POST /api/auth/verify-email - SPA gọi trực tiếp qua JSON API trả về 200 OK")
    void verifyEmailDirect_JsonSuccess() throws Exception {
        VerifyTokenRequestDto dto = new VerifyTokenRequestDto();
        dto.setToken("email-token-123");
        doNothing().when(authService).verifyEmailDirect("email-token-123");

        mockMvc.perform(post("/api/auth/verify-email")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xác thực email thành công"));
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password/initiate - Gửi link đặt lại mật khẩu trả về 200 OK")
    void initiateForgotPassword_Success() throws Exception {
        InitiateForgotPasswordDto dto = new InitiateForgotPasswordDto();
        dto.setContactInfo("tester@nexspace.vn");
        doNothing().when(authService).initiateForgotPassword("tester@nexspace.vn");

        mockMvc.perform(post("/api/auth/forgot-password/initiate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("GET /api/auth/forgot-password/verify-token - Kiểm tra token hợp lệ trước khi reset")
    void verifyResetToken_Success() throws Exception {
        TokenValidationResponseDto resp = TokenValidationResponseDto.builder()
                .valid(true)
                .message("Token hợp lệ")
                .email("tester@nexspace.vn")
                .build();

        when(authService.validateResetToken("valid-reset-token")).thenReturn(resp);

        mockMvc.perform(get("/api/auth/forgot-password/verify-token")
                        .param("token", "valid-reset-token"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.valid").value(true))
                .andExpect(jsonPath("$.data.email").value("tester@nexspace.vn"));
    }

    @Test
    @DisplayName("POST /api/auth/forgot-password/complete - Đặt lại mật khẩu hoàn tất trả về 200 OK")
    void completeForgotPassword_Success() throws Exception {
        CompleteForgotPasswordDto dto = new CompleteForgotPasswordDto();
        dto.setResetToken("reset-token-xyz");
        dto.setNewPassword("NewPass@123");
        dto.setConfirmNewPassword("NewPass@123");
        doNothing().when(authService).completeForgotPassword(any(CompleteForgotPasswordDto.class));

        mockMvc.perform(post("/api/auth/forgot-password/complete")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đặt lại mật khẩu thành công"));
    }

    @Test
    @DisplayName("POST /api/auth/change-password - Đổi mật khẩu cho người dùng đăng nhập")
    void changePassword_Success() throws Exception {
        ChangePasswordDto dto = new ChangePasswordDto();
        dto.setOldPassword("OldPass@123");
        dto.setNewPassword("NewPass@123");
        dto.setConfirmNewPassword("NewPass@123");
        doNothing().when(userService).changePassword(eq(10L), any(ChangePasswordDto.class));

        mockMvc.perform(post("/api/auth/change-password")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Đổi mật khẩu thành công"));
    }
}
