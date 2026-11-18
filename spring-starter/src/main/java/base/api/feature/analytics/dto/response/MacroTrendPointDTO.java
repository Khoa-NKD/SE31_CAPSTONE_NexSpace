package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class MacroTrendPointDTO {
    String month;
    double gmvUsd;
    double netRevenueUsd;
    long gmvVnd;
    long netRevenueVnd;
}
