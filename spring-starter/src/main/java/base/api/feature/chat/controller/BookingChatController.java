package base.api.feature.chat.controller;

import base.api.feature.chat.dto.request.AiToneAdjustmentRequestDTO;
import base.api.feature.chat.dto.request.SendChatMessageRequestDTO;
import base.api.feature.chat.dto.response.AiSmartRepliesResponseDTO;
import base.api.feature.chat.dto.response.AiToneAdjustmentResponseDTO;
import base.api.feature.chat.dto.response.BookingChatMessageResponseDTO;
import base.api.feature.chat.dto.response.BookingConversationResponseDTO;
import base.api.feature.chat.service.IBookingChatService;
import base.api.feature.chat.service.IChatAiAssistantService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.ModelAttribute;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.Set;

@Tag(name = "Booking Chat Support", description = "API nhắn tin hỗ trợ thời gian thực giữa Khách hàng và Chủ không gian cho đơn đặt chỗ")
@RestController
@RequestMapping({"/api/chat", "/api/v1/chat"})
@RequiredArgsConstructor
public class BookingChatController extends BaseAPIController {

    private static final Set<String> CONVERSATION_SORTABLE_FIELDS = Set.of("lastMessageAt", "createdAt");
    private static final Set<String> MESSAGE_SORTABLE_FIELDS = Set.of("id", "createdAt");

    private final IBookingChatService chatService;
    private final IChatAiAssistantService chatAiAssistantService;

    @Operation(summary = "Lấy hoặc khởi tạo cuộc hội thoại hỗ trợ cho đơn đặt chỗ")
    @PostMapping("/conversations/booking/{bookingId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingConversationResponseDTO>> getOrCreateConversation(
            @PathVariable Long bookingId) {
        BookingConversationResponseDTO response = chatService.getOrCreateConversation(bookingId, getCurrentUserId());
        return success(response, "Khởi tạo cuộc hội thoại thành công");
    }

    @Operation(summary = "Xem chi tiết một cuộc hội thoại theo ID")
    @GetMapping("/conversations/{conversationId}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingConversationResponseDTO>> getConversationById(
            @PathVariable Long conversationId) {
        BookingConversationResponseDTO response = chatService.getConversationById(conversationId, getCurrentUserId());
        return success(response);
    }

    @Operation(summary = "Lấy danh sách các cuộc hội thoại của người dùng hiện tại (hỗ trợ ngữ cảnh ORGANIZER / CUSTOMER)")
    @GetMapping("/conversations")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponseDTO<BookingConversationResponseDTO>>> getConversations(
            @RequestParam(required = false) String role,
            @ModelAttribute PageRequestDTO pageRequest) {
        Page<BookingConversationResponseDTO> page = chatService.getConversations(
                getCurrentUserId(),
                role,
                pageRequest.toPageable("lastMessageAt", Sort.Direction.DESC, CONVERSATION_SORTABLE_FIELDS)
        );
        return successPage(page);
    }

    @Operation(summary = "Lấy danh sách tin nhắn trong cuộc hội thoại (phân trang)")
    @GetMapping("/conversations/{conversationId}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<PageResponseDTO<BookingChatMessageResponseDTO>>> getMessages(
            @PathVariable Long conversationId,
            @ModelAttribute PageRequestDTO pageRequest) {
        Page<BookingChatMessageResponseDTO> page = chatService.getMessages(
                conversationId,
                getCurrentUserId(),
                pageRequest.toPageable("id", Sort.Direction.DESC, MESSAGE_SORTABLE_FIELDS)
        );
        return successPage(page);
    }

    @Operation(summary = "Gửi tin nhắn mới vào cuộc hội thoại")
    @PostMapping("/conversations/{conversationId}/messages")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<BookingChatMessageResponseDTO>> sendMessage(
            @PathVariable Long conversationId,
            @Valid @RequestBody SendChatMessageRequestDTO request) {
        BookingChatMessageResponseDTO response = chatService.sendMessage(conversationId, getCurrentUserId(), request);
        return created(response, "Gửi tin nhắn thành công");
    }

    @Operation(summary = "Đánh dấu đã đọc toàn bộ tin nhắn trong cuộc hội thoại")
    @PostMapping("/conversations/{conversationId}/read")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<Void>> markAsRead(@PathVariable Long conversationId) {
        chatService.markAsRead(conversationId, getCurrentUserId());
        return success(null, "Đã đánh dấu đã đọc");
    }

    @Operation(summary = "Gợi ý câu trả lời thông minh theo ngữ cảnh đơn đặt chỗ bằng NexSpace AI")
    @PostMapping("/conversations/{conversationId}/ai/smart-replies")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiSmartRepliesResponseDTO>> generateSmartReplies(
            @PathVariable Long conversationId) {
        AiSmartRepliesResponseDTO response = chatAiAssistantService.generateSmartReplies(conversationId, getCurrentUserId());
        return success(response, "Tạo gợi ý phản hồi AI thành công");
    }

    @Operation(summary = "Trợ lý tinh chỉnh văn phong và dịch thuật thông điệp bằng NexSpace AI")
    @PostMapping("/conversations/{conversationId}/ai/tone")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<AiToneAdjustmentResponseDTO>> adjustTone(
            @PathVariable Long conversationId,
            @Valid @RequestBody AiToneAdjustmentRequestDTO request) {
        AiToneAdjustmentResponseDTO response = chatAiAssistantService.adjustTone(conversationId, getCurrentUserId(), request);
        return success(response, "Hiệu chỉnh văn phong AI thành công");
    }

    @Operation(summary = "Tổng hợp nội dung cuộc trò chuyện nội bộ cho Chủ không gian bằng NexSpace AI")
    @PostMapping("/conversations/{conversationId}/ai/summarize")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ApiResponse<base.api.feature.chat.dto.response.AiChatSummaryResponseDTO>> summarizeConversation(
            @PathVariable Long conversationId) {
        base.api.feature.chat.dto.response.AiChatSummaryResponseDTO response = chatAiAssistantService.summarizeConversation(conversationId, getCurrentUserId());
        return success(response, "Tổng hợp cuộc trò chuyện thành công");
    }
}
