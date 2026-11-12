package base.api.feature.auth.dto.request;

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
public class DeleteAccountDto {

    @NotBlank(message = "Vui lòng nhập mật khẩu để xác nhận xóa tài khoản")
    private String password;

    @Size(max = 255, message = "Lý do tối đa 255 ký tự")
    private String reason;
}

