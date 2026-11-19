package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminLiveSystemAlertDTO {
    String id;
    String title;
    String description;
    String severity; // critical, warning, info
    String timestamp;
    boolean acknowledged;
}
