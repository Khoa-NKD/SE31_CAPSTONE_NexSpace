package base.api.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ChangePasswordDto {
  @NotBlank(message = "Mật khẩu cũ không được để trống")
  private String oldPassword;

  @NotBlank(message = "Mật khẩu mới không được để trống")
  @Size(min = 6, max = 72, message = "Mật khẩu phải có ít nhất 6 ký tự")
  private String newPassword;

  @NotBlank(message = "Xác nhận mật khẩu không được để trống")
  private String confirmNewPassword;
}
