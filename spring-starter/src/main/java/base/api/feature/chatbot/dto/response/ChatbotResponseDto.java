package base.api.feature.chatbot.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
@Schema(description = "Phản hồi câu trả lời từ AI Chatbot kèm gợi ý câu hỏi tiếp theo")
public class ChatbotResponseDto {

    @Schema(description = "Nội dung phản hồi từ Chatbot AI (định dạng Markdown)", example = "Chào bạn! Tại NexSpace, bạn có thể dễ dàng đặt chỗ theo 6 bước...")
    String reply;

    @Schema(description = "Danh sách câu hỏi gợi ý tiếp theo giúp người dùng tương tác thuận tiện")
    List<String> suggestedQuestions;

    @Schema(description = "Thời gian phản hồi của máy chủ để client đồng bộ", example = "2026-11-17T22:30:00")
    LocalDateTime serverTime;

    @JsonProperty("isFallback")
    @Schema(description = "Cờ đánh dấu câu trả lời được xử lý từ bộ tri thức dự phòng khi API AI quá tải", example = "false")
    boolean isFallback;
}
