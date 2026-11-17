package base.api.feature.payment.dto.request;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SimulateWebhookRequestDTO {

    @NotNull(message = "Mã đơn hàng không được để trống")
    private Long orderCode;

    private Long amount;

    private Boolean success = true;
}

