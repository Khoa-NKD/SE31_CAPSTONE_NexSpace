package base.api.feature.auth.controller;

import base.api.feature.auth.dto.request.AuthRequest;
import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.CompleteForgotPasswordDto;
import base.api.feature.auth.dto.request.InitiateForgotPasswordDto;
import base.api.feature.auth.dto.request.RegisterDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.request.VerifyTokenRequestDto;
import base.api.feature.auth.dto.response.AuthResponse;
import base.api.feature.auth.dto.response.TokenValidationResponseDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IAuthService;
import base.api.feature.auth.service.IUserService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.config.TrustedClockService;
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
@RequestMapping("/api/auth")
@RequiredArgsConstructor
@Tag(name = "Auth", description = "Đăng nhập, đăng ký, quên mật khẩu, xác thực email, hồ sơ cá nhân")
public class AuthController extends BaseAPIController {

    private static final String GENERIC_EMAIL_MESSAGE =
            "Nếu tài khoản tồn tại, email hướng dẫn đã được gửi. Vui lòng kiểm tra hộp thư.";

    private final IAuthService authService;
    private final IUserService userService;
    private final TrustedClockService trustedClockService;

    @Value("${app.client-url}")
    private String clientUrl;

    @Operation(summary = "Đăng nhập", description = "**Public.** Đăng nhập bằng username hoặc email, trả về JWT. Tự động bảo vệ brute-force (BR-03).")
    @SecurityRequirements
    @PostMapping("/login")
    public ResponseEntity<ApiResponse<AuthResponse>> login(@Valid @RequestBody AuthRequest dto) {
        return success(authService.login(dto), "Đăng nhập thành công");
    }

