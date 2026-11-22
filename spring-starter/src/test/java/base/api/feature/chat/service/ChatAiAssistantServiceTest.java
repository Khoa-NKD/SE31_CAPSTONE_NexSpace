package base.api.feature.chat.service;

import base.api.feature.chat.dto.request.AiToneAdjustmentRequestDTO;
import base.api.feature.chat.dto.response.AiSmartRepliesResponseDTO;
import base.api.feature.chat.dto.response.AiToneAdjustmentResponseDTO;
import base.api.feature.chat.repository.IBookingChatMessageRepository;
import base.api.feature.chat.repository.IBookingConversationRepository;
import base.api.feature.chat.service.impl.ChatAiAssistantServiceImpl;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.chat.BookingConversationModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ChatAiAssistantServiceTest {

    @Mock
    private IBookingConversationRepository conversationRepository;

    @Mock
    private IBookingChatMessageRepository messageRepository;

    private ChatAiAssistantServiceImpl chatAiAssistantService;

    private BookingConversationModel testConversation;
    private UserModel testCustomer;
    private UserModel testOrganizer;

    @BeforeEach
    void setUp() {
        chatAiAssistantService = new ChatAiAssistantServiceImpl(
                new ObjectMapper(),
                "", // blank API key to verify deterministic fallback behavior
                "",
                "gemini-2.5-flash",
                conversationRepository,
                messageRepository
        );

        testCustomer = new UserModel();
        testCustomer.setId(100L);
        testCustomer.setFirstName("Nguyen");
        testCustomer.setLastName("Van A");

        testOrganizer = new UserModel();
        testOrganizer.setId(200L);
        testOrganizer.setFirstName("Chủ");
        testOrganizer.setLastName("Không Gian B");

        WorkspaceModel workspace = new WorkspaceModel();
        workspace.setId(1L);
        workspace.setName("NexSpace Saigon Innovation Hub");
        workspace.setAddress("123 Nguyen Hue, Quan 1, TP.HCM");

        BookableResourceModel resource = new BookableResourceModel();
        resource.setId(10L);
        resource.setName("Bàn Focus 01");

        BookingModel booking = new BookingModel();
        booking.setId(500L);
        booking.setBookingCode("BK-20261122-001");
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setStartTime(LocalDateTime.now().plusHours(1));
        booking.setEndTime(LocalDateTime.now().plusHours(4));
        booking.setResource(resource);
        booking.setWorkspace(workspace);

        testConversation = new BookingConversationModel();
        testConversation.setId(10L);
        testConversation.setCustomer(testCustomer);
        testConversation.setOrganizer(testOrganizer);
        testConversation.setWorkspace(workspace);
        testConversation.setBooking(booking);
    }

    @Test
    @DisplayName("Gợi ý phản hồi thông minh trả về danh sách gợi ý an toàn khi chưa có API key ngoài")
    void testGenerateSmartReplies_Fallback() {
        when(conversationRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(testConversation));
        when(messageRepository.findTop50ByConversationIdOrderByIdAsc(10L)).thenReturn(Collections.emptyList());

        AiSmartRepliesResponseDTO response = chatAiAssistantService.generateSmartReplies(10L, 200L);

        assertThat(response).isNotNull();
        assertThat(response.getSuggestions()).isNotEmpty();
        assertThat(response.getSuggestions().size()).isEqualTo(3);
        assertThat(response.getContextSummary()).contains("BK-20261122-001");
        assertThat(response.getSuggestions().get(0)).contains("NexSpace Saigon Innovation Hub");
    }

    @Test
    @DisplayName("Người lạ không thuộc cuộc hội thoại sẽ bị ném NotFoundException (Strict Ownership Defense)")
    void testUnauthorizedCaller_ThrowsNotFoundException() {
        when(conversationRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(testConversation));

        assertThatThrownBy(() -> chatAiAssistantService.generateSmartReplies(10L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy cuộc hội thoại hỗ trợ");
    }

    @Test
    @DisplayName("Hiệu chỉnh văn phong hoàn trả nội dung gốc an toàn khi Gemini không khả dụng")
    void testAdjustTone_SafeReturn() {
        when(conversationRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(testConversation));

        AiToneAdjustmentRequestDTO request = new AiToneAdjustmentRequestDTO();
        request.setText("Bạn đến nơi chưa?");
        request.setMode("POLITE");

        AiToneAdjustmentResponseDTO response = chatAiAssistantService.adjustTone(10L, 200L, request);

        assertThat(response).isNotNull();
        assertThat(response.getOriginalText()).isEqualTo("Bạn đến nơi chưa?");
        assertThat(response.getAdjustedText()).isEqualTo("Bạn đến nơi chưa?");
        assertThat(response.getMode()).isEqualTo("POLITE");
    }

    @Test
    @DisplayName("Chủ không gian tag @NexSpace AI sẽ bị bỏ qua và không tạo tin nhắn công khai trong phòng chat")
    void testRespondToMention_OrganizerMention_IsIgnored() {
        when(conversationRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(testConversation));

        // Chủ không gian (id 200L) cố gắng tag @NexSpace AI
        chatAiAssistantService.respondToMention(10L, 200L, "@NexSpace AI tổng hợp đoạn chat");

        // Đảm bảo không lưu tin nhắn AI nào vào phòng chat công khai
        org.mockito.Mockito.verify(messageRepository, org.mockito.Mockito.never()).save(org.mockito.ArgumentMatchers.any());
    }

    @Test
    @DisplayName("Chủ không gian yêu cầu tóm tắt nội dung cuộc trò chuyện trả về bản tóm tắt nội bộ")
    void testSummarizeConversation_ReturnsPrivateSummary() {
        when(conversationRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(testConversation));
        base.api.shared.entity.chat.BookingChatMessageModel msg1 = new base.api.shared.entity.chat.BookingChatMessageModel();
        msg1.setId(1L);
        msg1.setContent("Cho mình hỏi pass wifi");
        msg1.setSender(testCustomer);

        when(messageRepository.findByConversationIdOrderByIdDesc(eq(10L), any()))
                .thenReturn(new org.springframework.data.domain.PageImpl<>(List.of(msg1)));

        base.api.feature.chat.dto.response.AiChatSummaryResponseDTO summary =
                chatAiAssistantService.summarizeConversation(10L, 200L);

        assertThat(summary).isNotNull();
        assertThat(summary.getConversationId()).isEqualTo(10L);
        assertThat(summary.getSummary()).contains("BK-20261122-001");
    }

    @Test
    @DisplayName("Khách hàng hỏi toán học 1+1 cũng bị từ chối lịch sự và hướng dẫn về đơn đặt chỗ")
    void testRespondToMention_CustomerOffTopicMath_RefusesPolitely() {
        when(conversationRepository.findByIdWithDetails(10L)).thenReturn(Optional.of(testConversation));
        when(messageRepository.save(org.mockito.ArgumentMatchers.any())).thenAnswer(invocation -> invocation.getArgument(0));

        // Khách hàng hỏi câu toán học ngoài luồng
        chatAiAssistantService.respondToMention(10L, 100L, "@NexSpace AI 1+1 bằng mấy");

        org.mockito.ArgumentCaptor<base.api.shared.entity.chat.BookingChatMessageModel> captor =
                org.mockito.ArgumentCaptor.forClass(base.api.shared.entity.chat.BookingChatMessageModel.class);
        org.mockito.Mockito.verify(messageRepository).save(captor.capture());

        base.api.shared.entity.chat.BookingChatMessageModel savedMessage = captor.getValue();
        assertThat(savedMessage).isNotNull();
        assertThat(savedMessage.getMessageType()).isEqualTo("AI_ASSISTANT");
        assertThat(savedMessage.getContent())
                .contains("trợ lý ảo hỗ trợ không gian làm việc và đơn đặt chỗ")
                .contains("BK-20261122-001")
                .doesNotContain("bằng 2");
    }
}
