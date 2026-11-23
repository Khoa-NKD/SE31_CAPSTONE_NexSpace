package base.api.feature.chat.service.impl;

import base.api.feature.auth.repository.IRoleRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.chat.dto.request.AiToneAdjustmentRequestDTO;
import base.api.feature.chat.dto.response.AiChatSummaryResponseDTO;
import base.api.feature.chat.dto.response.AiSmartRepliesResponseDTO;
import base.api.feature.chat.dto.response.AiToneAdjustmentResponseDTO;
import base.api.feature.chat.dto.response.BookingChatMessageResponseDTO;
import base.api.feature.chat.mapper.BookingChatMapper;
import base.api.feature.chat.repository.IBookingChatMessageRepository;
import base.api.feature.chat.repository.IBookingConversationRepository;
import base.api.feature.chat.service.IChatAiAssistantService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.chat.BookingChatMessageModel;
import base.api.shared.entity.chat.BookingConversationModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.NotFoundException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.*;

@Slf4j
@Service
public class ChatAiAssistantServiceImpl implements IChatAiAssistantService {

    private static final String GEMINI_API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(12);
    private static final DateTimeFormatter TIME_FORMATTER = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private final ObjectMapper mapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String primaryModel;
    private final IBookingConversationRepository conversationRepository;
    private final IBookingChatMessageRepository messageRepository;

    @Autowired(required = false)
    private IUserRepository userRepository;

    @Autowired(required = false)
    private IRoleRepository roleRepository;

    @Autowired(required = false)
    private PasswordEncoder passwordEncoder;

    @Autowired(required = false)
    private SimpMessagingTemplate messagingTemplate;

    @Autowired
    public ChatAiAssistantServiceImpl(
            ObjectMapper mapper,
            @Value("${nexspace.chat-ai.gemini-api-key:}") String chatAiApiKey,
            @Value("${nexspace.chatbot.gemini-api-key:}") String chatbotApiKey,
            @Value("${nexspace.chat-ai.model:gemini-3.5-flash-lite}") String primaryModel,
            IBookingConversationRepository conversationRepository,
            IBookingChatMessageRepository messageRepository
    ) {
        this.mapper = mapper;
        this.httpClient = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
        this.apiKey = resolveApiKey(chatAiApiKey, chatbotApiKey);
        this.primaryModel = (primaryModel != null && !primaryModel.isBlank()) ? primaryModel.trim() : "gemini-3.5-flash-lite";
        this.conversationRepository = conversationRepository;
        this.messageRepository = messageRepository;
    }

    private static String resolveApiKey(String chatAiApiKey, String chatbotApiKey) {
        if (chatAiApiKey != null && !chatAiApiKey.isBlank()) {
            return chatAiApiKey.trim();
        }
        if (chatbotApiKey != null && !chatbotApiKey.isBlank()) {
            return chatbotApiKey.trim();
        }
        return "";
    }

    @Override
    @Transactional(readOnly = true)
    public AiSmartRepliesResponseDTO generateSmartReplies(Long conversationId, Long callerId) {
        BookingConversationModel conversation = getAndValidateConversation(conversationId, callerId);
        boolean isCustomer = conversation.getCustomer() != null && conversation.getCustomer().getId().equals(callerId);

        BookingModel booking = conversation.getBooking();
        WorkspaceModel workspace = conversation.getWorkspace();

        String customerName = conversation.getCustomer() != null ? conversation.getCustomer().getFullName() : "Khách Hàng";
        String bookingCode = booking != null ? booking.getBookingCode() : "N/A";
        String workspaceName = workspace != null ? workspace.getName() : "Không gian làm việc";
        String workspaceAddress = workspace != null && workspace.getAddress() != null ? workspace.getAddress() : "";
        String bookingStatus = booking != null && booking.getStatus() != null ? booking.getStatus().name() : "CONFIRMED";

        String timeRange = "";
        String resourceName = "Chỗ ngồi / Bàn làm việc";
        if (booking != null) {
            try {
                if (booking.getResource() != null) {
                    String resTitle = booking.getResource().getName() != null ? booking.getResource().getName() : booking.getResource().getLabel();
                    String typeName = booking.getResource().getResourceType() != null ? booking.getResource().getResourceType().getName() : "Không gian";
                    resourceName = resTitle + " (" + typeName + ")";
                }
            } catch (Exception e) {
                log.warn("Lỗi khi đọc resource trong generateSmartReplies: {}", e.getMessage());
            }
            if (booking.getStartTime() != null && booking.getEndTime() != null) {
                timeRange = booking.getStartTime().format(TIME_FORMATTER) + " - " + booking.getEndTime().format(TIME_FORMATTER);
            }
        }

        // Load recent messages
        List<BookingChatMessageModel> allMessages = messageRepository.findTop50ByConversationIdOrderByIdAsc(conversationId);
        int fromIdx = Math.max(0, allMessages.size() - 6);
        List<BookingChatMessageModel> recent = allMessages.subList(fromIdx, allMessages.size());

        StringBuilder messagesText = new StringBuilder();
        for (BookingChatMessageModel m : recent) {
            String senderLabel = (m.getSender() != null && m.getSender().getId().equals(conversation.getOrganizer().getId()))
                    ? "Organizer (Chủ không gian)"
                    : "AI_ASSISTANT".equalsIgnoreCase(m.getMessageType())
                    ? "NexSpace AI"
                    : "Khách hàng (" + customerName + ")";
            messagesText.append(String.format("- %s: %s\n", senderLabel, m.getContent()));
        }

        String contextSummary = String.format("Đơn #%s • %s • %s", bookingCode, workspaceName, resourceName);

        List<String> suggestions;
        if (isCustomer) {
            // Gợi ý câu hỏi nhanh dành cho Khách hàng
            suggestions = callGeminiForCustomerQuestions(
                    bookingCode, workspaceName, workspaceAddress, resourceName, timeRange, messagesText.toString()
            );
            if (suggestions == null || suggestions.isEmpty()) {
                suggestions = buildFallbackCustomerQuestions(workspaceName, bookingCode);
            }
        } else {
            // Gợi ý câu trả lời / chào đón dành cho Chủ không gian
            suggestions = callGeminiForSmartReplies(
                    customerName, bookingCode, bookingStatus, workspaceName, workspaceAddress,
                    resourceName, timeRange, messagesText.toString()
            );
            if (suggestions == null || suggestions.isEmpty()) {
                suggestions = buildFallbackSmartReplies(customerName, bookingCode, workspaceName);
            }
        }

        return AiSmartRepliesResponseDTO.builder()
                .suggestions(suggestions)
                .contextSummary(contextSummary)
                .build();
    }

