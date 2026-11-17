package base.api.feature.auth.dto.request;

import base.api.shared.enums.UserRole;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO yêu cầu gán hoặc thay đổi vai trò người dùng (chỉ ADMIN).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UpdateUserRoleDto {

    @NotNull(message = "Vai trò không được để trống")
    private UserRole role;

    @NotBlank(message = "Vui lòng nhập lý do khi thay đổi vai trò người dùng")
    @Size(max = 255, message = "Lý do tối đa 255 ký tự")
    private String reason;
}

