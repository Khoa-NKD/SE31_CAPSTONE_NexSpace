package base.api.feature.chatbot.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tin nhắn trong lịch sử hội thoại")
public class ChatMessageItemDto {

    @NotBlank(message = "Vai trò người gửi không được để trống")
    @Schema(description = "Vai trò: 'user' hoặc 'model'", example = "user")
    private String role;

    @NotBlank(message = "Nội dung tin nhắn không được để trống")
    @Schema(description = "Nội dung tin nhắn", example = "NexSpace hỗ trợ những loại chỗ ngồi nào?")
    private String content;
}
