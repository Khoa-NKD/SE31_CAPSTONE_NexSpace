package base.api.feature.payment.dto.payout;

import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RequestCancelAutoPayoutDto {

    @Size(max = 500, message = "Lý do yêu cầu hủy không được vượt quá 500 ký tự")
    private String requestNote;
}
