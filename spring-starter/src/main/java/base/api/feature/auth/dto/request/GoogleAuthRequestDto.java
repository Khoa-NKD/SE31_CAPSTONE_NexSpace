package base.api.feature.auth.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GoogleAuthRequestDto {

    @NotBlank(message = "Google ID Token không được để trống")
    @Schema(description = "Google ID Token (JWT) từ Google Identity Services", example = "eyJhbGciOiJSUzI1NiIs...")
    private String idToken;
}