    @Override
    @Transactional(readOnly = true)
    public AiToneAdjustmentResponseDTO adjustTone(Long conversationId, Long callerId, AiToneAdjustmentRequestDTO request) {
        BookingConversationModel conversation = getAndValidateConversation(conversationId, callerId);
        boolean isCustomer = conversation.getCustomer() != null && conversation.getCustomer().getId().equals(callerId);

        String originalText = request.getText().trim();
        String mode = request.getMode() != null ? request.getMode().toUpperCase() : "POLITE";

        String prompt;
        if (isCustomer) {
            // Người gọi là Khách hàng nhắn cho Chủ không gian
            prompt = switch (mode) {
                case "CONCISE" ->
                        "Bạn là trợ lý soạn tin nhắn cho KHÁCH HÀNG (Customer) gửi cho CHỦ KHÔNG GIAN (Host/Organizer) tại phòng chat đặt chỗ NexSpace.\n" +
                        "Nhiệm vụ: Viết lại tin nhắn sau của Khách hàng sao cho thật ngắn gọn, súc tích, đi thẳng vào câu hỏi hoặc yêu cầu cần hỏi, nhưng vẫn giữ thái độ lịch sự, tôn trọng.\n" +
                        "QUY TẮC CỐT LÕI: Bạn viết từ góc nhìn của KHÁCH HÀNG gửi cho CHỦ NHÀ. TUYỆT ĐỐI KHÔNG đóng vai chủ không gian, KHÔNG chào đón khách, KHÔNG tự bịa gửi mật khẩu wifi.\n" +
                        "Ví dụ nếu khách gõ 'wifi là chi', hãy viết lại thành: 'Dạ anh/chị cho em xin mật khẩu Wi-Fi với ạ.'\n" +
                        "Chỉ trả về duy nhất nội dung đã viết lại:\n\n\"" + originalText + "\"";
                case "TRANSLATE_EN" ->
                        "Translate the following message from a customer/guest to the workspace host/organizer into natural, polite, and clear English. Return ONLY the translated message:\n\n\"" + originalText + "\"";
                case "TRANSLATE_VI" ->
                        "Hãy dịch tin nhắn sau đây sang tiếng Việt tự nhiên, lễ phép và rõ ràng cho Khách hàng gửi Chủ không gian. Chỉ trả về duy nhất nội dung đã dịch:\n\n\"" + originalText + "\"";
                default ->
                        "Bạn là trợ lý soạn tin nhắn cho KHÁCH HÀNG (Customer) gửi cho CHỦ KHÔNG GIAN (Host/Organizer) tại phòng chat đặt chỗ NexSpace.\n" +
                        "Nhiệm vụ: Viết lại tin nhắn sau của Khách hàng sao cho thật lịch sự, lễ phép, tôn trọng (tự xưng em/mình và gọi anh/chị đối với Chủ không gian), giữ đúng ý định hỏi thăm hoặc yêu cầu hỗ trợ của khách hàng.\n" +
                        "QUY TẮC CỐT LÕI: Bạn viết từ góc nhìn của KHÁCH HÀNG gửi cho CHỦ NHÀ. TUYỆT ĐỐI KHÔNG đóng vai Chủ không gian, KHÔNG chào mừng khách, KHÔNG tự bịa gửi mật khẩu hay hướng dẫn như người quản lý.\n" +
                        "Ví dụ nếu khách gõ 'wifi là chi', hãy viết lại thành: 'Dạ em chào anh/chị, cho em hỏi mật khẩu Wi-Fi tại không gian là gì vậy ạ? Em cảm ơn anh/chị!'\n" +
                        "Chỉ trả về duy nhất nội dung đã viết lại:\n\n\"" + originalText + "\"";
            };
        } else {
            // Người gọi là Chủ không gian nhắn cho Khách hàng
            prompt = switch (mode) {
                case "CONCISE" ->
                        "Bạn là trợ lý soạn tin nhắn cho CHỦ KHÔNG GIAN (Organizer/Host) gửi cho KHÁCH HÀNG (Customer) tại nền tảng NexSpace.\n" +
                        "Nhiệm vụ: Viết lại tin nhắn sau sao cho thật ngắn gọn, súc tích, đi thẳng vào hướng dẫn hoặc giải đáp cho khách hàng nhưng vẫn lịch sự, chuyên nghiệp.\n" +
                        "Chỉ trả về duy nhất nội dung đã viết lại:\n\n\"" + originalText + "\"";
                case "TRANSLATE_EN" ->
                        "Translate the following customer support message from host/organizer into natural, professional, and hospitable English. Return ONLY the translated message:\n\n\"" + originalText + "\"";
                case "TRANSLATE_VI" ->
                        "Hãy dịch tin nhắn sau đây sang tiếng Việt tự nhiên, chuẩn mực và hiếu khách cho Chủ không gian gửi Khách hàng. Chỉ trả về duy nhất nội dung đã dịch:\n\n\"" + originalText + "\"";
                default ->
                        "Bạn là trợ lý soạn tin nhắn cho CHỦ KHÔNG GIAN (Organizer/Host) gửi cho KHÁCH HÀNG (Customer) tại nền tảng NexSpace.\n" +
                        "Nhiệm vụ: Viết lại tin nhắn sau sao cho thật lịch sự, ấm áp, nhã nhặn, tôn trọng và hiếu khách. Giữ nguyên thông tin giải đáp hoặc hướng dẫn.\n" +
                        "Chỉ trả về duy nhất nội dung đã chỉnh sửa:\n\n\"" + originalText + "\"";
            };
        }

        String adjusted = callGeminiForText(prompt);
        if (adjusted == null || adjusted.isBlank()) {
            adjusted = originalText;
        }

        if (isCustomer) {
            adjusted = sanitizeCustomerTone(adjusted, originalText);
        }
        adjusted = cleanHtmlTags(adjusted);

        return AiToneAdjustmentResponseDTO.builder()
                .originalText(originalText)
                .adjustedText(adjusted)
                .mode(mode)
                .build();
    }

