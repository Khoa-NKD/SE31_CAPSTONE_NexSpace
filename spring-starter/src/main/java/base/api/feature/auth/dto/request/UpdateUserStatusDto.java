package base.api.feature.auth.dto.request;

import base.api.shared.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateUserStatusDto {
  @NotNull(message = "Trạng thái không được để trống")
  private UserStatus status;
}
