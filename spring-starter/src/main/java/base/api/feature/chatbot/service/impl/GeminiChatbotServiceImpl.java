package base.api.feature.chatbot.service.impl;

import base.api.feature.chatbot.dto.request.ChatMessageItemDto;
import base.api.feature.chatbot.dto.request.ChatbotRequestDto;
import base.api.feature.chatbot.dto.response.ChatbotResponseDto;
import base.api.feature.chatbot.service.IChatbotService;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
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
import java.util.*;

@Slf4j
@Service
public class GeminiChatbotServiceImpl implements IChatbotService {

    private static final String GEMINI_API_URL_TEMPLATE = "https://generativelanguage.googleapis.com/v1beta/models/%s:generateContent";
    private static final Duration REQUEST_TIMEOUT = Duration.ofSeconds(15);

    private static final String BASE_SYSTEM_INSTRUCTION = """
            Bạn là NexBot – Trợ lý ảo AI thông minh, thân thiện và tận tâm của nền tảng NexSpace.
            NexSpace là hệ sinh thái chia sẻ và đặt chỗ không gian làm việc số 1 (Coworking Space, Bàn linh hoạt Focus Desk, Phòng họp Meeting Room, Phòng riêng Private Office).

            BỘ TRI THỨC VÀ QUY TẮC CỐT LÕI CỦA NEXSPACE:
            1. Các loại tài nguyên:
               - Focus Desk (Bàn làm việc cá nhân): Không gian yên tĩnh, ổ cắm riêng, wifi tốc độ cao (từ 25.000đ - 50.000đ/giờ).
               - Meeting Room (Phòng họp): Sức chứa 4-20 người, trang bị màn hình chiếu/TV, bảng viết, cách âm tốt (từ 150.000đ - 350.000đ/giờ).
               - Private Office (Văn phòng riêng): Đầy đủ tiện ích cho doanh nghiệp vừa và nhỏ (theo tháng).

            2. Quy trình đặt chỗ của Khách hàng (6 bước chuẩn):
               - Bước 1: Khám phá không gian qua bản đồ hoặc tìm kiếm theo quận/tiện ích/mức giá.
               - Bước 2: Chọn loại tài nguyên và khung giờ sử dụng.
               - Bước 3: Xem sơ đồ mặt bằng và trạng thái ghế/phòng trống thời gian thực (Xanh = Trống, Cam = Đang giữ chỗ, Đỏ = Đã đặt).
               - Bước 4: Chọn vị trí ngồi -> Hệ thống tự động kích hoạt phiên Giữ chỗ tạm thời (Temporary Hold) trong 10 phút để bảo vệ bạn khỏi bị người khác đặt trùng (Double Booking). Mỗi tài khoản được giữ tối đa 3 vị trí đồng thời.
               - Bước 5: Kiểm tra bảng tính giá minh bạch, tiến hành thanh toán bảo mật qua cổng PayOS (hỗ trợ chuyển khoản ngân hàng VietQR tức thì).
               - Bước 6: Nhận Mã đặt chỗ duy nhất (dạng BK-YYYYMMDD-XXXX) và xuất trình khi check-in tại quầy hoặc trên ứng dụng.

            3. Hướng dẫn dành cho Đối tác (Organizer):
               - Đăng ký tài khoản và hoàn tất hồ sơ Organizer Onboarding (thông tin pháp lý, số tài khoản ngân hàng bảo mật, ký kết hợp đồng điện tử trực tuyến).
               - Quản lý không gian, tạo sơ đồ mặt bằng trực quan với công cụ thông minh Floor Plan AI Studio.
               - Quản lý tài sản (bàn, ghế, máy chiếu) và theo dõi nhật ký bảo trì định kỳ.

            4. Hướng dẫn dành cho Quản trị viên (Admin):
               - Phê duyệt hồ sơ đối tác, kiểm duyệt chất lượng không gian (Pending -> Active).
               - Giám sát luồng tiền, đối soát hoa hồng và xử lý khiếu nại (Disputes/Refunds).

            5. Nguyên tắc phản hồi:
               - Sử dụng tiếng Việt chuẩn mực, lịch sự, tích cực và súc tích.
               - Trình bày câu trả lời rõ ràng với định dạng Markdown (tiêu đề, gạch đầu dòng, in đậm các bước quan trọng).
               - Nếu người dùng hỏi điều gì chưa rõ hoặc nằm ngoài phạm vi NexSpace, hãy lịch sự hướng dẫn họ liên hệ bộ phận hỗ trợ khách hàng.
            """;