    @Override
    public AiChatSummaryResponseDTO summarizeConversation(Long conversationId, Long callerId) {
        BookingConversationModel conversation = getAndValidateConversation(conversationId, callerId);

        // Lấy danh sách tin nhắn gần nhất
        Page<BookingChatMessageModel> recentMsgsPage = messageRepository
                .findByConversationIdOrderByIdDesc(conversationId, PageRequest.of(0, 30));
        List<BookingChatMessageModel> recentMsgs = new ArrayList<>();
        if (recentMsgsPage != null && recentMsgsPage.getContent() != null) {
            recentMsgs.addAll(recentMsgsPage.getContent());
            Collections.reverse(recentMsgs);
        }

        if (recentMsgs.isEmpty()) {
            return AiChatSummaryResponseDTO.builder()
                    .conversationId(conversationId)
                    .summary("Chưa có tin nhắn nào trong cuộc trò chuyện để tổng hợp.")
                    .generatedAt(LocalDateTime.now())
                    .build();
        }

        UserModel customer = conversation.getCustomer();
        UserModel organizer = conversation.getOrganizer();
        String customerName = customer != null ? customer.getFullName() : "Khách hàng";
        String organizerName = organizer != null ? organizer.getFullName() : "Chủ không gian";
        WorkspaceModel ws = conversation.getWorkspace();
        BookingModel bk = conversation.getBooking();
        String wsName = ws != null ? ws.getName() : "Không gian làm việc";
        String bkCode = bk != null ? bk.getBookingCode() : "";

        StringBuilder chatHistory = new StringBuilder();
        for (BookingChatMessageModel m : recentMsgs) {
            String role = (m.getSender() != null && organizer != null && m.getSender().getId().equals(organizer.getId()))
                    ? "Organizer (" + organizerName + ")"
                    : "AI_ASSISTANT".equalsIgnoreCase(m.getMessageType())
                    ? "NexSpace AI"
                    : "Khách hàng (" + customerName + ")";
            chatHistory.append(String.format("- %s: %s\n", role, m.getContent()));
        }

        String prompt = String.format("""
            Bạn là NexSpace AI - Trợ lý tóm tắt hội thoại nội bộ dành riêng cho Chủ không gian.
            Hãy đọc kỹ lịch sử tin nhắn dưới đây và tóm tắt ngắn gọn các điểm chính để Chủ không gian nắm bắt nhanh:

            THÔNG TIN ĐƠN ĐẶT CHỖ:
            - Không gian: %s
            - Mã đơn: #%s
            - Khách hàng: %s
            - Chủ không gian: %s

            LỊCH SỬ TIN NHẮN:
            %s

            HÃY TỔNG HỢP THEO BỐ CỤC:
            • Nhu cầu / Câu hỏi chính của khách hàng
            • Thỏa thuận hoặc thông tin hai bên đã trao đổi
            • Việc Chủ không gian cần lưu ý thực hiện tiếp theo (nếu có)

            Yêu cầu: Viết tiếng Việt ngắn gọn, súc tích (3-5 câu), không dùng thẻ HTML, tuyệt đối không gửi ra ngoài kênh chat công khai.
            """,
            wsName, bkCode, customerName, organizerName, chatHistory.toString()
        );

        String summary = null;
        if (!apiKey.isBlank()) {
            try {
                summary = callGeminiApi(
                        "Bạn là NexSpace AI - Trợ lý phân tích và tổng hợp nội dung cuộc trò chuyện nội bộ cho quản lý không gian làm việc.",
                        prompt,
                        0.2,
                        500
                );
            } catch (Exception e) {
                log.warn("Gemini summarize error: {}", e.getMessage());
            }
        }

        if (summary == null || summary.isBlank()) {
            summary = String.format(
                    "Tóm tắt trao đổi đơn #%s tại %s:\n• Khách hàng %s và Chủ không gian đã có %d tin nhắn trao đổi.\n• Vui lòng theo dõi chi tiết nội dung chat để hỗ trợ khách kịp thời.",
                    bkCode, wsName, customerName, recentMsgs.size()
            );
        }

        summary = cleanHtmlTags(summary);

        return AiChatSummaryResponseDTO.builder()
                .conversationId(conversationId)
                .summary(summary)
                .generatedAt(LocalDateTime.now())
                .build();
    }

    private List<String> callGeminiForSmartReplies(
            String customerName, String bookingCode, String bookingStatus,
            String workspaceName, String workspaceAddress, String resourceName,
            String timeRange, String messagesHistory
    ) {
        if (apiKey.isBlank()) {
            log.info("Gemini API key is blank, using smart fallback replies");
            return Collections.emptyList();
        }

        try {
            String systemInstruction = """
                    Bạn là Trợ lý AI thông minh chuyên nghiệp hỗ trợ Chủ không gian (Organizer) trên nền tảng NexSpace.
                    Nhiệm vụ: Phân tích ngữ cảnh đơn đặt chỗ và tin nhắn gần nhất của khách hàng để gợi ý đúng 3 câu trả lời mẫu ngắn gọn (mỗi câu tối đa 1-2 câu), tự nhiên, nhã nhặn, đúng thực tế.
                    QUY ĐỊNH BẮT BUỘC VỀ ĐỊNH DẠNG:
                    - TUYỆT ĐỐI KHÔNG dùng bất kỳ thẻ HTML nào (như <code>, <pre>, <b>, <i>, <br>).
                    - Chỉ dùng văn bản thuần túy (plain text). Mật khẩu hoặc mã mạng đặt trong dấu nháy đơn '...' (ví dụ: 'CampusNest_Guest', 'campusnest').
                    YÊU CẦU ĐỊNH DẠNG ĐẦU RA:
                    Bắt buộc trả về đúng 1 mảng JSON chứa 3 chuỗi ký tự Tiếng Việt, không kèm giải thích hay định dạng markdown khác:
                    ["Gợi ý 1", "Gợi ý 2", "Gợi ý 3"]
                    """;

            String userPrompt = String.format("""
                    NGỮ CẢNH ĐƠN ĐẶT CHỖ:
                    - Khách hàng: %s
                    - Mã đặt chỗ: #%s (%s)
                    - Không gian: %s (Địa chỉ: %s)
                    - Vị trí/Phòng: %s
                    - Khung giờ: %s
                    
                    LỊCH SỬ TIN NHẮN GẦN ĐÂY:
                    %s
                    
                    Hãy đưa ra 3 gợi ý trả lời tốt nhất cho Organizer:
                    """,
                    customerName, bookingCode, bookingStatus, workspaceName, workspaceAddress,
                    resourceName, timeRange, messagesHistory.isBlank() ? "(Chưa có tin nhắn nào)" : messagesHistory
            );

            String rawJson = callGeminiApi(systemInstruction, userPrompt, 0.4, 500);
            if (rawJson == null || rawJson.isBlank()) {
                return Collections.emptyList();
            }

            // Extract JSON array from text
            String cleanedJson = extractJsonArray(rawJson);
            JsonNode arrayNode = mapper.readTree(cleanedJson);
            if (arrayNode.isArray()) {
                List<String> list = new ArrayList<>();
                for (JsonNode item : arrayNode) {
                    String s = cleanHtmlTags(item.asText().trim());
                    if (!s.isEmpty()) {
                        list.add(s);
                    }
                }
                if (!list.isEmpty()) {
                    return list.stream().limit(3).toList();
                }
            }
        } catch (Exception e) {
            log.warn("Gemini smart replies failed: {}", e.getMessage());
        }

        return Collections.emptyList();
    }

