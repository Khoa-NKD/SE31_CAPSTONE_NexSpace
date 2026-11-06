package base.api.feature.workspace.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class AdminReviewWorkspaceDto {

    @NotBlank(message = "Trạng thái kiểm duyệt không được để trống")
    private String reviewStatus;

    @Size(min = 5, max = 500, message = "Lý do phản hồi phải từ 5 đến 500 ký tự")
    private String reviewFeedback;
}

