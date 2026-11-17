package base.api.feature.auth.dto.request;

import base.api.shared.enums.UserStatus;
import com.fasterxml.jackson.annotation.JsonFormat;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class UpdateUserStatusDto {
    @NotNull(message = "Trạng thái không được để trống")
    private UserStatus status;

    @Size(max = 255, message = "Lý do tối đa 255 ký tự")
    private String reason;

    @JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss", timezone = "Asia/Ho_Chi_Minh")
    private LocalDateTime lockedUntil;
}
