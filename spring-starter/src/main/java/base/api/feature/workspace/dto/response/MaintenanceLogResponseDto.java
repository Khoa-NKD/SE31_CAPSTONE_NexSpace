package base.api.feature.workspace.dto.response;

import base.api.shared.enums.MaintenanceStatus;
import base.api.shared.enums.MaintenanceType;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class MaintenanceLogResponseDto {
    Long id;
    Long assetId;
    String assetCode;
    String assetName;
    MaintenanceType maintenanceType;
    MaintenanceStatus status;
    String description;
    Long reportedById;
    String reportedByName;
    String performedBy;
    BigDecimal cost;
    LocalDateTime scheduledAt;
    LocalDateTime startedAt;
    LocalDateTime completedAt;
    String resultNote;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

