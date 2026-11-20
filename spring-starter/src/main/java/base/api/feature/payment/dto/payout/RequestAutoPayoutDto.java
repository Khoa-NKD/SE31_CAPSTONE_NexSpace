package base.api.feature.payment.dto.payout;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class RequestAutoPayoutDto {

    @NotNull(message = "Vui lòng chọn khung giờ rút tiền tự động hàng ngày")
    @Min(value = 0, message = "Giờ rút tiền không hợp lệ (0-23)")
    @Max(value = 23, message = "Giờ rút tiền không hợp lệ (0-23)")
    private Integer autoPayoutHour;

    @Size(max = 500, message = "Lý do đăng ký không được vượt quá 500 ký tự")
    private String requestNote;
}
