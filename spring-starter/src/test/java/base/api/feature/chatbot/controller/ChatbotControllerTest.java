package base.api.feature.chatbot.controller;

import base.api.feature.chatbot.dto.request.ChatbotRequestDto;
import base.api.feature.chatbot.dto.response.ChatbotResponseDto;
import base.api.feature.chatbot.service.IChatbotService;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.AuthUser;
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
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ChatbotControllerTest {

    private MockMvc mockMvc;

    @Mock
    private IChatbotService chatbotService;

    @Mock
    private CurrentUserProvider currentUserProvider;

    @InjectMocks
    private ChatbotController controller;

    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("Public chat message succeeds for anonymous guest")
    void testSendMessageGuestSuccess() throws Exception {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Quy trình đặt chỗ tại NexSpace thế nào?")
                .build();

        ChatbotResponseDto response = ChatbotResponseDto.builder()
                .reply("NexSpace hỗ trợ 6 bước đặt chỗ nhanh chóng...")
                .suggestedQuestions(List.of("Giữ chỗ 10 phút là gì?", "Thanh toán qua PayOS ra sao?"))
                .serverTime(LocalDateTime.now())
                .isFallback(false)
                .build();

        when(currentUserProvider.getCurrentUser()).thenReturn(Optional.empty());
        when(chatbotService.chat(isNull(), any(ChatbotRequestDto.class))).thenReturn(response);

        mockMvc.perform(post("/api/v1/public/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.reply").value("NexSpace hỗ trợ 6 bước đặt chỗ nhanh chóng..."))
                .andExpect(jsonPath("$.data.suggestedQuestions[0]").value("Giữ chỗ 10 phút là gì?"));
    }

    @Test
    @DisplayName("Sending blank message returns 400 Bad Request")
    void testSendMessageBlankMessageReturns400() throws Exception {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("   ")
                .build();

        mockMvc.perform(post("/api/v1/public/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("Sending message exceeding 1000 characters returns 400 Bad Request")
    void testSendMessageOversizedMessageReturns400() throws Exception {
        String longMessage = "a".repeat(1001);
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message(longMessage)
                .build();

        mockMvc.perform(post("/api/v1/public/chat")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
