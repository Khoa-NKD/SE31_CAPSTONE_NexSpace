package base.api.feature.auth.dto.response;

import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAuthResponseDto {

    @Schema(description = "Cho biết tài khoản có cần xác thực email trước khi vào hệ thống hay không")
    private boolean requiresVerification;

    @Schema(description = "Địa chỉ email của tài khoản")
    private String email;

    @Schema(description = "Thông báo hướng dẫn người dùng")
    private String message;

    @Schema(description = "JWT Token của NexSpace (chỉ có khi đăng nhập thành công)")
    private String accessToken;

    @Schema(description = "Loại token (Bearer)")
    private String tokenType;

    @Schema(description = "Thời điểm hết hạn của token")
    private java.time.Instant expiresAt;

    @Schema(description = "Thông tin tài khoản người dùng")
    private UserDto user;
}
