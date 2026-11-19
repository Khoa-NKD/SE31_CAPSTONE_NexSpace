package base.api.feature.payment.dto.refund;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateRefundBankInfoDto {

    @NotBlank(message = "Tên ngân hàng không được để trống")
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
