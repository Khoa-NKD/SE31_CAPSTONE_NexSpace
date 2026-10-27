package base.api.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

/** Dùng cho forgot-password/initiate và resend-verification. */
@Data
public class InitiateForgotPasswordDto {
  @NotBlank(message = "Vui lòng nhập email")
  private String contactInfo;
}
