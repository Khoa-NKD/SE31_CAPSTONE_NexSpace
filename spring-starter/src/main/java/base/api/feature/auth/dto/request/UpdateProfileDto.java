package base.api.feature.auth.dto.request;

import jakarta.validation.constraints.*;
import java.time.LocalDate;
import lombok.Data;

@Data
public class UpdateProfileDto {
  @NotBlank
  @Size(max = 100)
  private String fullName;

  @Size(max = 20)
  @Pattern(regexp = "^(0|\\+84)[0-9]{9,10}$", message = "Số điện thoại không hợp lệ")
  private String phone;

  @Size(max = 500)
  private String avatarUrl;

  @Size(max = 500)
  private String address;

  @Past private LocalDate birthDate;
}
