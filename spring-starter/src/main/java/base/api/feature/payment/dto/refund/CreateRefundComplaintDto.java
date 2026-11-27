package base.api.feature.payment.dto.refund;

import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
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
public class CreateRefundComplaintDto {

    @NotNull(message = "Mã đơn đặt chỗ không được để trống")
    private Long bookingId;

    @DecimalMin(value = "1000", message = "Số tiền yêu cầu hoàn tối thiểu là 1.000 VNĐ")
    private BigDecimal requestedAmount;

    @NotBlank(message = "Nội dung khiếu nại và lý do yêu cầu hoàn tiền không được để trống")
    @Size(max = 500, message = "Lý do khiếu nại không được vượt quá 500 ký tự")
    private String reason;

    @NotBlank(message = "Tên ngân hàng nhận hoàn tiền không được để trống")
    @Size(max = 100, message = "Tên ngân hàng không được vượt quá 100 ký tự")
    private String bankName;

    @NotBlank(message = "Mã BIN ngân hàng không được để trống")
    @Size(max = 20, message = "Mã BIN ngân hàng không được vượt quá 20 ký tự")
    private String bankBin;

    @NotBlank(message = "Số tài khoản ngân hàng không được để trống")
    @Size(max = 50, message = "Số tài khoản ngân hàng không được vượt quá 50 ký tự")
    private String bankAccountNumber;

    @NotBlank(message = "Tên chủ tài khoản không được để trống")
    @Size(max = 150, message = "Tên chủ tài khoản không được vượt quá 150 ký tự")
    private String bankAccountName;
}
