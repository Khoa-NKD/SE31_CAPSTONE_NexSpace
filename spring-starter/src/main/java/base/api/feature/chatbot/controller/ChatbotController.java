package base.api.feature.chatbot.controller;

import base.api.feature.chatbot.dto.request.ChatbotRequestDto;
import base.api.feature.chatbot.dto.response.ChatbotResponseDto;
import base.api.feature.chatbot.service.IChatbotService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.security.AuthUser;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/public/chat", "/api/public/chat"})
@RequiredArgsConstructor
@Tag(name = "Public - AI Chatbot", description = "Trợ lý ảo AI thông minh hỗ trợ giải đáp thông tin và hướng dẫn sử dụng nền tảng NexSpace")
public class ChatbotController extends BaseAPIController {

    private final IChatbotService chatbotService;

    @Operation(
            summary = "Gửi câu hỏi tới AI Chatbot NexBot",
            description = "Hỗ trợ cả Khách vãng lai lẫn Người dùng đã đăng nhập (Customer, Organizer, Admin) hỏi đáp thông tin về nền tảng"
    )
    @PostMapping
    public ResponseEntity<ApiResponse<ChatbotResponseDto>> sendMessage(
            @Valid @RequestBody ChatbotRequestDto request
    ) {
        Long actorId = currentUserProvider.getCurrentUser()
                .map(AuthUser::getId)
                .orElse(null);

        ChatbotResponseDto response = chatbotService.chat(actorId, request);
        return success(response, "Phản hồi câu trả lời thành công");
    }
}
