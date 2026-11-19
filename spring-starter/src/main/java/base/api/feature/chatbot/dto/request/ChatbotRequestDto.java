package base.api.feature.chatbot.dto.request;

import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.ArrayList;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu hỏi đáp với Chatbot AI thông minh NexSpace")
public class ChatbotRequestDto {

    @NotBlank(message = "Nội dung câu hỏi không được để trống")
    @Size(max = 1000, message = "Nội dung câu hỏi không được vượt quá 1000 ký tự")
    @Schema(description = "Câu hỏi hoặc yêu cầu của người dùng", example = "Quy trình đặt chỗ tại NexSpace diễn ra như thế nào?")
    private String message;

    @Builder.Default
    @Schema(description = "Lịch sử hội thoại gần nhất (tối đa 10 tin gần nhất để giữ ngữ cảnh)")
    private List<ChatMessageItemDto> history = new ArrayList<>();

    @Schema(description = "Vai trò hiện tại của người dùng (tùy chọn: CUSTOMER, ORGANIZER, ADMIN, GUEST)", example = "CUSTOMER")
    private String userRole;

    @Schema(description = "Mã không gian đang xem (nếu người dùng đang ở trang chi tiết workspace)", example = "1")
    private Long workspaceId;
}
