package base.api.feature.auth.dto.request;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
import lombok.Data;

@Data
public class AuthRequest {
  @JsonAlias("username")
  @NotBlank
  @Email
  @Size(max = 255)
  private String email;

  @NotBlank private String password;
}
