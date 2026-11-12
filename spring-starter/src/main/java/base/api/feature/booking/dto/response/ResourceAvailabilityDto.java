package base.api.feature.booking.dto.response;

import base.api.feature.resource.dto.FloorManagement.AvailabilityState;
import base.api.shared.enums.ResourceCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.util.Set;

@Value
@Builder
@Schema(description = "Trạng thái sẵn sàng của chỗ ngồi/phòng trong khung giờ")
public class ResourceAvailabilityDto {
    Long resourceId;
    String code;
    String name;
    ResourceCategory category;
    Integer capacity;
    String resourceTypeName;
    String zoneName;
    BigDecimal pricePerHour;
    boolean selectable;
    AvailabilityState state;
    Set<AvailabilityState> flags;
}