    private List<String> callGeminiForCustomerQuestions(
            String bookingCode,
            String workspaceName,
            String workspaceAddress,
            String resourceName,
            String timeRange,
            String messagesHistory
    ) {
        if (apiKey.isBlank()) {
            return Collections.emptyList();
        }

        try {
            String systemInstruction = """
                Bạn là trợ lý gợi ý câu hỏi nhanh cho Khách hàng (Customer) trong phòng chat đặt chỗ tại nền tảng NexSpace.
                Hãy tạo ra đúng 3 câu hỏi/thắc mắc phổ biến nhất mà Khách hàng cần hỏi Chủ không gian hoặc hỏi @NexSpace AI.
                Định dạng các câu hỏi xuất phát từ góc nhìn của Khách hàng, tự nhiên, nhã nhặn (bắt đầu bằng "@NexSpace AI " hoặc câu hỏi lịch sự).
                Ví dụ: hỏi pass wifi, hướng dẫn check-in, chỗ gửi xe, tiện ích xung quanh.
                QUY ĐỊNH BẮT BUỘC: TUYỆT ĐỐI KHÔNG dùng bất kỳ thẻ HTML nào (như <code>, <pre>, <b>, <i>, <br>). Chỉ dùng văn bản thuần túy.
                BẮT BUỘC trả về duy nhất một mảng JSON Array chứa 3 chuỗi string, không kèm bất kỳ giải thích hay markdown code fence nào.
                """;

            String userPrompt = String.format("""
                THÔNG TIN ĐƠN ĐẶT CHỖ:
                - Mã đơn: #%s
                - Không gian: %s (%s)
                - Chỗ ngồi: %s
                - Thời gian sử dụng: %s
                - Lịch sử chat: %s

                Hãy tạo 3 câu hỏi nhanh thiết thực nhất cho Khách hàng (dưới dạng mảng JSON Array 3 chuỗi String).
                """,
                    bookingCode, workspaceName, workspaceAddress,
                    resourceName, timeRange, messagesHistory.isBlank() ? "(Chưa có tin nhắn nào)" : messagesHistory
            );

            String rawJson = callGeminiApi(systemInstruction, userPrompt, 0.4, 400);
            if (rawJson == null || rawJson.isBlank()) {
                return Collections.emptyList();
            }

            String cleanedJson = extractJsonArray(rawJson);
            JsonNode arrayNode = mapper.readTree(cleanedJson);
            if (arrayNode.isArray()) {
                List<String> list = new ArrayList<>();
                for (JsonNode item : arrayNode) {
                    String s = cleanHtmlTags(item.asText().trim());
                    if (!s.isEmpty()) {
                        list.add(s);
                    }
                }
                if (!list.isEmpty()) {
                    return list.stream().limit(3).toList();
                }
            }
        } catch (Exception e) {
            log.warn("Gemini customer questions failed: {}", e.getMessage());
        }

        return Collections.emptyList();
    }

    private List<String> buildFallbackCustomerQuestions(String workspaceName, String bookingCode) {
        return List.of(
                "@NexSpace AI Wifi ở đây pass là gì vậy ạ?",
                "@NexSpace AI Hướng dẫn mình cách check-in và nhận chỗ với ạ",
                "@NexSpace AI Không gian có chỗ gửi xe máy/ô tô không ạ?"
        );
    }

    private String callGeminiForText(String prompt) {
        if (apiKey.isBlank()) {
            return null;
        }
        try {
            return callGeminiApi(
                    "Bạn là chuyên gia ngôn ngữ và trợ lý hỗ trợ khách hàng của NexSpace. Hãy chỉnh sửa văn phong hoặc dịch thuật chính xác theo yêu cầu.",
                    prompt,
                    0.3,
                    400
            );
        } catch (Exception e) {
            log.warn("Gemini tone assistant failed: {}", e.getMessage());
            return null;
        }
    }

    private String callGeminiForMention(String prompt) {
        if (apiKey.isBlank()) {
            return null;
        }
        try {
            String systemInstruction = """
                    Bạn là NexSpace AI - Trợ lý ảo độc lập và khách quan của nền tảng đặt chỗ không gian làm việc NexSpace.
                    Bạn tham gia trong phòng chat giữa Khách hàng và Chủ không gian để hỗ trợ thông tin về không gian làm việc, đơn đặt chỗ, tiện ích hoặc tóm tắt trao đổi.
                    
                    QUY ĐỊNH BẢO VỆ PHẠM VI (TUYỆT ĐỐI TUÂN THỦ 100%):
                    1. BẠN CHỈ HỖ TRỢ CÁC VẤN ĐỀ VỀ KHÔNG GIAN LÀM VIỆC VÀ ĐƠN ĐẶT CHỖ HIỆN TẠI.
                    2. TUYỆT ĐỐI KHÔNG TRẢ LỜI CÁC CÂU HỎI NGOÀI LUỒNG (off-topic) như: toán học (ví dụ: '1+1 bằng mấy', các phép tính cộng trừ nhân chia), câu đố, lập trình máy tính, làm thơ, kiến thức bách khoa, thời sự, giải trí, thời tiết nơi khác, hay trò chuyện phiếm...
                    3. KHI GẶP BẤT KỲ CÂU HỎI NGOÀI LUỒNG NÀO:
                       - Bạn BẮT BUỘC PHẢI TỪ CHỐI LỊCH SỰ, giải thích rõ mình là NexSpace AI chuyên hỗ trợ đơn đặt chỗ và không gian làm việc.
                       - TUYỆT ĐỐI KHÔNG giải đáp, tính toán hay làm bài tập cho người dùng.
                    4. ĐỊNH DẠNG BẮT BUỘC: TUYỆT ĐỐI KHÔNG dùng bất kỳ thẻ HTML nào (như <code>, <pre>, <b>, <i>, <br>). Chỉ dùng văn bản thuần túy (plain text). Mật khẩu hoặc mã mạng đặt trong dấu nháy đơn '...' (ví dụ: 'CampusNest_Guest', 'campusnest').
                    """;
            return callGeminiApi(
                    systemInstruction,
                    prompt,
                    0.2,
                    500
            );
        } catch (Exception e) {
            log.warn("Gemini mention assistant failed: {}", e.getMessage());
            return null;
        }
    }

