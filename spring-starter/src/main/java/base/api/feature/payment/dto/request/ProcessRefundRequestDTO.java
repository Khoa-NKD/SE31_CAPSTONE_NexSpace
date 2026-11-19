package base.api.feature.payment.dto.request;

import jakarta.validation.constraints.DecimalMin;
import lombok.Data;

import java.math.BigDecimal;

@Data
public class ProcessRefundRequestDTO {

    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền hoàn duyệt phải lớn hơn 0")
    private BigDecimal approvedAmount;

    private String adminNote;

    private String refundReference;
}
