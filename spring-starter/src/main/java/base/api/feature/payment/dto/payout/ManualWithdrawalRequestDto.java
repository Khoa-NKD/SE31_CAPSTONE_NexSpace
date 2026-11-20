package base.api.feature.payment.dto.payout;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ManualWithdrawalRequestDto {

    @NotNull(message = "Vui lòng nhập số tiền muốn rút")
    @DecimalMin(value = "1000.00", message = "Số tiền rút tối thiểu là 1.000 VNĐ")
    private BigDecimal amount;

    private Boolean withdrawAll = false;
}
