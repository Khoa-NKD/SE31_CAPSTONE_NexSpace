package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class ResourceBreakdownPointDTO {
    String week;
    int hotDesks;
    int meetingSuites;
    int dedicatedPods;
}