    private final ObjectMapper mapper;
    private final HttpClient httpClient;
    private final String apiKey;
    private final String primaryModel;
    private final IWorkspaceRepository workspaceRepository;

    @Autowired
    public GeminiChatbotServiceImpl(
            ObjectMapper mapper,
            @Value("${nexspace.chatbot.gemini-api-key:}") String chatbotApiKey,
            @Value("${nexspace.floor-ai.gemini-api-key:}") String floorApiKey,
            @Value("${nexspace.chatbot.model:gemini-3.5-flash-lite}") String primaryModel,
            @Autowired(required = false) IWorkspaceRepository workspaceRepository
    ) {
        this(
                mapper,
                HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build(),
                resolveChatbotApiKey(chatbotApiKey),
                primaryModel,
                workspaceRepository
        );
    }

    private static String resolveChatbotApiKey(String chatbotApiKey) {
        if (chatbotApiKey != null && !chatbotApiKey.isBlank()) {
            return chatbotApiKey.trim();
        }
        // Không dùng chung key với floor-ai để bảo vệ quota và token riêng biệt theo cấu hình người dùng
        return "";
    }

    public GeminiChatbotServiceImpl(
            ObjectMapper mapper,
            HttpClient httpClient,
            String apiKey,
            String primaryModel
    ) {
        this(mapper, httpClient, apiKey, primaryModel, null);
    }

    public GeminiChatbotServiceImpl(
            ObjectMapper mapper,
            HttpClient httpClient,
            String apiKey,
            String primaryModel,
            IWorkspaceRepository workspaceRepository
    ) {
        this.mapper = mapper;
        this.httpClient = httpClient;
        this.apiKey = (apiKey == null) ? "" : apiKey.trim();
        this.primaryModel = (primaryModel == null || primaryModel.isBlank()) ? "gemini-3.5-flash-lite" : primaryModel.trim();
        this.workspaceRepository = workspaceRepository;
    }

    @Override
    public ChatbotResponseDto chat(Long actorId, ChatbotRequestDto request) {
        String userQuery = (request.getMessage() != null) ? request.getMessage().trim() : "";

        // 1. Thử gọi Google Gemini API nếu có API Key hợp lệ
        if (isGeminiApiKeyValid(apiKey)) {
            try {
                ChatbotResponseDto response = callGeminiApi(userQuery, request.getHistory(), primaryModel);
                if (response != null && response.getReply() != null && !response.getReply().isBlank()) {
                    return response;
                }
            } catch (Exception e) {
                log.warn("Gemini Chatbot API call failed for query '{}': {}. Falling back to smart FAQ knowledge base.",
                        userQuery, e.getMessage());
            }
        }

        // 2. Fail-Safe Defense: Sử dụng bộ tri thức phản hồi thông minh nội bộ đa dạng
        return generateDiverseResponse(userQuery);
    }

    private boolean isGeminiApiKeyValid(String key) {
        return key != null && !key.isBlank() && key.trim().length() >= 20;
    }

    private ChatbotResponseDto callGeminiApi(String userQuery, List<ChatMessageItemDto> history, String modelName) throws Exception {
        String url = String.format(GEMINI_API_URL_TEMPLATE, modelName);

        ObjectNode rootNode = mapper.createObjectNode();

        // System Instruction kèm danh sách không gian thực tế
        String dynamicSystemInstruction = buildSystemInstructionWithWorkspaces();
        ObjectNode systemInstructionNode = rootNode.putObject("systemInstruction");
        ArrayNode systemParts = systemInstructionNode.putArray("parts");
        systemParts.addObject().put("text", dynamicSystemInstruction);

        // Contents (History + Current query)
        ArrayNode contentsNode = rootNode.putArray("contents");

        if (history != null && !history.isEmpty()) {
            int startIdx = Math.max(0, history.size() - 6);
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

        // Current User Message
        ObjectNode currentMessageNode = contentsNode.addObject();
        currentMessageNode.put("role", "user");
        currentMessageNode.putArray("parts").addObject().put("text", userQuery);

        // Generation Config
        ObjectNode genConfig = rootNode.putObject("generationConfig");
        genConfig.put("maxOutputTokens", 1500);
        genConfig.put("temperature", 0.7);

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

            StringBuilder textBuilder = new StringBuilder();
            if (parts.isArray()) {
                for (JsonNode part : parts) {
                    if (!part.path("thought").asBoolean(false) && part.has("text")) {
                        textBuilder.append(part.path("text").asText());
                    }
                }
            }

            String aiReply = textBuilder.toString().trim();
            if (!aiReply.isEmpty()) {
                return ChatbotResponseDto.builder()
                        .reply(aiReply)
                        .suggestedQuestions(extractSmartSuggestions(userQuery))
                        .serverTime(LocalDateTime.now())
                        .isFallback(false)
                        .build();
            }
        } else {
            log.warn("Gemini API returned status {}: {}", httpResponse.statusCode(), httpResponse.body());
        }

        return null;
    }

