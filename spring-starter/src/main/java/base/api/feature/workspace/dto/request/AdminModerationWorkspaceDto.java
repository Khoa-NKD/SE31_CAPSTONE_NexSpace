package base.api.feature.workspace.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminModerationWorkspaceDto {

    @NotBlank(message = "Trạng thái điều hành không được để trống")
    private String moderationStatus;

    @Size(min = 5, max = 500, message = "Lý do phải từ 5 đến 500 ký tự")
    private String reason;
}

