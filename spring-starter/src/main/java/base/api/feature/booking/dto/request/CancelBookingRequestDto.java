package base.api.feature.booking.dto.request;

import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CancelBookingRequestDto {

    @Size(max = 500, message = "Lý do hủy không được vượt quá 500 ký tự")
    private String reason;

    @Size(max = 100, message = "Tên ngân hàng không được vượt quá 100 ký tự")
    private String bankName;

    @Size(max = 20, message = "Mã BIN ngân hàng không được vượt quá 20 ký tự")
    private String bankBin;

    @Size(max = 50, message = "Số tài khoản ngân hàng không được vượt quá 50 ký tự")
    private String bankAccountNumber;

    @Size(max = 150, message = "Tên chủ tài khoản không được vượt quá 150 ký tự")
    private String bankAccountName;
}
