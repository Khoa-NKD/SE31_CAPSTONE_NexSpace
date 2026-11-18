package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminVolumeSummaryDTO {
    String totalVolume;
    String slaSuccessRate;
    String peakDay;
    int peakCount;
    String peakHub;
}
