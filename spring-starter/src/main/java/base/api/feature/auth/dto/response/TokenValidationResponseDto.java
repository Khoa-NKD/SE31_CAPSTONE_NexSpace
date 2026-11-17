package base.api.feature.auth.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class TokenValidationResponseDto {
    boolean valid;
    String message;
    String email;
}

