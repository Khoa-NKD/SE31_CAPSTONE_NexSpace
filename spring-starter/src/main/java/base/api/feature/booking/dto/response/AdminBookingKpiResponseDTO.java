package base.api.feature.booking.dto.response;

import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
public class AdminBookingKpiResponseDTO {
    long totalCount;
    long confirmedCount;
    long pendingCount;
    long completedCount;
    long cancelledCount;
    BigDecimal totalRevenue;
}
