package base.api.feature.workspace.dto.response;

import base.api.shared.enums.AssetStatus;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.LocalDateTime;

@Value
@Builder
public class WorkspaceAssetResponseDto {
    Long id;
    Long workspaceId;
    String assetCode;
    String name;
    Integer quantity;
    AssetStatus status;
    Long resourceId;
    String resourceName;
    Long amenityId;
    String amenityName;
    LocalDate purchaseDate;
    BigDecimal purchasePrice;
    LocalDate warrantyUntil;
    LocalDate nextMaintenanceDate;
    String note;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

