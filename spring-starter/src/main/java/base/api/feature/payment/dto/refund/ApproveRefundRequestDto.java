package base.api.feature.payment.dto.refund;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ApproveRefundRequestDto {

    @DecimalMin(value = "0.0", inclusive = false, message = "Số tiền duyệt phải lớn hơn 0")
    private BigDecimal approvedAmount;

    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    private String adminNote;
}
