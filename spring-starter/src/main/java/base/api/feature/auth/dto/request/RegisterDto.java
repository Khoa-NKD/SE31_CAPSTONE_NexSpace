package base.api.feature.auth.dto.request;

import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class RegisterDto {
  @NotBlank
  @Email
  @Size(max = 255)
  private String email;

  @NotBlank
  @Size(min = 6, max = 72)
  private String password;

  @NotBlank
  @Size(max = 100)
  private String fullName;

  @Size(max = 20)
  @Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$", message = "Số điện thoại không hợp lệ")
  private String phone;
}
