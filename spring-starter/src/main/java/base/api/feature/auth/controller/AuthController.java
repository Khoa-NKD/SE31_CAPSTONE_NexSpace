package base.api.feature.auth.controller;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.InitiateForgotPasswordDto;
import base.api.feature.auth.dto.request.RefreshTokenDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IAuthService;
import base.api.feature.auth.service.IUserService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.exception.UnauthorizedException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
@Tag(
    name = "Auth",
    description = "Đăng nhập, đăng ký, quên mật khẩu, xác thực email, hồ sơ cá nhân")
public class AuthController extends BaseAPIController {

  private static final String GENERIC_EMAIL_MESSAGE =
      "Nếu tài khoản tồn tại, email hướng dẫn đã được gửi. Vui lòng kiểm tra hộp thư.";

  private final IAuthService authService;
  private final IUserService userService;

  @Value("${app.client-url}")
  private String clientUrl;

  @Operation(summary = "Đăng nhập", description = "**Public.** Đăng nhập bằng email, trả về JWT.")
  @SecurityRequirements
  @PostMapping("/login")
  public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest dto) {
    return success(authService.login(dto), "Đăng nhập thành công");
  }

  @Operation(
      summary = "Làm mới token",
      description = "Public. Refresh token được xoay sau mỗi lần sử dụng.")
  @SecurityRequirements
  @PostMapping("/refresh")
  public ResponseEntity<ApiResponse<AuthResponse>> refresh(
      @Valid @RequestBody RefreshTokenDto dto) {
    return success(authService.refresh(dto));
  }

  @Operation(
      summary = "Đăng xuất",
      description = "Thu hồi JWT hiện tại (token bị đưa vào blacklist tới khi hết hạn).")
  @PostMapping("/logout")
  public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request) {
    String header = request.getHeader(HttpHeaders.AUTHORIZATION);
    if (header == null || !header.startsWith("Bearer ")) {
      throw new UnauthorizedException("Chưa đăng nhập");
    }
    authService.logout(header.substring(7));
    return success(null, "Đăng xuất thành công");
  }

  @Operation(
      summary = "Đăng ký",
      description =
          "**Public.** Tạo tài khoản role Customer. "
              + "Nếu bật app.auth.email-verification-enabled thì cần xác thực email trước khi đăng nhập.")
  @SecurityRequirements
  @PostMapping("/register")
  public ResponseEntity<ApiResponse<UserDto>> register(@Valid @RequestBody RegisterDto dto) {
    return created(authService.register(dto), "Đăng ký thành công");
  }

  @Operation(
      summary = "Xác thực email",
      description =
          "**Public.** Link trong email. "
              + "Redirect về {client-url}/email/verify-success hoặc /email/verify-failed.")
  @SecurityRequirements
  @GetMapping("/verify-email")
  public ResponseEntity<Void> verifyEmail(
      @Parameter(description = "Token trong email") @RequestParam String token) {
    String target;
    try {
      authService.verifyEmail(token);
      target = clientUrl + "/email/verify-success";
    } catch (RuntimeException ex) {
      target = clientUrl + "/email/verify-failed";
    }
    return ResponseEntity.status(HttpStatus.FOUND).header(HttpHeaders.LOCATION, target).build();
  }

  @Operation(summary = "Gửi lại email xác thực", description = "**Public.** Nhận email.")
  @SecurityRequirements
  @PostMapping("/resend-verification")
  public ResponseEntity<ApiResponse<Void>> resendVerification(
      @Valid @RequestBody InitiateForgotPasswordDto dto) {
    authService.resendVerificationEmail(dto.getContactInfo());
    return success(null, GENERIC_EMAIL_MESSAGE);
  }

  @Operation(
      summary = "Quên mật khẩu — gửi link",
      description =
          "**Public.** Gửi link đặt lại mật khẩu "
              + "({client-url}/reset-password?token=...) tới email của tài khoản.")
  @SecurityRequirements
  @PostMapping("/forgot-password/initiate")
  public ResponseEntity<ApiResponse<Void>> initiateForgotPassword(
      @Valid @RequestBody InitiateForgotPasswordDto dto) {
    authService.initiateForgotPassword(dto.getContactInfo());
    return success(null, GENERIC_EMAIL_MESSAGE);
  }

  @Operation(
      summary = "Quên mật khẩu — đặt mật khẩu mới",
      description = "**Public.** Dùng token trong link email.")
  @SecurityRequirements
  @PostMapping("/forgot-password/complete")
  public ResponseEntity<ApiResponse<Void>> completeForgotPassword(
      @Valid @RequestBody CompleteForgotPasswordDto dto) {
    authService.completeForgotPassword(dto);
    return success(null, "Đặt lại mật khẩu thành công");
  }

  @Operation(summary = "Thông tin tài khoản hiện tại")
  @GetMapping("/me")
  public ResponseEntity<ApiResponse<UserDto>> me() {
    return success(userService.getById(getCurrentUserId()));
  }

  @Operation(summary = "Cập nhật hồ sơ")
  @PutMapping("/me")
  public ResponseEntity<ApiResponse<UserDto>> updateProfile(
      @Valid @RequestBody UpdateProfileDto dto) {
    return success(userService.updateProfile(getCurrentUserId(), dto), "Cập nhật hồ sơ thành công");
  }

  @Operation(summary = "Đổi mật khẩu")
  @PostMapping("/change-password")
  public ResponseEntity<ApiResponse<Void>> changePassword(
      @Valid @RequestBody ChangePasswordDto dto) {
    userService.changePassword(getCurrentUserId(), dto);
    return success(null, "Đổi mật khẩu thành công");
  }
}
