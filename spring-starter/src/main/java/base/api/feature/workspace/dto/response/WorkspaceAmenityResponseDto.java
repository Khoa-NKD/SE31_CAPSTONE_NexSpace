package base.api.feature.workspace.dto.response;

import base.api.shared.enums.AmenityCategory;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
public class WorkspaceAmenityResponseDto {
    Long id;
    Long workspaceId;
    Long amenityId;
    String name;
    AmenityCategory category;
    String icon;
    String description;
    BigDecimal addonPricePerHour;
    boolean isComplimentary;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;
}

