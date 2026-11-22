package base.api.feature.chat.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AiSmartRepliesResponseDTO {
    List<String> suggestions;
    String contextSummary;
}
