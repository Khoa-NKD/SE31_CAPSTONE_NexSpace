package base.api.feature.chatbot.service;

import base.api.feature.chatbot.dto.request.ChatbotRequestDto;
import base.api.feature.chatbot.dto.response.ChatbotResponseDto;

public interface IChatbotService {

    /**
     * Xử lý câu hỏi của người dùng gửi tới AI Chatbot và trả về phản hồi kèm gợi ý.
     *
     * @param actorId ID người dùng (hoặc null nếu là khách vãng lai)
     * @param request Dữ liệu yêu cầu câu hỏi và ngữ cảnh hội thoại
     * @return Phản hồi câu trả lời định dạng Markdown và các gợi ý
     */
    ChatbotResponseDto chat(Long actorId, ChatbotRequestDto request);
}
