package base.api.feature.payment.dto.response;

import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class BatchReconciliationResponseDTO {
    int totalProcessed;
    int matchedCount;
    int mismatchCount;
    int autoHealedCount;
    int errorCount;
    LocalDateTime completedAt;
}

