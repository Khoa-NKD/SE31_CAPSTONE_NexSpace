package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminOperationalTrendPointDTO {
    String day;
    int bookings;
    long settlements;
    boolean isPeak;
}
