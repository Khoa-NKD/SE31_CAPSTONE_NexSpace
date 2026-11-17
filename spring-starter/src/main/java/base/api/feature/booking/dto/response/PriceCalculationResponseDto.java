package base.api.feature.booking.dto.response;

import base.api.shared.enums.PriceType;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;

@Value
@Builder
@Schema(description = "Kết quả tạm tính chi phí đặt chỗ")
public class PriceCalculationResponseDto {
    Long resourceId;
    String resourceName;
    String resourceCode;
    PriceType priceType;
    BigDecimal unitPrice;
    BigDecimal durationHours;
    BigDecimal baseAmount;
    BigDecimal surchargeAmount;
    BigDecimal taxAmount;
    BigDecimal serviceFeeAmount;
    BigDecimal discountAmount;
    BigDecimal finalPrice;
    String currency;
}