    private String buildSystemInstructionWithWorkspaces() {
        StringBuilder sb = new StringBuilder(BASE_SYSTEM_INSTRUCTION);
        List<WorkspaceModel> workspaces = getActiveWorkspacesSafe();
        if (!workspaces.isEmpty()) {
            sb.append("\nDANH SÁCH CÁC KHÔNG GIAN LÀM VIỆC THỰC TẾ TRÊN NEXSPACE:\n");
            for (WorkspaceModel w : workspaces) {
                sb.append(String.format("- ID %d: %s | Địa chỉ: %s, %s, %s | Loại hình: %s\n",
                        w.getId(),
                        w.getName(),
                        w.getAddress(),
                        w.getDistrict() != null ? w.getDistrict() : "",
                        w.getCity() != null ? w.getCity() : "",
                        w.getCategory() != null ? w.getCategory().name() : "COWORKING_HUB"
                ));
            }
        }
        return sb.toString();
    }

    private List<WorkspaceModel> getActiveWorkspacesSafe() {
        if (workspaceRepository == null) return Collections.emptyList();
        try {
            List<WorkspaceModel> featured = workspaceRepository.findFeaturedWorkspaces(WorkspaceStatus.ACTIVE);
            if (featured != null && !featured.isEmpty()) {
                return featured.stream().limit(6).toList();
            }
            return workspaceRepository.findAll().stream()
                    .filter(w -> w.getStatus() == WorkspaceStatus.ACTIVE)
                    .limit(6)
                    .toList();
        } catch (Exception e) {
            log.warn("Could not query active workspaces for chatbot: {}", e.getMessage());
            return Collections.emptyList();
        }
    }

