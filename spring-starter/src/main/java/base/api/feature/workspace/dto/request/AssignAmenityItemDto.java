package base.api.feature.workspace.dto.request;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssignAmenityItemDto {

    @NotNull(message = "ID tiện ích không được để trống")
    private Long amenityId;

    @DecimalMin(value = "0.0", message = "Phụ thu theo giờ không được âm")
    @Builder.Default
    private BigDecimal addonPricePerHour = BigDecimal.ZERO;
}

