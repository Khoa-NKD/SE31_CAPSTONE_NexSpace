package base.api.feature.chat.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class AiChatSummaryResponseDTO {
    Long conversationId;
    String summary;
    LocalDateTime generatedAt;
}