    /**
     * Bộ phản hồi tri thức chuyên sâu đa dạng theo ngữ cảnh (Smart Multi-Domain Intent Grounding).
     */
    private ChatbotResponseDto generateDiverseResponse(String query) {
        String lower = query.toLowerCase(Locale.ROOT).trim();
        String reply;
        List<String> suggestions;

        // 1. TÌM KIẾM KHÔNG GIAN, VỊ TRÍ, GẦN TÔI NHẤT
        if (matchesAny(lower, "gần tôi", "gần nhất", "ở đâu", "địa chỉ", "vị trí", "quận", "đà nẵng", "sơn trà", "hải châu", "hà nội", "hồ chí minh", "bản đồ", "tìm", "coworking", "work space", "workspace")) {
            List<WorkspaceModel> workspaces = getActiveWorkspacesSafe();
            StringBuilder wsBuilder = new StringBuilder();

            if (!workspaces.isEmpty()) {
                int count = 1;
                for (WorkspaceModel w : workspaces) {
                    wsBuilder.append(String.format("%d. **%s** 👉 [Nhấn vào đây](/workspaces/%d)\n   * 📌 **Địa chỉ**: %s\n   * 🏷️ **Loại hình**: %s (Giá linh hoạt theo giờ và ngày)\n\n",
                            count++,
                            w.getName(),
                            w.getId(),
                            w.getAddress(),
                            w.getCategory() != null ? w.getCategory().name() : "Không gian làm việc chung"
                    ));
                }
            } else {
                wsBuilder.append("""
                        1. **Enouvo Space 1 - Dragon Bridge Hub** 👉 [Nhấn vào đây](/workspaces/101)
                           * 📌 **Địa chỉ**: 15 An Nhơn 3, P. An Hải Tây, Q. Sơn Trà, TP. Đà Nẵng
                           * 💰 **Giá thuê**: Từ 35.000đ/giờ (Gần cầu Rồng, wifi kép 1Gbps, ghế Herman Miller)
                        
                        2. **Enouvo Space 2 - Tran Hung Dao Riverside Hub** 👉 [Nhấn vào đây](/workspaces/102)
                           * 📌 **Địa chỉ**: 169 Trần Hưng Đạo, P. An Hải Bắc, Q. Sơn Trà, TP. Đà Nẵng
                           * 💰 **Giá thuê**: Từ 50.000đ/giờ (View sông Hàn, phòng thu podcast/livestream)
                        
                        3. **NexSpace Executive Hub Hải Châu** 👉 [Nhấn vào đây](/workspaces/1)
                           * 📌 **Địa chỉ**: Số 02 Đường 2 Tháng 9, P. Bình Hiên, Q. Hải Châu, TP. Đà Nẵng
                           * 💰 **Giá thuê**: Từ 45.000đ/giờ (Tiêu chuẩn 5 sao, quầy Specialty Espresso miễn phí)
                        """);
            }

            reply = String.format("""
                    ### 📍 Các Không Gian Làm Việc Nổi Bật Tại NexSpace

                    Dưới đây là các không gian làm việc đang hoạt động và được ưa chuộng nhất trên hệ thống:

                    %s
                    💡 **Mẹo tìm không gian gần bạn nhất:**
                    1. Truy cập trang Khám phá Không gian 👉 [Nhấn vào đây](/workspaces).
                    2. Nhấn vào biểu tượng **Định vị GPS (📍)** trên thanh tìm kiếm hoặc cho phép trình duyệt truy cập vị trí của bạn.
                    3. Hệ thống sẽ tự động đo khoảng cách theo tọa độ thực và hiển thị các không gian gần vị trí của bạn nhất lên đầu danh sách!
                    """, wsBuilder.toString().trim());

            suggestions = List.of(
                    "Bảng giá thuê bàn và phòng họp như thế nào?",
                    "Quy trình đặt chỗ tại NexSpace diễn ra ra sao?",
                    "Cơ chế giữ chỗ tạm thời 10 phút là gì?"
            );
        }
        // 2. BẢNG GIÁ, CHI PHÍ & CÁC GÓI THUÊ
        else if (matchesAny(lower, "giá", "chi phí", "bao nhiêu", "bảng giá", "tiền", "gói tháng", "theo giờ", "theo ngày", "đắt")) {
            reply = """
                    ### 💰 Bảng Giá Dịch Vụ Minh Bạch Tại NexSpace

                    NexSpace cung cấp các mức giá linh hoạt tùy theo nhu cầu làm việc của bạn:

                    * 🪑 **Focus Desk (Bàn làm việc cá nhân linh hoạt)**:
                      - **Theo giờ**: Chỉ từ **25.000đ – 50.000đ / giờ** (đã bao gồm điện, wifi 1Gbps, trà/cà phê miễn phí).
                      - **Gói ngày (Day Pass)**: Từ **120.000đ – 180.000đ / ngày**.
                      - **Gói tháng (Monthly Desk)**: Từ **1.800.000đ / tháng** (có chỗ ngồi cố định, tủ đồ cá nhân).

                    * 👥 **Meeting Room (Phòng họp hiện đại)**:
                      - Phòng nhỏ (4–6 người): **150.000đ – 220.000đ / giờ**.
                      - Phòng lớn (10–20 người): **250.000đ – 350.000đ / giờ** (trang bị TV 4K, camera hội nghị, bảng trắng).

                    * 🏢 **Private Office (Văn phòng riêng trọn gói)**:
                      - Dành cho nhóm từ 4 – 15 nhân sự: Từ **6.000.000đ / tháng** trọn gói tiện ích.

                    *(Giá cụ thể có thể hiển thị chi tiết khi bạn chọn từng vị trí trên sơ đồ mặt bằng).*
                    """;
            suggestions = List.of(
                    "Work space nào gần tôi nhất?",
                    "Thanh toán qua PayOS như thế nào?",
                    "Quy trình đặt chỗ tại NexSpace diễn ra ra sao?"
            );
        }
        // 3. TIỆN ÍCH & TRANG THIẾT BỊ
        else if (matchesAny(lower, "tiện ích", "wifi", "máy in", "máy chiếu", "cà phê", "nước uống", "đỗ xe", "gửi xe", "bảng trắng", "ghế", "công thái học", "yên tĩnh")) {
            reply = """
                    ### ☕ Tiện Ích & Cơ Sở Vật Chất Đạt Chuẩn Tại NexSpace

                    Mọi không gian trong mạng lưới NexSpace đều được trang bị đầy đủ để bạn chỉ việc mang laptop đến làm việc:

                    * 🚀 **Internet tốc độ cao**: Đường truyền cáp quang kép dự phòng 1Gbps, độ trễ cực thấp.
                    * 💺 **Nội thất công thái học**: Ghế làm việc chuẩn Ergonomic bảo vệ cột sống, bàn điều chỉnh chiều cao.
                    * ☕ **Pantry & Đồ uống**: Miễn phí trà, nước lọc và quầy cà phê Specialty Espresso tự phục vụ.
                    * 🖨️ **Văn phòng phẩm**: Máy in đa năng, scan, photocopy chất lượng cao.
                    * 🅿️ **Bãi đỗ xe an ninh**: Hầm để xe rộng rãi có bảo vệ trực 24/7.
                    * 🎙️ **Tiện ích chuyên biệt**: Một số hub có phòng thu âm podcast, livestream, booth gọi điện cách âm.
                    """;
            suggestions = List.of(
                    "Work space nào gần tôi nhất?",
                    "Quy trình đặt chỗ tại NexSpace như thế nào?",
                    "Giờ mở cửa của các không gian ra sao?"
            );
        }
        // 4. GIỜ MỞ CỬA & LÀM VIỆC 24/7
        else if (matchesAny(lower, "giờ mở cửa", "thời gian", "mở cửa", "mấy giờ", "qua đêm", "24/7", "cuối tuần", "thứ 7", "chủ nhật")) {
            reply = """
                    ### ⏰ Thời Gian Hoạt Động Của NexSpace

                    * **Khung giờ tiêu chuẩn**: Hầu hết các không gian hoạt động từ **07:30 đến 22:00** tất cả các ngày trong tuần (từ Thứ Hai đến Chủ Nhật).
                    * **Truy cập 24/7**: Dành cho khách hàng đăng ký gói **Thành viên tháng (Monthly Membership)** hoặc văn phòng riêng với quyền ra vào bằng thẻ từ thông minh hoặc mã QR ứng dụng.
                    * **Lễ tân & Hỗ trợ kỹ thuật**: Luôn có nhân viên túc trực hỗ trợ check-in và giải quyết thắc mắc từ 08:00 – 21:00 hàng ngày.
                    """;
            suggestions = List.of(
                    "Work space nào gần tôi nhất?",
                    "Bảng giá thuê bàn và phòng họp như thế nào?",
                    "Cơ chế giữ chỗ tạm thời 10 phút là gì?"
            );
        }
        // 5. ĐẶT CHỖ & QUY TRÌNH SỬ DỤNG
        else if (matchesAny(lower, "đặt chỗ", "đặt bàn", "thuê phòng", "checkin", "check-in", "booking", "mã đặt chỗ", "quy trình")) {
            reply = """
                    ### 🎯 Quy Trình Đặt Chỗ Tại NexSpace Theo Từng Bước

                    NexBot được tích hợp **Trợ lý đặt chỗ thông minh theo trang**. Bạn có thể kích hoạt tính năng này bằng cách nhấn nút **"🎯 Hướng dẫn đặt chỗ theo trang hiện tại"** hoặc biểu tượng La bàn trên thanh chat:

                    1. **Khám phá không gian**: Tìm kiếm và chọn không gian phù hợp 👉 [Nhấn vào đây](/workspaces).
                    2. **Chọn ngày & khung giờ**: Tại trang chi tiết không gian (/workspaces/:id), chọn ngày làm việc và giờ bắt đầu - kết thúc ở khung "Lịch sử dụng", sau đó nhấn "Chọn chỗ ngồi & Đặt ngay".
                    3. **Xem chỗ trống & chọn vị trí**: Tại trang chọn chỗ (/workspaces/seats), NexBot sẽ tự động liệt kê các vị trí ghế/phòng đang còn trống theo thời gian bạn chọn kèm đường link trực tiếp.
                    4. **Giữ chỗ tạm thời 10 phút**: Hệ thống tự động khóa chỗ cho bạn trong 10 phút chống đặt trùng (Double Booking).
                    5. **Thanh toán qua PayOS**: Quét mã VietQR chuyển khoản ngân hàng tức thì.
                    6. **Nhận xác nhận & Smart PIN**: Nhận mã đặt chỗ và Smart PIN để check-in mở cửa.
                    """;
            suggestions = List.of(
                    "🎯 Hướng dẫn đặt chỗ theo trang hiện tại",
                    "Cơ chế giữ chỗ tạm thời 10 phút hoạt động ra sao?",
                    "Thanh toán qua PayOS như thế nào?"
            );
        }
        // 6. GIỮ CHỖ TẠM THỜI (TEMPORARY HOLD 10 MINS)
        else if (matchesAny(lower, "giữ chỗ", "hold", "10 phút", "hết hạn", "màu cam", "trùng chỗ", "đặt đè")) {
            reply = """
                    ### ⏱️ Cơ Chế Giữ Chỗ Tạm Thời (Temporary Hold Engine)

                    * **Mục đích**: Nhằm đảm bảo tính công bằng và chống đặt trùng chỗ (Double Booking Concurrency Defense), khi bạn chọn một bàn hoặc phòng làm việc, NexSpace sẽ **tạm giữ vị trí đó cho bạn trong 10 phút**.
                    * **Quyền ưu tiên**: Trong 10 phút này, người dùng khác sẽ thấy vị trí chuyển sang màu Cam (Đang giữ chỗ) và không thể chọn đè lên bạn.
                    * **Giới hạn an toàn**: Mỗi tài khoản được giữ tối đa **3 chỗ đồng thời**.
                    * **Tự động giải phóng**: Nếu sau 10 phút bạn chưa hoàn tất thanh toán, hệ thống sẽ tự động giải phóng vị trí để nhường cơ hội cho người khác.
                    * **Tái sử dụng phiên (Idempotent Reuse)**: Nếu bạn thao tác lại trên cùng một vị trí trong thời gian hold, hệ thống sẽ tiếp tục phiên giữ chỗ hiện tại mà không làm phát sinh lỗi.
                    """;
            suggestions = List.of(
                    "Thanh toán qua PayOS như thế nào?",
                    "Làm sao để hủy đặt chỗ và hoàn tiền?",
                    "Work space nào gần tôi nhất?"
            );
        }
        // 7. THANH TOÁN & PAYOS / VIETQR
        else if (matchesAny(lower, "thanh toán", "payos", "vietqr", "chuyển khoản", "ngân hàng", "hóa đơn", "vat", "quét qr")) {
            reply = """
                    ### 💳 Hướng Dẫn Thanh Toán Qua PayOS Tại NexSpace

                    * **Cổng thanh toán chính**: NexSpace tích hợp cổng thanh toán quốc gia **PayOS**, hỗ trợ chuẩn **VietQR**.
                    * **Cách thức**: Bạn chỉ cần mở ứng dụng ngân hàng bất kỳ (Vietcombank, MB, Techcombank, VPBank...) và quét mã QR hiển thị trên màn hình.
                    * **Xác thực tự động**: Tiền được đối soát và ghi nhận thành công trong vòng vài giây, hệ thống tự động xác nhận đơn đặt chỗ mà bạn không cần chụp ảnh biên lai.
                    * **Bảo mật tuyệt đối**: Không lưu trữ thông tin thẻ ngân hàng của người dùng trên máy chủ.
                    * **Hóa đơn điện tử**: Sau khi thanh toán, hóa đơn VAT điện tử sẽ được gửi trực tiếp về email đăng ký của bạn.
                    """;
            suggestions = List.of(
                    "Nếu tôi chuyển khoản quá hạn 10 phút thì sao?",
                    "Chính sách hủy và hoàn tiền tại NexSpace?",
                    "Work space nào gần tôi nhất?"
            );
        }
        // 8. HỦY ĐẶT CHỖ & HOÀN TIỀN
        else if (matchesAny(lower, "hủy", "hoàn tiền", "cancel", "refund", "đổi giờ", "đổi lịch")) {
            reply = """
                    ### 🔄 Chính Sách Hủy Đặt Chỗ & Hoàn Tiền

                    * **Cách hủy**: Bạn vào mục Đặt chỗ của tôi 👉 [Nhấn vào đây](/workspaces/my-bookings), tìm đơn đặt chỗ muốn hủy và nhấn nút **Hủy đặt chỗ**.
                    * **Điều kiện hoàn tiền**: Tùy theo chính sách hủy của từng không gian (thông thường hủy trước giờ bắt đầu từ 2 - 24 giờ sẽ được xét duyệt hoàn tiền tự động hoặc qua ví thanh toán).
                    * **Giải phóng vị trí**: Ngay khi bạn hủy đơn, chỗ ngồi/phòng họp sẽ được mở lại ngay lập tức để người khác có thể đặt.
                    """;
            suggestions = List.of(
                    "Quy trình đặt chỗ tại NexSpace như thế nào?",
                    "Cơ chế giữ chỗ tạm thời 10 phút là gì?",
                    "Work space nào gần tôi nhất?"
            );
        }
        // 9. ĐỐI TÁC ORGANIZER & HỢP ĐỒNG
        else if (matchesAny(lower, "organizer", "đối tác", "chủ không gian", "đăng ký đối tác", "hợp đồng", "hoa hồng", "onboarding")) {
            reply = """
                    ### 🤝 Trở Thành Đối Tác Organizer Cùng NexSpace

                    Nếu bạn sở hữu Coworking Space hoặc không gian làm việc muốn tối ưu tỷ lệ lấp đầy:
                    1. **Nộp hồ sơ trực tuyến**: Đăng ký và hoàn thiện thông tin doanh nghiệp, tài liệu pháp lý và tài khoản ngân hàng nhận doanh thu.
                    2. **Ký hợp đồng điện tử**: Xem và ký kết thỏa thuận đối tác minh bạch trực tiếp trên hệ thống.
                    3. **Thiết kế sơ đồ với AI**: Sử dụng công cụ **Floor Plan AI Studio** với trợ lý Gemini giúp tạo sơ đồ mặt bằng và bài trí bàn ghế tối ưu chỉ trong vài giây.
                    4. **Bắt đầu đón khách**: Sau khi được Admin phê duyệt, không gian của bạn sẽ hiển thị công khai tới hàng ngàn khách hàng tiềm năng.
                    """;
            suggestions = List.of(
                    "Floor Plan AI Studio hoạt động ra sao?",
                    "Chính sách hoa hồng của nền tảng như thế nào?",
                    "Thời gian xét duyệt hồ sơ đối tác mất bao lâu?"
            );
        }
        // 10. GỢI Ý KHÔNG GIAN THEO NHU CẦU CỤ THỂ
        else if (matchesAny(lower, "học bài", "ôn thi", "họp nhóm", "phỏng vấn", "livestream", "podcast", "sự kiện", "workshop", "nhóm bạn")) {
            reply = """
                    ### 🎯 Gợi Ý Lựa Chọn Không Gian Theo Nhu Cầu

                    * 📖 **Học bài, ôn thi, làm việc cá nhân**:
                      - Nên chọn **Focus Desk** tại các không gian yên tĩnh như *Enouvo Space 1* hoặc *NexSpace Hải Châu*. Ghế công thái học và wifi ổn định giúp bạn tập trung 100%.

                    * 🗣️ **Họp nhóm, phỏng vấn, trao đổi công việc**:
                      - Nên chọn **Meeting Room** (sức chứa từ 4 – 10 người), cách âm tuyệt đối, có bảng viết và màn hình chiếu để thảo luận chuyên nghiệp mà không lo ảnh hưởng xung quanh.

                    * 🎙️ **Thu âm podcast, quay video, livestream**:
                      - Nên đặt phòng Media/Studio tại *Enouvo Space 2 (Trần Hưng Đạo)* với tiêu chuẩn tiêu âm chuyên nghiệp.
                    """;
            suggestions = List.of(
                    "Work space nào gần tôi nhất?",
                    "Bảng giá thuê bàn và phòng họp như thế nào?",
                    "Quy trình đặt chỗ tại NexSpace diễn ra ra sao?"
            );
        }
        // 11. HỖ TRỢ, HOTLINE & KHIẾU NẠI
        else if (matchesAny(lower, "hotline", "liên hệ", "khiếu nại", "sự cố", "gặp lỗi", "support", "admin", "gặp vấn đề", "giúp đỡ")) {
            reply = """
                    ### 📞 Kênh Hỗ Trợ Khách Hàng NexSpace

                    Chúng tôi luôn sẵn sàng hỗ trợ bạn 24/7 qua các kênh sau:
                    * ☎️ **Tổng đài Hotline**: **1900 6868** (Nhánh 1: Khách hàng, Nhánh 2: Đối tác Organizer).
                    * 📧 **Email**: **support@nexspace.vn**.
                    * 💬 **Chat trực tuyến**: Bạn có thể nhắn tin trực tiếp với NexBot tại đây bất cứ lúc nào!
                    * 🛡️ **Gửi khiếu nại chính thức**: Vào Trung tâm hỗ trợ 👉 [Nhấn vào đây](/dashboard/settings) để tạo phiếu khiếu nại (Support Ticket). Đội ngũ quản trị viên sẽ phản hồi trong vòng 15 phút.
                    """;
            suggestions = List.of(
                    "Work space nào gần tôi nhất?",
                    "Quy trình đặt chỗ tại NexSpace như thế nào?",
                    "Cơ chế giữ chỗ tạm thời 10 phút là gì?"
            );
        }
        // 12. CHÀO HỎI & GIỚI THIỆU
        else {
            reply = """
                    👋 **Xin chào bạn! Tôi là NexBot – Trợ lý ảo AI của NexSpace.**

                    Tôi có thể giải đáp chi tiết và đa dạng mọi thông tin bạn cần:
                    * 📍 **Tìm kiếm không gian**: Danh sách workspace đang mở cửa gần bạn nhất, xem địa chỉ & bản đồ.
                    * 💰 **Bảng giá dịch vụ**: Giá thuê theo giờ, gói ngày và gói tháng cho Focus Desk & Meeting Room.
                    * ⏱️ **Giữ chỗ tạm thời 10 phút**: Cơ chế giữ chỗ thông minh chống trùng lặp (Double Booking).
                    * 💳 **Thanh toán & Hủy phòng**: Hướng dẫn thanh toán qua PayOS (VietQR) và chính sách hoàn tiền.
                    * 🏢 **Dành cho Đối tác (Organizer)**: Quy trình nộp hồ sơ đối tác và công cụ thiết kế mặt bằng Floor AI Studio.

                    Hãy nhập câu hỏi bạn quan tâm hoặc chọn nhanh một trong các câu hỏi gợi ý bên dưới nhé!
                    """;
            suggestions = List.of(
                    "Work space nào gần tôi nhất?",
                    "Bảng giá thuê bàn và phòng họp như thế nào?",
                    "Quy trình đặt chỗ tại NexSpace diễn ra ra sao?",
                    "Cơ chế giữ chỗ tạm thời 10 phút là gì?"
            );
        }

        return ChatbotResponseDto.builder()
                .reply(reply)
                .suggestedQuestions(suggestions)
                .serverTime(LocalDateTime.now())
                .isFallback(true)
                .build();
    }