    @Operation(summary = "Đăng xuất", description = "Thu hồi JWT hiện tại (token bị đưa vào blacklist tới khi hết hạn).")
    @PostMapping("/logout")
    public ResponseEntity<ApiResponse<Void>> logout(HttpServletRequest request) {
        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith("Bearer ")) {
            throw new UnauthorizedException("Chưa đăng nhập");
        }
        authService.logout(header.substring(7));
        return success(null, "Đăng xuất thành công");
    }

    @Operation(summary = "Đăng ký", description = "**Public.** Tạo tài khoản role USER. "
            + "Nếu bật app.auth.email-verification-enabled thì cần xác thực email trước khi đăng nhập.")
    @SecurityRequirements
    @PostMapping("/register")
    public ResponseEntity<ApiResponse<UserDto>> register(@Valid @RequestBody RegisterDto dto) {
        return created(authService.register(dto), "Đăng ký thành công");
    }

    @Operation(summary = "Xác thực email (Redirect)", description = "**Public.** Link trong email. Kích hoạt tài khoản và tự động đồng bộ về tab đang mở hoặc chuyển đến login.")
    @SecurityRequirements
    @GetMapping(value = "/verify-email", produces = "text/html;charset=UTF-8")
    public ResponseEntity<String> verifyEmail(@Parameter(description = "Token trong email") @RequestParam String token) {
        boolean success;
        String email = "";
        try {
            email = authService.verifyEmail(token);
            success = true;
        } catch (RuntimeException ex) {
            success = false;
        }

        String encodedEmail = (email != null && !email.isBlank())
                ? java.net.URLEncoder.encode(email, java.nio.charset.StandardCharsets.UTF_8)
                : "";
        String targetUrl = clientUrl + (success
                ? "/auth/sign-in?verified=true" + (encodedEmail.isEmpty() ? "" : "&email=" + encodedEmail)
                : "/auth/sign-in?verified=false");

        String html = "<!DOCTYPE html><html lang='vi'><head><meta charset='UTF-8'>"
                + "<title>Xác thực tài khoản - NexSpace</title>"
                + "<meta name='viewport' content='width=device-width, initial-scale=1.0'>"
                + (success ? "<meta http-equiv='refresh' content='1;url=" + targetUrl + "'>" : "")
                + "<style>"
                + "body{background:#0b0f19;color:#fff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;"
                + "display:flex;align-items:center;justify-content:center;height:100vh;margin:0;padding:16px;box-sizing:border-box}"
                + ".card{background:#111827;border:1px solid #1f2937;border-radius:16px;padding:32px;max-width:440px;width:100%;text-align:center;box-shadow:0 10px 25px rgba(0,0,0,0.5)}"
                + ".icon{width:56px;height:56px;border-radius:50%;margin:0 auto 16px;display:flex;align-items:center;justify-content:center;font-size:24px;"
                + (success ? "background:rgba(16,185,129,0.15);color:#10b981;border:1px solid rgba(16,185,129,0.3)" : "background:rgba(239,68,68,0.15);color:#ef4444;border:1px solid rgba(239,68,68,0.3)")
                + "}"
                + "h2{font-size:20px;margin:0 0 12px;font-weight:600}"
                + "p{font-size:14px;color:#94a3b8;line-height:1.6;margin:0 0 24px}"
                + ".btn{display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:500;font-size:14px;transition:background 0.2s}"
                + ".btn:hover{background:#4338ca}"
                + "</style></head><body>"
                + "<div class='card'>"
                + "<div class='icon'>" + (success ? "✓" : "✕") + "</div>"
                + "<h2>" + (success ? "Xác thực email thành công!" : "Xác thực không thành công") + "</h2>"
                + "<p>" + (success ? "Tài khoản của bạn đã được kích hoạt thành công (ACTIVE). Đang tự động chuyển hướng đến trang đăng nhập..." : "Liên kết xác thực không hợp lệ hoặc đã hết hạn.") + "</p>"
                + "<a class='btn' href='" + targetUrl + "'>Tiếp tục đến Đăng nhập</a>"
                + "</div>"
                + "<script>"
                + (success
                   ? "try{var bc=new BroadcastChannel('nexspace_auth_sync');bc.postMessage({type:'EMAIL_VERIFIED_SUCCESS'});}catch(e){}"
                     + "try{localStorage.setItem('nexspace_auth_sync_event',JSON.stringify({type:'EMAIL_VERIFIED_SUCCESS',timestamp:Date.now()}));}catch(e){}"
                     + "setTimeout(function(){window.location.replace('" + targetUrl + "');},1000);"
                   : "setTimeout(function(){window.location.replace('" + targetUrl + "');},3000);")
                + "</script></body></html>";

        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_TYPE, "text/html; charset=UTF-8")
                .body(html);
    }

    @Operation(summary = "Xác thực email (JSON API)", description = "**Public.** Nhận JSON body cho SPA hoặc Mobile App xác thực trực tiếp.")
    @SecurityRequirements
    @PostMapping("/verify-email")
    public ResponseEntity<ApiResponse<Void>> verifyEmailDirect(@Valid @RequestBody VerifyTokenRequestDto dto) {
        authService.verifyEmailDirect(dto.getToken());
        return success(null, "Xác thực email thành công");
    }

    @Operation(summary = "Kiểm tra trạng thái xác thực tài khoản", description = "**Public.** Cho realtime polling.")
    @SecurityRequirements
    @GetMapping("/verification-status")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> checkVerificationStatus(
            @Parameter(description = "Email hoặc username") @RequestParam String email) {
        boolean verified = authService.isAccountVerified(email);
        return success(java.util.Map.of("verified", verified));
    }

    @Operation(summary = "Gửi lại email xác thực", description = "**Public.** Nhận email hoặc username.")
    @SecurityRequirements
    @PostMapping("/resend-verification")
    public ResponseEntity<ApiResponse<Void>> resendVerification(@Valid @RequestBody InitiateForgotPasswordDto dto) {
        authService.resendVerificationEmail(dto.getContactInfo());
        return success(null, "Đã gửi lại email xác thực. Vui lòng kiểm tra hộp thư.");
    }

    @Operation(summary = "Quên mật khẩu — gửi link", description = "**Public.** Gửi link đặt lại mật khẩu "
            + "({client-url}/reset-password?token=...) tới email của tài khoản.")
    @SecurityRequirements
    @PostMapping("/forgot-password/initiate")
    public ResponseEntity<ApiResponse<Void>> initiateForgotPassword(@Valid @RequestBody InitiateForgotPasswordDto dto) {
        authService.initiateForgotPassword(dto.getContactInfo());
        return success(null, "Đã gửi email hướng dẫn đặt lại mật khẩu. Vui lòng kiểm tra hộp thư.");
    }

    @Operation(summary = "Kiểm tra token đặt lại mật khẩu", description = "**Public.** Kiểm tra tính hợp lệ của token trước khi hiển thị form nhập mật khẩu mới trên Frontend.")
    @SecurityRequirements
    @GetMapping("/forgot-password/verify-token")
    public ResponseEntity<ApiResponse<TokenValidationResponseDto>> verifyResetToken(
            @Parameter(description = "Token trong link email") @RequestParam String token) {
        return success(authService.validateResetToken(token));
    }

    @Operation(summary = "Quên mật khẩu — đặt mật khẩu mới", description = "**Public.** Dùng token trong link email.")
    @SecurityRequirements
    @PostMapping("/forgot-password/complete")
    public ResponseEntity<ApiResponse<Void>> completeForgotPassword(@Valid @RequestBody CompleteForgotPasswordDto dto) {
        authService.completeForgotPassword(dto);
        return success(null, "Đặt lại mật khẩu thành công");
    }

    @Operation(summary = "Thông tin tài khoản hiện tại")
    @GetMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> me() {
        return success(userService.getById(getCurrentUserId()));
    }

    @Operation(summary = "Kiểm tra nhịp tim phiên đăng nhập", description = "Kiểm tra định kỳ tính hợp lệ của token và vai trò người dùng theo thời gian thực")
    @GetMapping("/heartbeat")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> heartbeat() {
        Long userId = getCurrentUserId();
        UserDto user = userService.getById(userId);
        java.util.Map<String, Object> payload = new java.util.HashMap<>();
        payload.put("userId", userId);
        payload.put("role", user.getRole() != null ? user.getRole().name() : null);
        payload.put("status", user.getStatus() != null ? user.getStatus().name() : null);
        payload.put("serverTime", trustedClockService.nowInVietnam().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")));
        return success(payload, "Phiên làm việc hợp lệ");
    }

    @Operation(summary = "Lấy thời gian thực máy chủ (Server Time)", description = "**Public.** Trả về mốc thời gian chuẩn UTC và giờ Việt Nam GMT+7 từ Trusted Clock.")
    @SecurityRequirements
    @GetMapping("/server-time")
    public ResponseEntity<ApiResponse<java.util.Map<String, Object>>> getServerTime() {
        return success(java.util.Map.of(
                "utcInstant", trustedClockService.nowInstant().toString(),
                "vietnamTime", trustedClockService.nowInVietnam().format(java.time.format.DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss")),
                "epochMilli", trustedClockService.nowInstant().toEpochMilli()
        ));
    }

    @Operation(summary = "Cập nhật hồ sơ")
    @PutMapping("/me")
    public ResponseEntity<ApiResponse<UserDto>> updateProfile(@Valid @RequestBody UpdateProfileDto dto) {
        return success(userService.updateProfile(getCurrentUserId(), dto), "Cập nhật hồ sơ thành công");
    }

    @Operation(summary = "Đổi mật khẩu")
    @PostMapping("/change-password")
    public ResponseEntity<ApiResponse<Void>> changePassword(@Valid @RequestBody ChangePasswordDto dto) {
        userService.changePassword(getCurrentUserId(), dto);
        return success(null, "Đổi mật khẩu thành công");
    }
}
