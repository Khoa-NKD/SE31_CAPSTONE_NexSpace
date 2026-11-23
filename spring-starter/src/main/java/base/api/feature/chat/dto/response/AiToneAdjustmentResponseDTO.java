package base.api.feature.chat.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AiToneAdjustmentResponseDTO {
    String originalText;
    String adjustedText;
    String mode;
}
