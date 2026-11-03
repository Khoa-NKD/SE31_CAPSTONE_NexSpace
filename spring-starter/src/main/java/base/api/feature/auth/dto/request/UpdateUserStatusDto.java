package base.api.feature.auth.dto.request;

import base.api.shared.enums.UserStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class UpdateUserStatusDto {
    @NotNull(message = "Trạng thái không được để trống")
    private UserStatus status;

    @Size(max = 500, message = "Lý do tối đa 500 ký tự")
    private String reason;
}