    private String callGeminiApi(String systemInstruction, String userQuery, double temperature, int maxTokens) {
        try {
            String url = String.format(GEMINI_API_URL_TEMPLATE, primaryModel);

            ObjectNode rootNode = mapper.createObjectNode();
            if (systemInstruction != null && !systemInstruction.isBlank()) {
                ObjectNode sysNode = rootNode.putObject("systemInstruction");
                sysNode.putArray("parts").addObject().put("text", systemInstruction);
            }

            ArrayNode contentsNode = rootNode.putArray("contents");
            ObjectNode msgNode = contentsNode.addObject();
            msgNode.put("role", "user");
            msgNode.putArray("parts").addObject().put("text", userQuery);

            ObjectNode genConfig = rootNode.putObject("generationConfig");
            genConfig.put("maxOutputTokens", maxTokens);
            genConfig.put("temperature", temperature);

            String jsonPayload = mapper.writeValueAsString(rootNode);

            HttpRequest httpRequest = HttpRequest.newBuilder()
                    .uri(URI.create(url))
                    .header("Content-Type", "application/json")
                    .header("x-goog-api-key", apiKey)
                    .timeout(REQUEST_TIMEOUT)
                    .POST(HttpRequest.BodyPublishers.ofString(jsonPayload, StandardCharsets.UTF_8))
                    .build();

            HttpResponse<String> httpResponse = httpClient.send(httpRequest, HttpResponse.BodyHandlers.ofString(StandardCharsets.UTF_8));

            if (httpResponse.statusCode() >= 200 && httpResponse.statusCode() < 300) {
                JsonNode responseJson = mapper.readTree(httpResponse.body());
                JsonNode candidate = responseJson.path("candidates").path(0);
                JsonNode parts = candidate.path("content").path("parts");

                StringBuilder sb = new StringBuilder();
                if (parts.isArray()) {
                    for (JsonNode part : parts) {
                        if (!part.path("thought").asBoolean(false) && part.has("text")) {
                            sb.append(part.path("text").asText());
                        }
                    }
                }
                return sb.toString().trim();
            } else {
                log.warn("Gemini API error (HTTP {}): {}", httpResponse.statusCode(), httpResponse.body());
            }
        } catch (Exception e) {
            log.warn("Gemini call exception: {}", e.getMessage());
        }
        return null;
    }

    private List<String> buildFallbackSmartReplies(String customerName, String bookingCode, String workspaceName) {
        return List.of(
                String.format("Xin chào %s! %s đã sẵn sàng đón bạn theo đơn #%s.", customerName, workspaceName, bookingCode),
                String.format("Bạn có cần hướng dẫn thêm về đường đi, vị trí gửi xe hoặc tiện ích tại %s không?", workspaceName),
                "Nếu bạn cần hỗ trợ thêm thông tin check-in hay thiết bị làm việc, cứ nhắn mình bất cứ lúc nào nhé!"
        );
    }

    @Override
    public void respondToMention(Long conversationId, Long senderId, String userMessage) {
        log.info("Processing @NexSpace AI mention in conversation {} from user {}", conversationId, senderId);
        BookingConversationModel conversation = conversationRepository.findByIdWithDetails(conversationId)
                .orElse(null);
        if (conversation == null) {
            log.warn("Conversation {} not found for AI mention", conversationId);
            return;
        }

        UserModel customer = conversation.getCustomer();
        UserModel organizer = conversation.getOrganizer();
        if (customer == null || organizer == null) {
            return;
        }

        // Chỉ khách hàng mới có thể tag @NexSpace AI công khai trong phòng chat
        if (!senderId.equals(customer.getId())) {
            log.info("Chỉ khách hàng mới có quyền nhắc @NexSpace AI công khai trong phòng chat. Bỏ qua yêu cầu từ organizer {}", senderId);
            return;
        }

        boolean isCustomer = true;
        String senderName = customer.getFullName();
        String organizerName = organizer.getFullName();

        // Workspace & Booking details
        WorkspaceModel ws = conversation.getWorkspace();
        BookingModel bk = conversation.getBooking();
        String wsName = ws != null ? ws.getName() : "Không gian làm việc";
        String wsAddress = ws != null && ws.getAddress() != null ? ws.getAddress() : "";
        String wsDesc = ws != null && ws.getDescription() != null ? ws.getDescription() : "";
        String bkCode = bk != null ? bk.getBookingCode() : "";

        // Pre-guard: Nếu câu hỏi hoàn toàn ngoài luồng (như toán học '1+1', đố vui, thơ ca...)
        if (isOffTopicQuery(userMessage)) {
            log.info("Phát hiện câu hỏi ngoài luồng từ người dùng trong conversation {}: '{}'", conversationId, userMessage);
            String refusal = buildOffTopicRefusal(isCustomer, wsName, bkCode);
            saveAiMessageAndBroadcast(conversationId, isCustomer, refusal);
            return;
        }

        // Fetch recent messages
        Page<BookingChatMessageModel> recentMsgsPage = messageRepository
                .findByConversationIdOrderByIdDesc(conversationId, PageRequest.of(0, 15));
        List<BookingChatMessageModel> recentMsgs = new ArrayList<>();
        if (recentMsgsPage != null && recentMsgsPage.getContent() != null) {
            recentMsgs.addAll(recentMsgsPage.getContent());
            Collections.reverse(recentMsgs);
        }

        StringBuilder chatHistory = new StringBuilder();
        for (BookingChatMessageModel m : recentMsgs) {
            String role = (m.getSender() != null && m.getSender().getId().equals(organizer.getId()))
                    ? "Organizer (" + organizerName + ")"
                    : "AI_ASSISTANT".equalsIgnoreCase(m.getMessageType())
                    ? "NexSpace AI"
                    : "Khách hàng (" + customer.getFullName() + ")";
            chatHistory.append(String.format("- %s: %s\n", role, m.getContent()));
        }

        String resourceName = "";
        String resourceType = "";
        if (bk != null) {
            try {
                if (bk.getResource() != null) {
                    resourceName = bk.getResource().getName() != null ? bk.getResource().getName() : bk.getResource().getLabel();
                    if (bk.getResource().getResourceType() != null) {
                        resourceType = bk.getResource().getResourceType().getName();
                    }
                }
            } catch (Exception e) {
                log.warn("Không thể tải thông tin resource cho booking #{}: {}", bkCode, e.getMessage());
            }
        }
        String startTime = (bk != null && bk.getStartTime() != null) ? bk.getStartTime().format(TIME_FORMATTER) : "";
        String endTime = (bk != null && bk.getEndTime() != null) ? bk.getEndTime().format(TIME_FORMATTER) : "";

        String prompt = buildMentionPrompt(
                wsName, wsAddress, wsDesc, bkCode, resourceName, resourceType, startTime, endTime,
                customer, organizer, isCustomer, senderName, organizerName, chatHistory.toString(), userMessage
        );

        // Network call to Gemini API: OUTSIDE of any database transaction!
        String aiResponse = null;
        if (!apiKey.isBlank()) {
            try {
                aiResponse = callGeminiForMention(prompt);
            } catch (Exception e) {
                log.error("Lỗi khi gọi Gemini AI cho @NexSpace AI mention: {}", e.getMessage());
            }
        }

        if (aiResponse == null || aiResponse.isBlank()) {
            aiResponse = buildFallbackMentionResponse(isCustomer, wsName, bkCode, organizerName, userMessage);
        }

        aiResponse = sanitizeAiResponse(aiResponse, wsName);
        aiResponse = cleanHtmlTags(aiResponse);

        // Persist AI response and broadcast in a quick transaction
        saveAiMessageAndBroadcast(conversationId, isCustomer, aiResponse);
    }

