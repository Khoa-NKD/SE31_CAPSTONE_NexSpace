package base.api.feature.auth.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class VerifyTokenRequestDto {
    @NotBlank(message = "Token không được để trống")
    private String token;
}

