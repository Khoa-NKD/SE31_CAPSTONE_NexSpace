package base.api.feature.chat.controller;

import base.api.feature.chat.dto.request.SendChatMessageRequestDTO;
import base.api.feature.chat.dto.response.BookingChatMessageResponseDTO;
import base.api.feature.chat.dto.response.BookingConversationResponseDTO;
import base.api.feature.chat.service.IBookingChatService;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class BookingChatControllerTest {

    private MockMvc mockMvc;
    private ObjectMapper objectMapper;

    @Mock
    private IBookingChatService chatService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private BookingChatController chatController;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(chatController, "currentUserProvider", currentUserProvider);
        mockMvc = MockMvcBuilders.standaloneSetup(chatController)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
        objectMapper = new ObjectMapper().registerModule(new JavaTimeModule());
    }

    @Test
    @DisplayName("POST /api/chat/conversations/booking/{id} - Thành công trả về 200 và conversation")
    void getOrCreateConversation_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);
        BookingConversationResponseDTO dto = BookingConversationResponseDTO.builder()
                .id(1L)
                .bookingId(500L)
                .bookingCode("NX-5001")
                .bookingStatus("CONFIRMED")
                .customerId(10L)
                .customerName("Huy Mai")
                .organizerId(20L)
                .organizerName("Le Toan")
                .build();
        when(chatService.getOrCreateConversation(500L, 10L)).thenReturn(dto);

        mockMvc.perform(post("/api/chat/conversations/booking/500"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.bookingCode").value("NX-5001"))
                .andExpect(jsonPath("$.data.bookingStatus").value("CONFIRMED"));
    }

    @Test
    @DisplayName("POST /api/chat/conversations/booking/{id} - Khi booking chưa CONFIRMED trả về 409 Conflict")
    void getOrCreateConversation_whenNotConfirmed_returns409() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);
        when(chatService.getOrCreateConversation(500L, 10L))
                .thenThrow(new ConflictException("Chỉ có thể nhắn tin hỗ trợ khi đơn đặt chỗ đã được xác nhận"));

        mockMvc.perform(post("/api/chat/conversations/booking/500"))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /api/chat/conversations/{id}/messages - Gửi tin nhắn thành công trả về 201 Created")
    void sendMessage_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(10L);
        SendChatMessageRequestDTO req = new SendChatMessageRequestDTO();
        req.setContent("Xin chào");

        BookingChatMessageResponseDTO res = BookingChatMessageResponseDTO.builder()
                .id(101L)
                .conversationId(1L)
                .senderId(10L)
                .senderName("Huy Mai")
                .content("Xin chào")
                .createdAt(LocalDateTime.now())
                .build();

        when(chatService.sendMessage(eq(1L), eq(10L), any(SendChatMessageRequestDTO.class))).thenReturn(res);

        mockMvc.perform(post("/api/chat/conversations/1/messages")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(101L))
                .andExpect(jsonPath("$.data.content").value("Xin chào"));
    }

    @Test
    @DisplayName("GET /api/chat/conversations - Lấy danh sách hội thoại có phân trang")
    void getConversations_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(20L);
        BookingConversationResponseDTO dto = BookingConversationResponseDTO.builder()
                .id(1L)
                .bookingId(500L)
                .bookingCode("NX-5001")
                .build();
        when(chatService.getConversations(eq(20L), eq("ORGANIZER"), any()))
                .thenReturn(new PageImpl<>(List.of(dto)));

        mockMvc.perform(get("/api/chat/conversations?role=ORGANIZER&page=1&size=10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].bookingCode").value("NX-5001"));
    }
}
