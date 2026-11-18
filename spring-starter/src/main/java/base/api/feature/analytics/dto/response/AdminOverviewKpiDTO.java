package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminOverviewKpiDTO {
    String id;
    String label;
    String value;
    long numericValue;
    String changePercent;
    String changeType; // positive, negative, neutral, warning
    String subtext;
    String badgeText;
    String icon;
}
