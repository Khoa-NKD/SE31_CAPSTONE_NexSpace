package base.api.feature.chatbot.service.impl;

import base.api.feature.chatbot.dto.request.ChatMessageItemDto;
import base.api.feature.chatbot.dto.request.ChatbotRequestDto;
import base.api.feature.chatbot.dto.response.ChatbotResponseDto;
import base.api.feature.chatbot.service.IChatbotService;
import base.api.feature.chatbot.service.NexBotContextGrounder;
import base.api.feature.chatbot.service.NexBotContextGrounder.GroundingSnapshot;
import base.api.feature.chatbot.service.NexBotFallbackResponder;
import base.api.feature.chatbot.service.NexBotKnowledgeBase;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;

/**
 * Gemini-powered NexBot assistant grounded on live NexSpace database context,
 * verified internal routes, and curated few-shot examples, with deterministic DB-grounded fallback.
 */
@Slf4j
@Service
public class GeminiChatbotServiceImpl implements IChatbotService {

    private static final String GEMINI_API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);
    private static final int MAX_HISTORY_TURNS = 8;

    private final ObjectMapper mapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String primaryModel;
    private final NexBotContextGrounder contextGrounder;

    @Autowired
    public GeminiChatbotServiceImpl(
            ObjectMapper mapper,
            @Value("${nexspace.chatbot.gemini-api-key:}") String chatbotApiKey,
            @Value("${nexspace.chatbot.model:gemini-3.5-flash-lite}") String primaryModel,
            @Autowired(required = false) NexBotContextGrounder contextGrounder,
            @Autowired(required = false) IWorkspaceRepository workspaceRepository
    ) {
        this(
                mapper,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                resolveChatbotApiKey(chatbotApiKey),
                primaryModel,
                contextGrounder != null ? contextGrounder : new NexBotContextGrounder(workspaceRepository)
        );
    }

    public GeminiChatbotServiceImpl(
            ObjectMapper mapper,
            HttpClient httpClient,
            String apiKey,
            String primaryModel
    ) {
        this(mapper, httpClient, apiKey, primaryModel, new NexBotContextGrounder());
    }

    public GeminiChatbotServiceImpl(
            ObjectMapper mapper,
            HttpClient httpClient,
            String apiKey,
            String primaryModel,
            IWorkspaceRepository workspaceRepository
    ) {
        this(mapper, httpClient, apiKey, primaryModel, new NexBotContextGrounder(workspaceRepository));
    }

    public GeminiChatbotServiceImpl(
            ObjectMapper mapper,
            HttpClient httpClient,
            String apiKey,
            String primaryModel,
            NexBotContextGrounder contextGrounder
    ) {
        this.mapper = mapper;
        this.httpClient = httpClient;
        this.apiKey = apiKey == null ? "" : apiKey.trim();
        this.primaryModel = (primaryModel == null || primaryModel.isBlank())
                ? "gemini-3.5-flash-lite"
                : primaryModel.trim();
        this.contextGrounder = contextGrounder != null ? contextGrounder : new NexBotContextGrounder();
    }

    private static String resolveChatbotApiKey(String chatbotApiKey) {
        return chatbotApiKey != null && !chatbotApiKey.isBlank() ? chatbotApiKey.trim() : "";
    }

    @Override
    public ChatbotResponseDto chat(Long actorId, ChatbotRequestDto request) {
        String userQuery = request.getMessage() != null ? request.getMessage().trim() : "";
        GroundingSnapshot snapshot = contextGrounder.capture(
                actorId,
                request.getWorkspaceId(),
                userQuery,
                request.getCurrentPath()
        );

        if (isGeminiApiKeyValid(apiKey)) {
            try {
                ChatbotResponseDto response = callGeminiApi(userQuery, request, snapshot);
                if (response != null && response.getReply() != null && !response.getReply().isBlank()) {
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini Chatbot API call failed for query '{}': {}. Falling back to grounded FAQ engine.",
                        userQuery, e.getMessage());
            }
        }

        return NexBotFallbackResponder.respond(userQuery, snapshot, request.getUserRole());
    }

    private boolean isGeminiApiKeyValid(String key) {
        return key != null && !key.isBlank() && key.trim().length() >= 20;
    }

    private ChatbotResponseDto callGeminiApi(
            String userQuery,
            ChatbotRequestDto request,
            GroundingSnapshot snapshot
    ) throws Exception {
        String url = String.format(GEMINI_API_URL_TEMPLATE, primaryModel);

        ObjectNode rootNode = mapper.createObjectNode();

        String systemInstruction = NexBotKnowledgeBase.systemInstructionHeader()
                + NexBotKnowledgeBase.fewShotExamples()
                + snapshot.toPromptContext(request.getUserRole());

        ObjectNode systemInstructionNode = rootNode.putObject("systemInstruction");
        systemInstructionNode.putArray("parts").addObject().put("text", systemInstruction);

        ArrayNode contentsNode = rootNode.putArray("contents");
        List<ChatMessageItemDto> history = request.getHistory();
        if (history != null && !history.isEmpty()) {
            int startIdx = Math.max(0, history.size() - MAX_HISTORY_TURNS);
            for (int i = startIdx; i < history.size(); i++) {
                ChatMessageItemDto item = history.get(i);
                if (item.getContent() != null && !item.getContent().isBlank()) {
                    ObjectNode historyEntry = contentsNode.addObject();
                    String role = "model".equalsIgnoreCase(item.getRole()) || "assistant".equalsIgnoreCase(item.getRole())
                            ? "model"
                            : "user";
                    historyEntry.put("role", role);
                    historyEntry.putArray("parts").addObject().put("text", item.getContent());
                }
            }
        }

        ObjectNode currentMessageNode = contentsNode.addObject();
        currentMessageNode.put("role", "user");
        currentMessageNode.putArray("parts").addObject().put("text", userQuery);

        ObjectNode genConfig = rootNode.putObject("generationConfig");
        genConfig.put("maxOutputTokens", 1800);
        genConfig.put("temperature", 0.45);

        String jsonPayload = mapper.writeValueAsString(rootNode);

        HttpRequest httpRequest = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Content-Type", "application/json")
                .header("x-goog-api-key", apiKey)
                .timeout(REQUEST_TIMEOUT)
                .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                .build();

        HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));
        if (httpResponse.statusCode() < 200 || httpResponse.statusCode() >= 300) {
            log.warn("Gemini API returned status {}: {}", httpResponse.statusCode(), httpResponse.body());
            return null;
        }

        JsonNode responseJson = mapper.readTree(httpResponse.body());
        JsonNode parts = responseJson.path("candidates").path(0).path("content").path("parts");

        StringBuilder textBuilder = new StringBuilder();
        if (parts.isArray()) {
            for (JsonNode part : parts) {
                if (!part.path("thought").asBoolean(false) && part.has("text")) {
                    textBuilder.append(part.path("text").asText());
                }
            }
        }

        String aiReply = textBuilder.toString().trim();
        if (aiReply.isEmpty()) {
            return null;
        }

        return ChatbotResponseDto.builder()
                .reply(aiReply)
                .suggestedQuestions(extractSmartSuggestions(userQuery, snapshot, request.getUserRole()))
                .serverTime(LocalDateTime.now())
                .isFallback(false)
                .build();
    }

    private List<String> extractSmartSuggestions(String query, GroundingSnapshot snapshot, String roleHint) {
        String lower = query.toLowerCase(Locale.ROOT);
        String effectiveRole = snapshot.user() != null ? snapshot.user().role() : roleHint;

        if ("ORGANIZER".equalsIgnoreCase(effectiveRole) || containsAny(lower, "organizer", "đối tác", "payout", "floor")) {
            return List.of(
                    "Quy trình ký hợp đồng OTP và tạo không gian?",
                    "Cách thiết lập Floor Plan AI Studio và ma trận giá?",
                    "Số dư HELD và quy trình rút tiền Payout?"
            );
        }
        if ("ADMIN".equalsIgnoreCase(effectiveRole) || containsAny(lower, "admin", "kiểm duyệt", "tranh chấp")) {
            return List.of(
                    "Hướng dẫn duyệt hồ sơ Organizer và không gian?",
                    "Cách xử lý yêu cầu hoàn tiền và đối soát?",
                    "Quản lý tranh chấp và báo cáo ở trang nào?"
            );
        }
        if (containsAny(lower, "gần tôi", "ở đâu", "địa chỉ", "workspace", "không gian")) {
            return List.of(
                    "Bảng giá thuê bàn, phòng và tiện ích add-on?",
                    "Quy trình đặt chỗ 6 bước kèm link?",
                    "Cơ chế giữ chỗ tạm thời và chống spam hold?"
            );
        }
        if (containsAny(lower, "giá", "chi phí", "bao nhiêu", "vat", "add-on")) {
            return List.of(
                    "Tìm không gian đang mở gần tôi nhất?",
                    "Thanh toán qua PayOS VietQR như thế nào?",
                    "Chính sách hủy đơn và hoàn tiền?"
            );
        }
        if (containsAny(lower, "đặt", "thuê", "booking", "giữ chỗ", "hold")) {
            return List.of(
                    "🎯 Hướng dẫn đặt chỗ theo trang hiện tại",
                    "Làm sao để hủy đơn và nhận hoàn tiền?",
                    "Cách mở chat hỗ trợ với chủ không gian?"
            );
        }
        return List.of(
                "🎯 Hướng dẫn đặt chỗ theo trang hiện tại",
                "Tìm không gian tại Đà Nẵng giá 10.000đ ngày mai 9h-11h ghế số 1 còn trống không?",
                "Quy trình đặt chỗ 6 bước tại NexSpace?",
                "Cơ chế giữ chỗ tạm thời và hủy hoàn tiền?"
        );
    }

    private static boolean containsAny(String input, String... keywords) {
        for (String kw : keywords) {
            if (input.contains(kw)) {
                return true;
            }
        }
        return false;
    }
}