    @Transactional
    public void saveAiMessageAndBroadcast(Long conversationId, boolean isCustomer, String aiResponse) {
        BookingConversationModel conversation = conversationRepository.findByIdWithDetails(conversationId)
                .orElse(null);
        if (conversation == null) {
            return;
        }

        UserModel customer = conversation.getCustomer();
        UserModel organizer = conversation.getOrganizer();
        UserModel aiUser = getOrCreateAiUser();

        BookingChatMessageModel aiMessage = new BookingChatMessageModel();
        aiMessage.setConversation(conversation);
        aiMessage.setSender(aiUser != null ? aiUser : (isCustomer ? organizer : customer));
        aiMessage.setMessageType("AI_ASSISTANT");
        aiMessage.setContent(aiResponse.trim());
        aiMessage.setRead(false);
        BookingChatMessageModel savedAiMessage = messageRepository.save(aiMessage);

        String preview = "NexSpace AI: " + (aiResponse.length() > 180 ? aiResponse.substring(0, 177) + "..." : aiResponse);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setLastMessagePreview(preview);
        conversationRepository.save(conversation);

        // Realtime WebSocket broadcast
        if (messagingTemplate != null) {
            try {
                BookingChatMessageResponseDTO dto = BookingChatMapper.toDto(savedAiMessage);
                messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, dto);
                if (customer != null) {
                    messagingTemplate.convertAndSend("/topic/users/" + customer.getId() + "/conversations",
                            BookingChatMapper.toDto(conversation, customer.getId()));
                }
                if (organizer != null) {
                    messagingTemplate.convertAndSend("/topic/users/" + organizer.getId() + "/conversations",
                            BookingChatMapper.toDto(conversation, organizer.getId()));
                }
            } catch (Exception e) {
                log.error("Lỗi broadcast WebSocket STOMP cho NexSpace AI: {}", e.getMessage());
            }
        }
    }

    @Transactional
    public UserModel getOrCreateAiUser() {
        if (userRepository == null) {
            return null;
        }
        return userRepository.findByUserNameIgnoreCase("nexspace.ai")
                .orElseGet(() -> {
                    try {
                        UserModel bot = new UserModel();
                        bot.setUserName("nexspace.ai");
                        bot.setEmail("ai@nexspace.vn");
                        bot.setPassword(passwordEncoder != null ? passwordEncoder.encode("NexSpaceAI#Bot2026") : "NexSpaceAI#Bot2026");
                        bot.setFirstName("NexSpace");
                        bot.setLastName("AI");
                        bot.setStatus(UserStatus.ACTIVE);
                        if (roleRepository != null) {
                            roleRepository.findById(1L).ifPresent(bot::setRoleEntity);
                        }
                        bot.setAvatar("https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=128&q=80");
                        bot.setVerified(true);
                        return userRepository.save(bot);
                    } catch (Exception e) {
                        log.warn("Không thể tạo mới bot nexspace.ai, tái sử dụng query: {}", e.getMessage());
                        return userRepository.findByUserNameIgnoreCase("nexspace.ai").orElse(null);
                    }
                });
    }

    private String sanitizeAiResponse(String response, String workspaceName) {
        if (response == null) return "";
        String text = response.trim();
        if (text.startsWith("NexSpace AI:") || text.startsWith("NexSpace AI :")) {
            text = text.substring(text.indexOf(':') + 1).trim();
        }
        text = text.replace("không gian của chúng tôi", "không gian " + workspaceName);
        text = text.replace("không gian của chúng em", "không gian " + workspaceName);
        text = text.replace("không gian của bên mình", "không gian " + workspaceName);
        text = text.replace("tại cơ sở của chúng tôi", "tại " + workspaceName);
        text = text.replace("của chúng tôi", "tại đây");
        text = text.replace("bên em xin gửi", "thông tin gửi bạn");
        return text;
    }

    private String cleanHtmlTags(String text) {
        if (text == null) return "";
        // Convert <code>password</code> -> 'password'
        String cleaned = text.replaceAll("(?i)<code[^>]*>(.*?)</code>", "'$1'");
        cleaned = cleaned.replaceAll("(?i)<pre[^>]*>(.*?)</pre>", "$1");
        cleaned = cleaned.replaceAll("(?i)<b[^>]*>(.*?)</b>", "$1");
        cleaned = cleaned.replaceAll("(?i)<strong[^>]*>(.*?)</strong>", "$1");
        cleaned = cleaned.replaceAll("(?i)<i[^>]*>(.*?)</i>", "$1");
        cleaned = cleaned.replaceAll("(?i)<em[^>]*>(.*?)</em>", "$1");
        cleaned = cleaned.replaceAll("<[^>]+>", "");
        return cleaned.trim();
    }

    private String sanitizeCustomerTone(String adjusted, String originalText) {
        if (adjusted == null) return originalText;
        String text = adjusted.trim();
        // Nếu LLM vô tình đóng vai Chủ không gian hoặc Platform để gửi mật khẩu hay chào đón khách
        if (text.contains("xin gửi bạn mật khẩu") || text.contains("chúc bạn có một trải nghiệm") || text.contains("Chào mừng bạn đến với") || text.contains("cho chúng mình biết")) {
            if (originalText.toLowerCase().contains("wifi") || originalText.toLowerCase().contains("wi-fi")) {
                return "Dạ em chào anh/chị, cho em hỏi mật khẩu Wi-Fi tại không gian là gì vậy ạ? Em cảm ơn anh/chị!";
            }
            if (originalText.toLowerCase().contains("check-in") || originalText.toLowerCase().contains("nhận chỗ") || originalText.toLowerCase().contains("mã pin")) {
                return "Dạ em chào anh/chị, cho em hỏi thủ tục check-in nhận chỗ như thế nào ạ?";
            }
            return "Dạ em chào anh/chị, " + originalText + " ạ. Em cảm ơn anh/chị!";
        }
        return text;
    }

    private boolean isOffTopicQuery(String userMessage) {
        if (userMessage == null) return false;
        String clean = userMessage.toLowerCase().replace("@nexspace ai", "").trim();
        if (clean.isBlank()) return false;

        // 1. Phép tính số học hoặc biểu thức toán học (ví dụ: 1+1, 2 + 2 = ?, 5 * 10, 1+1 bằng mấy, tính nhẩm...)
        if (clean.matches(".*\\b\\d+\\s*[\\+\\-\\*/x×÷=]\\s*\\d+.*")) {
            boolean isLegitContext = clean.contains("giờ") || clean.contains("tiếng") || clean.contains("phút")
                    || clean.contains("ngày") || clean.contains("tháng") || clean.contains("năm")
                    || clean.contains("k") || clean.contains("vnd") || clean.contains("đ") || clean.contains("đồng")
                    || clean.contains("người") || clean.contains("bàn") || clean.contains("ghế") || clean.contains("phòng");
            if (!isLegitContext) {
                return true;
            }
        }
        if (clean.matches("^[0-9\\s\\+\\-\\*/=x×÷?bằng mấy bao nhiêu]+$")) {
            return true;
        }

        // 2. Các câu hỏi toán học phổ biến bằng chữ
        if (clean.contains("1+1") || clean.contains("1 + 1") || clean.contains("2+2") || clean.contains("2 + 2")
                || (clean.contains("cộng") && clean.contains("bằng"))
                || (clean.contains("nhân") && clean.contains("bằng"))
                || (clean.contains("chia") && clean.contains("bằng"))
                || (clean.contains("trừ") && clean.contains("bằng"))) {
            return true;
        }

        // 3. Đố vui, thơ ca, kể chuyện, lập trình ngoài phạm vi
        if (clean.contains("kể chuyện cười") || clean.contains("làm thơ") || clean.contains("đọc thơ")
                || clean.contains("viết code") || clean.contains("viết chương trình") || clean.contains("giải đố")) {
            return true;
        }

        return false;
    }

    private String buildOffTopicRefusal(boolean isCustomer, String wsName, String bkCode) {
        if (isCustomer) {
            return String.format(
                    "Dạ em là NexSpace AI - trợ lý ảo hỗ trợ không gian làm việc và đơn đặt chỗ. Em chỉ có thể hỗ trợ các thông tin liên quan đến không gian %s, đơn đặt chỗ #%s hoặc tiện ích tại đây thôi ạ. Nếu bạn cần hỗ trợ thông tin gì về buổi làm việc, bạn cứ nhắn em nhé!",
                    wsName, bkCode
            );
        } else {
            return String.format(
                    "Dạ em là NexSpace AI - trợ lý ảo hỗ trợ không gian làm việc. Em chỉ có thể hỗ trợ các thông tin liên quan đến đơn đặt chỗ #%s, tiện ích không gian hoặc tóm tắt trao đổi giữa hai bên thôi ạ. Anh/chị cần em hỗ trợ gì về đơn đặt chỗ này cứ nhắn em nhé ạ!",
                    bkCode
            );
        }
    }

    private String buildMentionPrompt(
            String wsName, String wsAddress, String wsDesc, String bkCode,
            String resourceName, String resourceType, String startTime, String endTime,
            UserModel customer, UserModel organizer, boolean isCustomer,
            String senderName, String organizerName, String chatHistory, String userMessage
    ) {
        return String.format("""
            Bạn là NexSpace AI - Trợ lý ảo độc lập của nền tảng đặt chỗ làm việc NexSpace.
            Bạn tham gia như một trợ lý nền tảng khách quan trong phòng chat giữa Khách hàng và Chủ không gian (Organizer / Host).

            THÔNG TIN KHÔNG GIAN LÀM VIỆC:
            - Tên: %s
            - Địa chỉ: %s
            - Mô tả / Tiện ích / Mật khẩu wifi / Quy định: %s

            THÔNG TIN ĐƠN ĐẶT CHỖ:
            - Mã đơn: #%s
            - Vị trí/Bàn làm việc: %s (%s)
            - Thời gian sử dụng: %s đến %s
            - Khách hàng (Customer): %s
            - Chủ không gian (Organizer / Quản lý): %s

            LỊCH SỬ TIN NHẮN TRONG PHÒNG CHAT:
            %s

            NGƯỜI VỪA TAG @NexSpace AI: %s (Vai trò: %s)
            NỘI DUNG YÊU CẦU: "%s"

            CÁC NGUYÊN TẮC BẮT BUỘC CHO NEXSPACE AI (TUÂN THỦ 100%%):
            1. VAI TRÒ ĐỘC LẬP - BẠN LÀ TRỢ LÝ NỀN TẢNG (NEXSPACE AI):
               - Tuyệt đối BẠN KHÔNG PHẢI LÀ CHỦ NHÀ / HOST.
               - NGHIÊM CẤM dùng các từ sở hữu như: "không gian của chúng tôi", "không gian của mình", "của chúng em", "bên mình gửi bạn", "đến với chúng tôi".
               - BẮT BUỘC dùng: "tại không gian %s", "tại %s", "ở không gian này", "tại đây".
               - Tự xưng là "NexSpace AI" hoặc "em", xưng hô với Khách hàng là "bạn", với Chủ không gian là "anh/chị %s".
            2. QUY ĐỊNH NGHIÊM NGẶT VỀ PHẠM VI HỖ TRỢ (TUYỆT ĐỐI KHÔNG TRẢ LỜI CÂU HỎI NGOÀI LUỒNG):
               - BẠN CHỈ ĐƯỢC PHÉP TRẢ LỜI CÁC CÂU HỎI VỀ:
                 + Không gian làm việc %s: địa chỉ, đường đi, chỗ gửi xe, tiện ích, mật khẩu wifi, giờ hoạt động, cách check-in mã PIN, thiết bị phòng họp.
                 + Chi tiết đơn đặt chỗ #%s, vị trí %s, khung giờ sử dụng.
                 + Tóm tắt / tổng hợp nội dung cuộc trò chuyện giữa Khách hàng và Chủ không gian trong phòng chat.
               - TUYỆT ĐỐI TỪ CHỐI TẤT CẢ CÂU HỎI NGOÀI LUỒNG (Off-topic), bao gồm:
                 + Phép tính toán học (ví dụ: '1+1 bằng mấy', tính toán cộng trừ nhân chia), giải toán, câu đố.
                 + Lập trình máy tính, viết mã code, phân tích kỹ thuật ngoài luồng.
                 + Kiến thức xã hội tổng quát, bách khoa toàn thư, lịch sử, văn học, chính trị, tôn giáo, thời tiết nơi khác.
                 + Trò chuyện phiếm, làm thơ, kể chuyện cười, tư vấn tình cảm hoặc cuộc sống...
               - KHI GẶP CÂU HỎI NGOÀI LUỒNG (ví dụ như '1+1 bằng mấy'):
                 + BẮT BUỘC TỪ CHỐI LỊCH SỰ, TUYỆT ĐỐI KHÔNG TÍNH TOÁN HOẶC TRẢ LỜI CÂU HỎI ĐÓ.
                 + Mẫu câu từ chối chuẩn mực:
                   * Nếu người hỏi là Khách hàng:
                     "Dạ em là NexSpace AI - trợ lý ảo hỗ trợ không gian làm việc và đơn đặt chỗ. Em chỉ có thể hỗ trợ các thông tin liên quan đến không gian %s, đơn đặt chỗ #%s hoặc tiện ích tại đây thôi ạ. Nếu bạn cần hỗ trợ thông tin gì về buổi làm việc, bạn cứ nhắn em nhé!"
                   * Nếu người hỏi là Chủ không gian:
                     "Dạ em là NexSpace AI - trợ lý ảo hỗ trợ không gian làm việc. Em chỉ có thể hỗ trợ các thông tin liên quan đến đơn đặt chỗ #%s, tiện ích không gian hoặc tóm tắt trao đổi giữa hai bên thôi ạ. Anh/chị cần em hỗ trợ gì về đơn đặt chỗ này cứ nhắn em nhé ạ!"
            3. NẾU NGƯỜI HỎI LÀ KHÁCH HÀNG:
               - Giải đáp nhanh, chính xác các thông tin thực tế về không gian (wifi, địa chỉ, đường đi, check-in, tiện ích).
               - NGUYÊN TẮC NHƯỜNG QUYỀN CHO CHỦ KHÔNG GIAN: Nếu khách hỏi những vấn đề cần thỏa thuận hoặc ngoài dữ liệu (ví dụ: xin giảm giá, đòi hoàn tiền/hủy phòng ngoại lệ, khiếu nại sự cố, xin đổi phòng), BẠN TUYỆT ĐỐI KHÔNG TỰ QUYẾT. Hãy trả lời chuẩn mực:
                 "Dạ vấn đề này ngoài phạm vi thông tin tự động của em, em xin phép chuyển tiếp cho anh/chị %s (Chủ không gian) hỗ trợ giải quyết trực tiếp cho bạn nhé! Anh/chị chủ không gian sẽ sớm phản hồi ạ."
            4. NẾU NGƯỜI HỎI LÀ CHỦ KHÔNG GIAN (ORGANIZER):
               - Nếu yêu cầu "tổng hợp", "tóm tắt" đoạn chat: Hãy tóm tắt súc tích các ý khách đã hỏi, thỏa thuận đã đạt được và các việc chủ không gian cần lưu ý thực hiện tiếp theo.
               - Trợ giúp chủ không gian các thông tin về đơn đặt chỗ hoặc tiện ích của không gian.
            5. PHONG CÁCH:
               - Ngắn gọn (2-4 câu), tự nhiên, nhã nhặn, chuyên nghiệp. Không mở đầu bằng "NexSpace AI:".
            """,
                wsName, wsAddress, wsDesc, bkCode, resourceName, resourceType, startTime, endTime,
                customer != null ? customer.getFullName() : "Khách Hàng", organizerName, chatHistory,
                senderName, isCustomer ? "Khách hàng" : "Chủ không gian", userMessage,
                wsName, wsName, organizerName,
                wsName, bkCode, resourceName,
                wsName, bkCode,
                bkCode,
                organizerName
        );
    }

    private String buildFallbackMentionResponse(boolean isCustomer, String wsName, String bkCode, String organizerName, String userMessage) {
        String lower = userMessage.toLowerCase();
        if (isOffTopicQuery(userMessage)) {
            return buildOffTopicRefusal(isCustomer, wsName, bkCode);
        }
        if (isCustomer) {
            if (lower.contains("wifi")) {
                return "Mạng Wi-Fi tại không gian thường có tên theo không gian và mật khẩu được in tại quầy lễ tân hoặc khu vực bàn làm việc. Bạn vui lòng kiểm tra tại bảng hướng dẫn hoặc đợi anh/chị " + organizerName + " hỗ trợ nhé!";
            }
            if (lower.contains("check-in") || lower.contains("nhận chỗ") || lower.contains("mã pin") || lower.contains("cửa")) {
                return "Để check-in, bạn vui lòng sử dụng Smart PIN điện tử được cấp trong chi tiết đơn đặt chỗ hoặc liên hệ lễ tân khi đến nơi nhé!";
            }
            if (lower.contains("gửi xe") || lower.contains("xe máy") || lower.contains("ô tô") || lower.contains("bãi xe")) {
                return "Không gian có khu vực đỗ xe dành cho khách hàng. Khi đến nơi, bạn vui lòng làm theo hướng dẫn của bảo vệ tòa nhà nhé!";
            }
            return "Dạ câu hỏi này ngoài phạm vi thông tin tự động của em, em xin phép chuyển tiếp cho anh/chị " + organizerName + " (Chủ không gian) hỗ trợ trực tiếp bạn nhé! Chủ không gian sẽ sớm phản hồi bạn ạ.";
        } else {
            // Organizer
            if (lower.contains("tổng hợp") || lower.contains("tóm tắt")) {
                return "Dạ em đã ghi nhận yêu cầu tổng hợp đoạn chat. Vui lòng kiểm tra lại lịch sử trao đổi của khách hàng ở khung chat phía trên hoặc thử lại sau ít phút để em tổng hợp chi tiết nhé ạ!";
            }
            return buildOffTopicRefusal(false, wsName, bkCode);
        }
    }

    private String extractJsonArray(String rawText) {
        int start = rawText.indexOf('[');
        int end = rawText.lastIndexOf(']');
        if (start != -1 && end != -1 && end > start) {
            return rawText.substring(start, end + 1);
        }
        return rawText;
    }

    private BookingConversationModel getAndValidateConversation(Long conversationId, Long callerId) {
        BookingConversationModel conversation = conversationRepository.findByIdWithDetails(conversationId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cuộc hội thoại hỗ trợ"));

        boolean isOrganizer = conversation.getOrganizer() != null && conversation.getOrganizer().getId().equals(callerId);
        boolean isCustomer = conversation.getCustomer() != null && conversation.getCustomer().getId().equals(callerId);

        if (!isOrganizer && !isCustomer) {
            throw new NotFoundException("Không tìm thấy cuộc hội thoại hỗ trợ");
        }

        return conversation;
    }
}
