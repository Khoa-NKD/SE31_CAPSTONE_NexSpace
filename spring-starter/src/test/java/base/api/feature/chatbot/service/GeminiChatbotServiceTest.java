package base.api.feature.chatbot.service;

import base.api.feature.chatbot.dto.request.ChatMessageItemDto;
import base.api.feature.chatbot.dto.request.ChatbotRequestDto;
import base.api.feature.chatbot.dto.response.ChatbotResponseDto;
import base.api.feature.chatbot.service.impl.GeminiChatbotServiceImpl;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.http.HttpClient;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class GeminiChatbotServiceTest {

    private GeminiChatbotServiceImpl chatbotService;

    @BeforeEach
    void setUp() {
        ObjectMapper objectMapper = new ObjectMapper();
        HttpClient httpClient = mock(HttpClient.class);
        // Khởi tạo service không có API key để kiểm tra Fail-Safe Fallback Engine
        chatbotService = new GeminiChatbotServiceImpl(objectMapper, httpClient, "", "gemini-2.5-flash");
    }

    @Test
    @DisplayName("Fallback response for greeting query returns greeting with smart suggestions")
    void testGreetingFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Xin chào NexBot!")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("NexBot");
        assertThat(response.isFallback()).isTrue();
        assertThat(response.getSuggestedQuestions()).isNotEmpty();
    }

    @Test
    @DisplayName("Fallback response for booking query returns 6-step booking process")
    void testBookingProcessFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Làm sao để đặt chỗ bàn làm việc?")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).containsIgnoringCase("Quy trình Đặt chỗ tại NexSpace");
        assertThat(response.getReply()).contains("Giữ chỗ tạm thời 10 phút");
        assertThat(response.isFallback()).isTrue();
        assertThat(response.getSuggestedQuestions()).isNotEmpty();
    }

    @Test
    @DisplayName("Fallback response for temporary hold query explains hold duration and limits")
    void testTemporaryHoldFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Cơ chế giữ chỗ tạm thời 10 phút là gì?")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("Temporary Hold Engine");
        assertThat(response.getReply()).contains("3 chỗ đồng thời");
        assertThat(response.getReply()).contains("10 phút");
        assertThat(response.isFallback()).isTrue();
    }

    @Test
    @DisplayName("Fallback response for organizer onboarding query returns partner guidance")
    void testOrganizerFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Tôi muốn đăng ký trở thành đối tác Organizer")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).containsIgnoringCase("Trở thành Đối tác Organizer");
        assertThat(response.getReply()).contains("Floor Plan AI Studio");
        assertThat(response.isFallback()).isTrue();
    }

    @Test
    @DisplayName("Fallback response for PayOS payment query explains VietQR and auto confirmation")
    void testPaymentFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Tôi có thể thanh toán qua PayOS như thế nào?")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("PayOS");
        assertThat(response.getReply()).contains("VietQR");
        assertThat(response.isFallback()).isTrue();
    }

    @Test
    @DisplayName("Fallback response for nearby workspace query returns locations, pricing and GPS tip")
    void testNearbyWorkspacesFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Work space nào gần tôi nhất")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("Không Gian Làm Việc Nổi Bật");
        assertThat(response.getReply()).contains("Enouvo Space 1");
        assertThat(response.getReply()).contains("Định vị GPS");
        assertThat(response.isFallback()).isTrue();
        assertThat(response.getSuggestedQuestions()).isNotEmpty();
    }

    @Test
    @DisplayName("Fallback response for pricing query returns prices for desk and room")
    void testPricingFallback() {
        ChatbotRequestDto request = ChatbotRequestDto.builder()
                .message("Giá thuê bàn làm việc bao nhiêu tiền?")
                .build();

        ChatbotResponseDto response = chatbotService.chat(null, request);

        assertThat(response).isNotNull();
        assertThat(response.getReply()).contains("Bảng Giá Dịch Vụ Minh Bạch");
        assertThat(response.getReply()).contains("Focus Desk");
        assertThat(response.getReply()).contains("Meeting Room");
        assertThat(response.isFallback()).isTrue();
    }
}
