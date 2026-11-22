package base.api.feature.chat.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiToneAdjustmentRequestDTO {

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    private String text;

    @NotNull(message = "Chế độ chỉnh sửa không được để trống")
    private String mode; // POLITE, CONCISE, TRANSLATE_EN, TRANSLATE_VI
}
