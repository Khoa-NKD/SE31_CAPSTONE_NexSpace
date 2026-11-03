package base.api.feature.workspace.dto.request;

import base.api.shared.enums.MediaType;
import jakarta.validation.constraints.Min;
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
public class AddWorkspaceMediaDto {

    @NotBlank(message = "Đường dẫn ảnh không được để trống")
    @Size(max = 500, message = "Đường dẫn ảnh không được vượt quá 500 ký tự")
    private String url;

    @Builder.Default
    private MediaType mediaType = MediaType.IMAGE;

    private Boolean isCover;

    @Min(value = 0, message = "Thứ tự hiển thị không được nhỏ hơn 0")
    private Integer displayOrder;

    private Long resourceId;
}