    private boolean matchesAny(String input, String... keywords) {
        for (String kw : keywords) {
            if (input.contains(kw.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }

    private List<String> extractSmartSuggestions(String query) {
        String lower = query.toLowerCase(Locale.ROOT);
        if (matchesAny(lower, "gần tôi", "ở đâu", "địa chỉ", "workspace", "không gian")) {
            return List.of(
                    "Bảng giá thuê bàn và phòng họp như thế nào?",
                    "Quy trình đặt chỗ tại NexSpace diễn ra ra sao?",
                    "Cơ chế giữ chỗ tạm thời 10 phút là gì?"
            );
        }
        if (matchesAny(lower, "giá", "chi phí", "bao nhiêu")) {
            return List.of(
                    "Work space nào gần tôi nhất?",
                    "Thanh toán qua PayOS như thế nào?",
                    "Quy trình đặt chỗ tại NexSpace diễn ra ra sao?"
            );
        }
        if (matchesAny(lower, "đặt", "thuê", "booking")) {
            return List.of(
                    "Giữ chỗ tạm thời 10 phút hoạt động thế nào?",
                    "Làm sao để hủy đơn và chính sách hoàn tiền?",
                    "Các hình thức thanh toán được hỗ trợ?"
            );
        }
        if (matchesAny(lower, "organizer", "đối tác")) {
            return List.of(
                    "Công cụ Floor Plan AI Studio hoạt động ra sao?",
                    "Thời gian xét duyệt hồ sơ đối tác là bao lâu?",
                    "Quy trình ký hợp đồng điện tử như thế nào?"
            );
        }
        return List.of(
                "Work space nào gần tôi nhất?",
                "Bảng giá thuê bàn và phòng họp như thế nào?",
                "Quy trình đặt chỗ tại NexSpace như thế nào?",
                "Cơ chế giữ chỗ tạm thời 10 phút là gì?"
        );
    }
}
