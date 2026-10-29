package base.api.feature.auth.dto.response;

import java.time.Instant;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class AuthResponse {
  private String accessToken;
  private String tokenType;
  private Instant expiresAt;
  private UserDto user;
  private String refreshToken;
  private Instant refreshExpiresAt;
}
