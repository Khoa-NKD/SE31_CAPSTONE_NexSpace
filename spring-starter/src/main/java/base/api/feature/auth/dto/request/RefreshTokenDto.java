package base.api.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class RefreshTokenDto {
  @NotBlank private String refreshToken;
}
