package base.api.feature.chatbot.service;

import base.api.feature.chatbot.dto.response.ChatbotResponseDto;
import base.api.feature.chatbot.service.NexBotContextGrounder.BookingSnapshot;
import base.api.feature.chatbot.service.NexBotContextGrounder.GroundingSnapshot;
import base.api.feature.chatbot.service.NexBotContextGrounder.MatchedResourceOption;
import base.api.feature.chatbot.service.NexBotContextGrounder.RuntimeSettings;
import base.api.feature.chatbot.service.NexBotContextGrounder.UserSnapshot;
import base.api.feature.chatbot.service.NexBotContextGrounder.WorkspaceSnapshot;
import base.api.feature.chatbot.service.NexBotQueryParser.ParsedQuery;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Locale;

/**
 * Deterministic, DB-grounded responder used whenever Gemini is unconfigured or unavailable.
 * Shares the same live snapshot, multi-filter parser, and verified link catalog so responses never drift.
 */
public final class NexBotFallbackResponder {

    private static final DateTimeFormatter TIME_FMT = DateTimeFormatter.ofPattern("HH:mm dd/MM/yyyy");

    private NexBotFallbackResponder() {}

    public static ChatbotResponseDto respond(String query, GroundingSnapshot snapshot, String roleHint) {
        String lower = query == null ? "" : query.toLowerCase(Locale.ROOT).trim();
        RuntimeSettings s = snapshot.settings();
        ParsedQuery pq = snapshot.parsedQuery();
        String reply;

        if (matchesAny(lower, "đơn của tôi", "đơn đặt chỗ của tôi", "trạng thái đơn", "lượt giữ", "hạn mức giữ", "bị khóa đặt", "vé của tôi", "qr của tôi", "hồ sơ của tôi")) {
            reply = buildPersonalContextReply(snapshot);
        } else if (matchesAny(lower, "hủy", "hoàn tiền", "cancel", "refund", "đổi lịch")) {
            reply = buildCancellationReply(snapshot);
        } else if (matchesAny(lower, "payout", "rút tiền", "doanh thu", "hoa hồng", "đối soát", "số dư held")) {
            reply = buildOrganizerPayoutReply(s);
        } else if (matchesAny(lower, "organizer", "đối tác", "chủ không gian", "đăng ký đối tác", "hợp đồng", "floor plan ai", "floor ai", "onboarding")) {
            reply = buildOrganizerGuideReply(s, snapshot.user());
        } else if (matchesAny(lower, "admin", "quản trị", "kiểm duyệt", "duyệt hồ sơ", "tranh chấp", "dispute")) {
            reply = buildAdminGuideReply();
        } else if (pq != null && pq.hasMultiFilterSearchIntent() && !matchesAny(lower, "cơ chế giữ chỗ", "quy trình đặt chỗ")) {
            reply = buildMultiFilterSearchReply(snapshot);
        } else if (matchesAny(lower, "giữ chỗ", "hold", "tạm giữ", "hết hạn", "màu cam", "trùng chỗ", "đặt đè", "spam")) {
            reply = buildHoldReply(s, snapshot.user());
        } else if (matchesAny(lower, "thanh toán", "payos", "vietqr", "chuyển khoản", "hóa đơn", "quét qr")) {
            reply = buildPaymentReply(s);
        } else if (matchesAny(lower, "nhắn tin", "chat với chủ", "liên hệ chủ", "booking chat")) {
            reply = buildBookingChatReply();
        } else if (matchesAny(lower, "sở thích", "yêu thích", "lưu bộ lọc", "thông báo", "đánh giá", "review")) {
            reply = buildPersonalizationReply();
        } else if (matchesAny(lower, "tài khoản", "mật khẩu", "đăng nhập", "đăng ký", "google", "quên mật khẩu", "hồ sơ cá nhân")) {
            reply = buildAccountReply();
        } else if (matchesAny(lower, "giờ mở cửa", "mở cửa", "mấy giờ", "qua đêm", "24/7", "ngày lễ", "nghỉ lễ", "bảo trì")) {
            reply = buildOperatingHoursReply(snapshot);
        } else if (matchesAny(lower, "giá", "chi phí", "bao nhiêu", "bảng giá", "tiền", "vat", "phụ thu", "add-on", "addon", "tiện ích trả phí")) {
            reply = buildPricingReply(snapshot);
        } else if (matchesAny(lower, "tiện ích", "wifi", "máy in", "máy chiếu", "cà phê", "nước uống", "đỗ xe", "ghế")) {
            reply = buildAmenitiesReply(snapshot);
        } else if (matchesAny(lower, "gần tôi", "gần nhất", "ở đâu", "địa chỉ", "vị trí", "quận", "đà nẵng", "hà nội", "hồ chí minh", "bản đồ", "tìm", "coworking", "workspace", "không gian")) {
            reply = buildWorkspaceSearchReply(snapshot);
        } else if (matchesAny(lower, "đặt chỗ", "đặt bàn", "thuê phòng", "check-in", "checkin", "booking", "mã đặt chỗ", "quy trình")) {
            reply = buildBookingProcessReply(s);
        } else if (matchesAny(lower, "học bài", "ôn thi", "họp nhóm", "phỏng vấn", "livestream", "podcast", "sự kiện", "workshop")) {
            reply = buildUseCaseRecommendationReply(snapshot);
        } else if (matchesAny(lower, "hotline", "liên hệ", "khiếu nại", "sự cố", "gặp lỗi", "support", "giúp đỡ")) {
            reply = buildSupportReply();
        } else {
            reply = buildWelcomeReply(snapshot, roleHint);
        }

        return ChatbotResponseDto.builder()
                .reply(reply)
                .suggestedQuestions(extractSuggestions(lower, snapshot, roleHint))
                .serverTime(LocalDateTime.now())
                .isFallback(true)
                .build();
    }

    private static String buildMultiFilterSearchReply(GroundingSnapshot snapshot) {
        ParsedQuery pq = snapshot.parsedQuery();
        List<MatchedResourceOption> options = snapshot.matchedOptions();

        StringBuilder criteria = new StringBuilder();
        if (!pq.locations().isEmpty()) {
            criteria.append("Khu vực: **").append(String.join(", ", pq.locations())).append("**");
        }
        if (pq.targetHourlyPrice() != null) {
            if (!criteria.isEmpty()) criteria.append(" · ");
            criteria.append("Giá mục tiêu: **~").append(NexBotContextGrounder.formatVnd(pq.targetHourlyPrice())).append("đ/giờ**");
        } else if (pq.maxHourlyPrice() != null || pq.minHourlyPrice() != null) {
            if (!criteria.isEmpty()) criteria.append(" · ");
            criteria.append("Giá: **")
                    .append(pq.minHourlyPrice() != null ? NexBotContextGrounder.formatVnd(pq.minHourlyPrice()) : "0")
                    .append("đ – ")
                    .append(pq.maxHourlyPrice() != null ? NexBotContextGrounder.formatVnd(pq.maxHourlyPrice()) + "đ" : "không giới hạn")
                    .append("/giờ**");
        }
        if (!pq.resourceTokens().isEmpty()) {
            if (!criteria.isEmpty()) criteria.append(" · ");
            criteria.append("Ghế/Phòng: **").append(String.join(", ", pq.resourceTokens())).append("**");
        }
        if (pq.startTime() != null && pq.endTime() != null) {
            if (!criteria.isEmpty()) criteria.append(" · ");
            criteria.append("Khung giờ: **").append(pq.startTime().format(TIME_FMT))
                    .append(" → ").append(pq.endTime().format(TIME_FMT)).append("**")
                    .append(pq.timeExplicit() ? "" : " *(khung gợi ý gần nhất)*");
        }

        if (options.isEmpty()) {
            StringBuilder fallbackWs = new StringBuilder();
            for (WorkspaceSnapshot w : snapshot.workspaces().stream().limit(4).toList()) {
                fallbackWs.append(String.format("* **%s** (%s, %s) — từ %sđ/giờ 👉 [Xem chi tiết](/workspaces/%d)\n",
                        w.name(),
                        w.district() != null ? w.district() : "",
                        w.city() != null ? w.city() : "",
                        w.minHourlyPrice() != null ? NexBotContextGrounder.formatVnd(w.minHourlyPrice()) : "0",
                        w.id()));
            }
            return String.format("""
                    ### 🔍 Kết Quả Tra Cứu Theo Bộ Lọc Của Bạn

                    * **Điều kiện tìm**: %s
                    * ⚠️ Chưa tìm thấy vị trí ghế/phòng nào khớp đồng thời tất cả điều kiện trên trong dữ liệu hiện hành (ví dụ khác mã ghế, khác mức giá hoặc ngoài khung giờ mở cửa).

                    %s
                    👉 Bạn có thể mở bộ lọc đầy đủ để thử đổi giờ hoặc mức giá tại [Khám phá Không gian](/workspaces).
                    """,
                    criteria.isEmpty() ? "Tìm kiếm nâng cao" : criteria.toString(),
                    fallbackWs.isEmpty() ? "" : "**Các không gian đang hoạt động gần nhất:**\n" + fallbackWs);
        }

        StringBuilder rows = new StringBuilder();
        int idx = 1;
        for (MatchedResourceOption opt : options) {
            WorkspaceSnapshot wsMeta = snapshot.workspaces().stream()
                    .filter(w -> w.id().equals(opt.workspaceId()))
                    .findFirst()
                    .orElse(null);
            String statusText = translateAvailability(opt.availabilityState(), opt.scheduleBlockReason());
            String priceDetail = opt.hourlyPrice() != null
                    ? NexBotContextGrounder.formatVnd(opt.hourlyPrice()) + "đ/giờ"
                    : "Xem trên sơ đồ";
            if (opt.estimatedFinalPrice() != null) {
                priceDetail += " (tạm tính sau VAT: **" + NexBotContextGrounder.formatVnd(opt.estimatedFinalPrice()) + "đ**)";
            }
            String addonLine = (wsMeta != null && !wsMeta.paidAddons().isEmpty())
                    ? "\n   * 🧩 Tiện ích trả phí (add-on): " + String.join(", ", wsMeta.paidAddons())
                    : "";
            rows.append(String.format(
                    "%d. **%s** — Vị trí `%s` (**%s**, %s, sức chứa %d)\n"
                            + "   * 📍 %s, %s\n"
                            + "   * 💰 Giá: %s\n"
                            + "   * 🚦 Trạng thái: %s%s%s\n"
                            + "   * 👉 [%s](%s) | [Xem không gian](/workspaces/%d)\n\n",
                    idx++,
                    opt.workspaceName(),
                    opt.resourceCode(),
                    opt.resourceName(),
                    opt.resourceCategory(),
                    opt.capacity(),
                    opt.district() != null ? opt.district() : "",
                    opt.city() != null ? opt.city() : "",
                    priceDetail,
                    statusText,
                    opt.individuallyBookable() ? "" : " *(Ghế thuộc phòng — phải đặt nguyên phòng)*",
                    addonLine,
                    "AVAILABLE".equals(opt.availabilityState()) || "ACTIVE".equals(opt.availabilityState())
                            ? "Chọn vị trí này & Đặt ngay"
                            : "Xem sơ đồ & chọn giờ khác",
                    opt.directSeatUrl(),
                    opt.workspaceId()
            ));
        }

        return String.format("""
                ### 🔍 Kết Quả Kiểm Tra Thực Tế Theo Điều Kiện Của Bạn

                * **Tiêu chí đã lọc**: %s

                %s
                💡 *Trạng thái được kiểm tra trực tiếp trên lịch hoạt động, ngày lễ, lịch bảo trì và các đơn giữ chỗ/đặt chỗ đang hiệu lực.*
                """, criteria.isEmpty() ? "Theo yêu cầu của bạn" : criteria.toString(), rows.toString().trim());
    }

    private static String translateAvailability(String state, String reason) {
        if (state == null) return "Đang kiểm tra";
        return switch (state) {
            case "AVAILABLE" -> "✅ **AVAILABLE (Đang trống — đặt được ngay)**";
            case "ACTIVE" -> "✅ **Đang hoạt động** *(hãy chọn ngày/giờ để kiểm tra trống theo slot)*";
            case "LOCKED" -> "🟠 **Đang được giữ chỗ tạm thời (LOCKED)**";
            case "BOOKED" -> "🔴 **Đã có người đặt (BOOKED)**";
            case "MAINTENANCE" -> "🛠️ **Đang bảo trì (MAINTENANCE)**";
            case "CLOSED_OR_HOLIDAY" -> "⏰ **Đóng cửa / Nghỉ lễ**" + (reason != null ? " (" + reason + ")" : "");
            case "ROOM_CHILD_ONLY" -> "🚪 **Ghế thuộc phòng kín (cần đặt nguyên phòng)**";
            default -> state;
        };
    }

    private static String buildPersonalContextReply(GroundingSnapshot snapshot) {
        UserSnapshot user = snapshot.user();
        if (user == null) {
            return """
                    ### 🔐 Tra Cứu Thông Tin Tài Khoản & Đơn Đặt Chỗ

                    Bạn hiện đang truy cập với tư cách **Khách chưa đăng nhập**.
                    Để NexBot kiểm tra đơn đặt chỗ, hạn giữ chỗ hoặc trạng thái hồ sơ Organizer của riêng bạn:
                    1. Đăng nhập tài khoản 👉 [Đăng nhập ngay](/auth/sign-in).
                    2. Sau khi đăng nhập, bạn có thể xem toàn bộ vé và mã QR tại 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings) hoặc hỏi lại tôi ngay tại đây!
                    """;
        }

        StringBuilder sb = new StringBuilder();
        sb.append(String.format("### 👤 Thông Tin Của Bạn (%s)\n\n", user.displayName()));
        sb.append(String.format("* **Lượt giữ chỗ đang hoạt động**: **%d / %d** vị trí.\n",
                user.activeHoldCount(), user.maxActiveHolds()));
        sb.append(String.format("* **Không gian yêu thích**: **%d** địa điểm.\n", user.favoriteCount()));
        if (user.preferenceSummary() != null) {
            sb.append(String.format("* **Sở thích cá nhân**: %s 👉 [Cập nhật sở thích](/dashboard/preferences)\n",
                    user.preferenceSummary()));
        }
        if (user.bookingSuspendedUntil() != null && user.bookingSuspendedUntil().isAfter(LocalDateTime.now())) {
            sb.append(String.format("* ⚠️ **Cảnh báo tạm khóa giữ/đặt chỗ**: Đến **%s** do vượt ngưỡng giữ/hủy không thanh toán.\n",
                    user.bookingSuspendedUntil().format(TIME_FMT)));
        }
        if (user.organizerApplicationStatus() != null) {
            sb.append(String.format("* **Hồ sơ Đối tác Organizer**: `%s` 👉 [Quản lý hồ sơ & Hợp đồng](/dashboard/organizer/application)\n",
                    user.organizerApplicationStatus()));
        }

        if (user.recentBookings().isEmpty()) {
            sb.append("\nBạn chưa có đơn đặt chỗ nào gần đây. Bắt đầu tìm chỗ ngay 👉 [Khám phá Không gian](/workspaces).");
        } else {
            sb.append("\n**Các đơn đặt chỗ gần nhất:**\n");
            for (BookingSnapshot b : user.recentBookings()) {
                sb.append(String.format(
                        "* **%s** (`%s`) — **%s** (%s)\n  ⏰ %s → %s | 💰 %sđ%s\n",
                        b.bookingCode(),
                        b.status(),
                        b.workspaceName(),
                        b.resourceLabel(),
                        b.startTime() != null ? b.startTime().format(TIME_FMT) : "",
                        b.endTime() != null ? b.endTime().format(TIME_FMT) : "",
                        NexBotContextGrounder.formatVnd(b.finalPrice()),
                        b.holdExpiresAt() != null && "PENDING_PAYMENT".equals(b.status())
                                ? " | Hết hạn giữ: **" + b.holdExpiresAt().format(TIME_FMT) + "**"
                                : ""
                ));
            }
            sb.append("\n👉 Xem chi tiết vé QR, thanh toán tiếp hoặc hủy đơn: [Đơn đặt chỗ của tôi](/workspaces/my-bookings)");
        }
        return sb.toString();
    }

    private static String buildPersonalizationReply() {
        return """
                ### ⭐ Sở Thích, Yêu Thích, Bộ Lọc Đã Lưu & Đánh Giá

                * **Cài đặt sở thích gợi ý thông minh**: Chọn quận mong muốn, ngân sách, loại chỗ (`DESK` / `ROOM`), độ yên tĩnh (`QUIET` / `MODERATE` / `LIVELY`) và mục đích sử dụng tại 👉 [Sở thích cá nhân](/dashboard/preferences).
                * **Không gian yêu thích & Bộ lọc đã lưu**: Nhấn thả tim hoặc lưu tổ hợp bộ lọc ngay trên trang 👉 [Khám phá Không gian](/workspaces) để mở lại chỉ với 1 lần bấm.
                * **Đánh giá không gian**: Sau khi đơn chuyển sang `COMPLETED`, bạn có thể viết đánh giá sao và nhận xét trong mục 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings) hoặc xem tổng hợp đánh giá trên trang chi tiết không gian.
                * **Trung tâm thông báo**: Theo dõi mọi biến động đơn đặt, nhắc hạn giữ chỗ và kết quả hoàn tiền tại 👉 [Thông báo](/dashboard/notifications).
                """;
    }

    private static String buildWorkspaceSearchReply(GroundingSnapshot snapshot) {
        List<WorkspaceSnapshot> list = snapshot.workspaces();
        if (list.isEmpty()) {
            return """
                    ### 📍 Tìm Kiếm Không Gian Làm Việc NexSpace

                    Hiện tại hệ thống chưa ghi nhận không gian nào phù hợp trong ngữ cảnh truy vấn nhanh.
                    Bạn hãy mở trang khám phá để xem danh sách cập nhật mới nhất và tìm theo vị trí GPS của mình:
                    1. Mở danh sách không gian 👉 [Nhấn vào đây](/workspaces).
                    2. Chọn thành phố/quận, loại chỗ (`DESK` / `ROOM`), khoảng giá hoặc bấm biểu tượng **Định vị GPS** trên thanh tìm kiếm.
                    """;
        }

        StringBuilder wsList = new StringBuilder();
        int idx = 1;
        for (WorkspaceSnapshot w : list) {
            String priceText = w.minHourlyPrice() != null
                    ? "Từ **" + NexBotContextGrounder.formatVnd(w.minHourlyPrice()) + "đ/giờ**"
                    : "Xem giá chi tiết trên sơ đồ";
            if (w.minDailyPrice() != null) {
                priceText += " | Ngày từ **" + NexBotContextGrounder.formatVnd(w.minDailyPrice()) + "đ**";
            }
            wsList.append(String.format(
                    "%d. **%s** 👉 [Xem chi tiết](/workspaces/%d) | [Chọn chỗ ngay](/workspaces/seats?workspaceId=%d)\n"
                            + "   * 📌 **Địa chỉ**: %s%s\n"
                            + "   * 💰 **Giá tham khảo**: %s (%d vị trí hoạt động)\n",
                    idx++,
                    w.name(),
                    w.id(),
                    w.id(),
                    w.address() != null ? w.address() : "",
                    w.city() != null && !w.city().isBlank() ? ", " + w.city() : "",
                    priceText,
                    w.activeResourceCount()
            ));
            if (!w.paidAddons().isEmpty()) {
                wsList.append("   * 🧩 **Tiện ích trả phí (add-on)**: ").append(String.join(", ", w.paidAddons())).append("\n");
            }
            wsList.append("\n");
        }

        return String.format("""
                ### 📍 Các Không Gian Đang Hoạt Động Trên NexSpace

                %s
                💡 **Mẹo tìm kiếm chính xác cả ngày giờ & ghế trống:** Bạn có thể hỏi trực tiếp ví dụ *"Đà Nẵng giá 10.000đ ngày mai 9h-11h ghế số 1 còn trống không"* hoặc mở 👉 [Khám phá Không gian](/workspaces).
                """, wsList.toString().trim());
    }

    private static String buildPricingReply(GroundingSnapshot snapshot) {
        RuntimeSettings s = snapshot.settings();
        StringBuilder dynamicPrices = new StringBuilder();
        for (WorkspaceSnapshot w : snapshot.workspaces().stream().limit(5).toList()) {
            String price = w.minHourlyPrice() != null
                    ? NexBotContextGrounder.formatVnd(w.minHourlyPrice())
                    + (w.maxHourlyPrice() != null && !w.maxHourlyPrice().equals(w.minHourlyPrice())
                    ? " – " + NexBotContextGrounder.formatVnd(w.maxHourlyPrice()) : "") + "đ/giờ"
                    : "Xem trên sơ đồ";
            dynamicPrices.append(String.format("* **%s**: %s 👉 [Xem bảng giá](/workspaces/%d)\n", w.name(), price, w.id()));
            if (!w.paidAddons().isEmpty()) {
                dynamicPrices.append("  + Tiện ích add-on: ").append(String.join(", ", w.paidAddons())).append("\n");
            }
        }
        String vatText = s.vatPercent().stripTrailingZeros().toPlainString();

        return String.format("""
                ### 💰 Cơ Chế Tính Giá Minh Bạch Tại NexSpace

                %s
                **Công thức tổng thanh toán (tính chuẩn trên server):**
                * `Tổng tiền = Tiền thuê cơ bản + Phụ thu (nếu có) + Tiện ích bổ sung (add-on) - Giảm giá + VAT (%s%%)`
                * **Loại hình giá hỗ trợ**: `HOURLY` (theo giờ) và `DAILY` (theo ngày). Chưa hỗ trợ đặt gói tháng trực tuyến (`MONTHLY`).
                * **Phí dịch vụ khách hàng**: **0đ** (NexSpace miễn phí hoàn toàn phí nền tảng cho người đặt chỗ).
                * **Tiện ích bổ sung trả phí**: Nếu không gian có tiện ích tính phí theo giờ, bạn chọn trực tiếp tại bước xác nhận đơn 👉 [Trang xác nhận đơn](/workspaces/review).
                """, dynamicPrices.isEmpty() ? "* Xem giá từng ghế/phòng trực tiếp tại trang không gian 👉 [Khám phá Không gian](/workspaces).\n" : dynamicPrices.toString(), vatText);
    }

    private static String buildAmenitiesReply(GroundingSnapshot snapshot) {
        StringBuilder sb = new StringBuilder("### ☕ Tiện Ích Tại Các Không Gian NexSpace\n\n");
        boolean hasAny = false;
        for (WorkspaceSnapshot w : snapshot.workspaces().stream().limit(4).toList()) {
            if (!w.freeAmenities().isEmpty() || !w.paidAddons().isEmpty()) {
                hasAny = true;
                sb.append(String.format("**%s** 👉 [Xem chi tiết](/workspaces/%d)\n", w.name(), w.id()));
                if (!w.freeAmenities().isEmpty()) {
                    sb.append("* ✅ **Tiện ích đi kèm**: ").append(String.join(", ", w.freeAmenities())).append("\n");
                }
                if (!w.paidAddons().isEmpty()) {
                    sb.append("* 🧩 **Tiện ích tính phí thêm (add-on)**: ").append(String.join(", ", w.paidAddons())).append("\n");
                }
                sb.append("\n");
            }
        }
        if (!hasAny) {
            sb.append("Mỗi không gian trên NexSpace hiển thị đầy đủ danh sách tiện ích miễn phí và add-on trả phí ngay trên trang chi tiết. Bạn có thể lọc theo tiện ích mong muốn tại 👉 [Khám phá Không gian](/workspaces).");
        } else {
            sb.append("👉 Bạn có thể lọc nhanh theo tiện ích mong muốn tại [Khám phá Không gian](/workspaces).");
        }
        return sb.toString().trim();
    }

    private static String buildOperatingHoursReply(GroundingSnapshot snapshot) {
        StringBuilder sb = new StringBuilder("### ⏰ Giờ Mở Cửa & Lịch Nghỉ / Bảo Trì\n\n");
        for (WorkspaceSnapshot w : snapshot.workspaces().stream().limit(4).toList()) {
            sb.append(String.format("* **%s**: %s 👉 [Xem chi tiết](/workspaces/%d)\n",
                    w.name(), w.operatingHoursSummary(), w.id()));
        }
        sb.append("\n**Lưu ý quan trọng khi chọn giờ:**\n");
        sb.append("* Khoảng đặt chỗ (tối thiểu **30 phút**) phải nằm liên tục trong khung giờ mở cửa theo múi giờ `Asia/Ho_Chi_Minh` (hỗ trợ cả ca qua đêm `closes_next_day` hoặc 24/24).\n");
        sb.append("* Hệ thống tự động kiểm tra 6 dịp nghỉ lễ Việt Nam (Tết Dương lịch, Tết Nguyên đán, Giỗ Tổ, 30/4, 1/5, 2/9) và lịch bảo trì không gian.\n");
        return sb.toString();
    }

    private static String buildBookingProcessReply(RuntimeSettings s) {
        return String.format("""
                ### 🎯 Quy Trình Đặt Chỗ Tại NexSpace (6 Bước Tức Thì)

                100%% không gian trên NexSpace áp dụng **xác nhận tức thì (INSTANT)** ngay khi thanh toán thành công:

                1. **Khám phá & lọc không gian**: Vào trang 👉 [Khám phá Không gian](/workspaces), tìm theo quận/thành phố, mức giá, tiện ích hoặc GPS gần bạn.
                2. **Chọn ngày & khung giờ**: Mở chi tiết một không gian (`/workspaces/{id}`), chọn ngày và giờ bắt đầu – kết thúc (tối thiểu **30 phút**, đặt trước tối đa **%d ngày**).
                3. **Chọn vị trí trên sơ đồ thời gian thực**: Vào sơ đồ mặt bằng (`/workspaces/seats?workspaceId=...`) với trạng thái cập nhật realtime. *(Lưu ý: ghế con nằm trong phòng kín không đặt lẻ mà đặt theo nguyên phòng; phòng họp có đệm dọn 15 phút).*
                4. **Giữ chỗ tạm thời (%d phút)**: Hệ thống tự động khóa vị trí cho bạn trong **%d phút** để chống đặt trùng.
                5. **Kiểm tra giá, chọn add-on & thanh toán PayOS**: Ở bước 👉 [Xác nhận đơn](/workspaces/review), chọn thêm tiện ích trả phí (nếu có) và quét mã **VietQR qua PayOS** (0đ phí dịch vụ khách, cộng %s%% VAT).
                6. **Nhận vé QR & Check-in**: Sau khi đối soát tự động hoàn tất tại 👉 [Xác nhận vé](/workspaces/confirmation), quản lý vé và chat với chủ không gian tại 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings).
                """,
                s.maxAdvanceDays(),
                s.holdTtlMinutes(),
                s.holdTtlMinutes(),
                s.vatPercent().stripTrailingZeros().toPlainString());
    }

    private static String buildHoldReply(RuntimeSettings s, UserSnapshot user) {
        String personalLine = user != null
                ? String.format("\n* 👤 **Tình trạng hiện tại của bạn**: Đang giữ **%d / %d** vị trí.", user.activeHoldCount(), user.maxActiveHolds())
                : "";
        return String.format("""
                ### ⏱️ Cơ Chế Giữ Chỗ Tạm Thời & Chống Spam Hold

                * **Thời gian giữ chỗ**: **%d phút** kể từ lúc tạo đơn chờ thanh toán (trần tối đa **%d phút** để chống giữ chỗ xoay vòng).
                * **Giới hạn đồng thời**: Mỗi tài khoản được giữ tối đa **%d vị trí** cùng lúc.
                * **Tái sử dụng phiên (Idempotent Reuse)**: Nếu bạn thao tác lại trên đúng vị trí đang giữ còn hạn, hệ thống giữ nguyên phiên hiện tại.
                * **Thời gian chờ tái giữ**: Sau khi hủy hoặc hết hạn giữ chỗ, cần chờ **%d giây** để giữ lại chính vị trí đó.
                * **Quy tắc chống spam hold**: Nếu giữ/hủy mà không thanh toán quá **%d lần** trong **2 giờ**, tài khoản sẽ bị tạm khóa quyền đặt/giữ chỗ trong **%d phút**. Sau khi thanh toán thành công 1 đơn hoặc hết hạn phạt, bộ đếm được reset về 0.%s

                👉 Kiểm tra các đơn đang giữ hoặc thanh toán tiếp tại [Đơn đặt chỗ của tôi](/workspaces/my-bookings).
                """,
                s.holdTtlMinutes(),
                s.maxHoldLifetimeMinutes(),
                s.maxActiveHolds(),
                s.reholdCooldownSeconds(),
                s.spamThreshold(),
                s.spamBlockMinutes(),
                personalLine);
    }

    private static String buildPaymentReply(RuntimeSettings s) {
        return String.format("""
                ### 💳 Hướng Dẫn Thanh Toán PayOS & VietQR

                1. Tại bước 👉 [Xác nhận & Thanh toán](/workspaces/review), kiểm tra chi tiết tiền thuê, phụ thu, tiện ích bổ sung (nếu có) và **VAT %s%%** (**0đ** phí dịch vụ khách hàng).
                2. Bấm thanh toán để hệ thống tạo giao dịch **PayOS** kèm mã **VietQR động** đúng số tiền đơn.
                3. Mở ứng dụng ngân hàng bất kỳ quét mã VietQR — hệ thống tự động đối soát webhook, chuyển đơn sang `CONFIRMED`, xuất vé điện tử tại 👉 [Trang xác nhận](/workspaces/confirmation) và gửi hóa đơn PDF về email.
                4. Nếu cần xem lại giao dịch hoặc hóa đơn, truy cập 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings).
                """, s.vatPercent().stripTrailingZeros().toPlainString());
    }

    private static String buildCancellationReply(GroundingSnapshot snapshot) {
        String wsPolicyHint = snapshot.workspaces().isEmpty()
                ? "Trước >= 24h hoàn 100%, >= 2h hoàn 50%, < 2h hoàn 0% (mặc định hệ thống)."
                : snapshot.workspaces().get(0).name() + ": " + snapshot.workspaces().get(0).cancellationSummary() + ".";
        return String.format("""
                ### 🔄 Hướng Dẫn Hủy Đơn & Chính Sách Hoàn Tiền

                1. Truy cập 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings), chọn đơn muốn hủy và nhấn **Hủy đặt chỗ** để xem trước số tiền hoàn dự kiến.
                2. **Quy tắc tính hoàn tiền**:
                   * Đơn `PENDING_PAYMENT` (chưa thanh toán): hủy và giải phóng chỗ ngay, không phát sinh hoàn tiền.
                   * Đơn `CONFIRMED`: áp dụng **chính sách đã chốt tại thời điểm đặt** (mẫu: %s). Nếu Organizer hoặc Admin hủy -> hoàn **100%%**.
                   * Không hủy được qua luồng tự động khi đơn đã `CHECKED_IN`, `COMPLETED`, `CANCELLED`, `EXPIRED` hoặc `NO_SHOW`.
                3. **Nhận tiền hoàn**: Nếu số tiền hoàn `> 0đ`, nhập đầy đủ **Tên ngân hàng, mã BIN, Số tài khoản, Tên chủ tài khoản (IN HOA)** để Admin duyệt chuyển khoản qua PayOS Payout.
                """, wsPolicyHint);
    }

    private static String buildBookingChatReply() {
        return """
                ### 💬 Nhắn Tin Hỗ Trợ Với Chủ Không Gian (Booking Chat)

                * **Điều kiện mở chat**: Cuộc hội thoại giữa bạn và Organizer tự động mở khóa khi đơn đặt chỗ ở trạng thái `CONFIRMED`, `CHECKED_IN` hoặc `COMPLETED`.
                * **Cách truy cập**:
                  1. Vào 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings) và nhấn nút nhắn tin trên đơn đã xác nhận, hoặc
                  2. Mở trung tâm trò chuyện 👉 [Tin nhắn hỗ trợ](/dashboard/chat).
                * Hệ thống hỗ trợ gửi tin thời gian thực (WebSocket), tự động lọc từ ngữ không phù hợp và có trợ lý AI gợi ý câu trả lời/chỉnh văn phong.
                """;
    }

    private static String buildAccountReply() {
        return """
                ### 🔐 Tài Khoản, Đăng Nhập & Đổi Mật Khẩu

                * **Đăng nhập (Email/Username hoặc Google)**: 👉 [Trang đăng nhập](/auth/sign-in)
                * **Đăng ký tài khoản mới**: 👉 [Trang đăng ký](/auth/sign-up)
                * **Quên mật khẩu**: 👉 [Khôi phục mật khẩu](/reset-password)
                * **Cập nhật hồ sơ & Đổi mật khẩu**: Vào 👉 [Hồ sơ cá nhân & Cài đặt](/dashboard/settings) (hoặc 👉 [Trang hồ sơ](/dashboard/profile))
                * **Cài đặt sở thích gợi ý không gian**: 👉 [Sở thích cá nhân](/dashboard/preferences)
                * **Xem thông báo hệ thống**: 👉 [Thông báo](/dashboard/notifications)
                """;
    }

    private static String buildOrganizerGuideReply(RuntimeSettings s, UserSnapshot user) {
        String statusLine = (user != null && user.organizerApplicationStatus() != null)
                ? String.format("\n* 📌 **Trạng thái hồ sơ hiện tại của bạn**: `%s` 👉 [Quản lý hồ sơ](/dashboard/organizer/application)\n", user.organizerApplicationStatus())
                : "";
        return String.format("""
                ### 🤝 Hướng Dẫn Trở Thành & Vận Hành Đối Tác Organizer

                %s1. **Đăng ký & Nộp hồ sơ đối tác**: Điền thông tin doanh nghiệp, mã số thuế, giấy phép kinh doanh và tài khoản ngân hàng (được mã hóa bảo mật) tại 👉 [Đăng ký Organizer](/organizer/apply) (xem tiến độ tại 👉 [Trạng thái hồ sơ](/organizer/status)).
                2. **Ký hợp đồng điện tử (OTP + SHA-256)**: Sau khi Admin phê duyệt, vào 👉 [Quản lý hồ sơ & Hợp đồng](/dashboard/organizer/application) để nhập mã OTP xác thực và tải bản PDF hợp đồng.
                3. **Tạo không gian & Vẽ sơ đồ với AI**:
                   * Tạo & quản lý vòng đời không gian (`DRAFT` -> `PENDING_REVIEW` -> `ACTIVE`) tại 👉 [Không gian của tôi](/dashboard/organizer/workspaces).
                   * Thiết kế mặt bằng 2D/3D nhanh bằng **Floor Plan AI Studio** tại 👉 [Sơ đồ mặt bằng](/dashboard/organizer/floorplan) và cấu hình chỗ ngồi/phòng tại 👉 [Chỗ ngồi & Phòng](/dashboard/organizer/resources).
                4. **Cấu hình giá, tiện ích & bảo trì**: Thiết lập tiện ích/add-on tại 👉 [Tiện ích](/dashboard/organizer/amenities), phụ thu giờ cao điểm/lễ tại 👉 [Ma trận giá](/dashboard/organizer/pricing), lịch khóa bảo trì tại 👉 [Lịch bảo trì](/dashboard/organizer/blockout).
                5. **Quản lý đơn & Doanh thu**: Theo dõi đơn tại 👉 [Đơn đặt chỗ](/dashboard/organizer/bookings), lịch Gantt tại 👉 [Lịch Gantt](/dashboard/organizer/schedule), và rút doanh thu (hoa hồng nền tảng %s%%) tại 👉 [Doanh thu & Payout](/dashboard/organizer/payouts).
                """, statusLine, s.commissionPercent().stripTrailingZeros().toPlainString());
    }

    private static String buildOrganizerPayoutReply(RuntimeSettings s) {
        return String.format("""
                ### 💼 Doanh Thu, Hoa Hồng & Rút Tiền Đối Tác (Payouts)

                * **Hoa hồng nền tảng**: Hiện hành **%s%%** (tính trên doanh thu cơ bản + phụ thu + tiện ích).
                * **Phân loại số dư tại 👉 [Doanh thu & Payout](/dashboard/organizer/payouts)**:
                  + `HELD`: Khoản tiền đang tạm giữ chờ hết thời hạn đối soát hoặc chờ xử lý yêu cầu hoàn tiền của khách.
                  + `RELEASED` (Khả dụng): Số tiền có thể rút ngay về tài khoản ngân hàng đã xác minh.
                * **Hai chế độ rút tiền**:
                  1. **Rút thủ công (Manual)**: Rút từ số dư khả dụng (tối thiểu **1.000đ**) ngay trên trang Payout.
                  2. **Rút tự động hàng ngày (Auto Payout)**: Gửi yêu cầu để Admin phê duyệt bật chế độ tự động chuyển khoản định kỳ.
                """, s.commissionPercent().stripTrailingZeros().toPlainString());
    }

    private static String buildAdminGuideReply() {
        return """
                ### 🛡️ Trung Tâm Quản Trị Hệ Thống NexSpace (Admin)

                Các đường dẫn nghiệp vụ dành cho tài khoản `ADMIN`:
                * 📊 **Tổng quan & Phân tích**: [Overview](/dashboard/overview) | [Platform Analytics](/dashboard/admin/analytics)
                * 📝 **Duyệt đối tác & Kiểm duyệt không gian**: [Hàng chờ hồ sơ Organizer](/dashboard/admin/organizers/queue) | [Danh sách đối tác](/dashboard/admin/organizer-partners) | [Kiểm duyệt Workspace](/dashboard/admin/workspaces/directory)
                * 💳 **Tài chính, Đối soát & Hoàn tiền**: [Sổ đơn đặt](/dashboard/admin/bookings) | [Đối soát PayOS](/dashboard/admin/reconciliation) | [Duyệt hoàn tiền](/dashboard/admin/refunds) | [Chi trả đối tác](/dashboard/admin/payouts) | [Cấu hình hoa hồng](/dashboard/admin/commissions/rules)
                * ⚖️ **Giám sát & Tranh chấp**: [Tranh chấp](/dashboard/admin/disputes) | [Báo cáo](/dashboard/admin/reports) | [Người dùng](/dashboard/admin/users)
                """;
    }

    private static String buildUseCaseRecommendationReply(GroundingSnapshot snapshot) {
        StringBuilder sb = new StringBuilder("""
                ### 🎯 Gợi Ý Chọn Loại Chỗ Theo Nhu Cầu

                * 📖 **Học bài, ôn thi, làm việc tập trung cá nhân**: Chọn `DESK` (Focus Desk / Hot Desk) khu `QUIET` để tối ưu chi phí theo giờ/ngày.
                * 🗣️ **Họp nhóm, phỏng vấn, workshop nhỏ**: Chọn `ROOM` (Meeting Room / Private Office) đặt nguyên phòng để đảm bảo cách âm và đủ sức chứa.
                * 🎙️ **Podcast / Studio / Không gian sáng tạo**: Lọc loại hình `CREATIVE_STUDIO` trên trang khám phá.

                """);
        if (!snapshot.workspaces().isEmpty()) {
            sb.append("**Một số không gian đang hoạt động bạn có thể xem ngay:**\n");
            for (WorkspaceSnapshot w : snapshot.workspaces().stream().limit(3).toList()) {
                sb.append(String.format("* **%s** (%s) 👉 [Xem không gian](/workspaces/%d)\n",
                        w.name(), w.category(), w.id()));
            }
        }
        sb.append("\n👉 Lọc theo nhu cầu chi tiết tại [Khám phá Không gian](/workspaces).");
        return sb.toString();
    }

    private static String buildSupportReply() {
        return """
                ### 📞 Kênh Hỗ Trợ Chính Thức NexSpace

                * ☎️ **Hotline hỗ trợ**: **1900 6868**
                * 📧 **Email**: **support@nexspace.vn**
                * 💬 **Nhắn tin trực tiếp cho Chủ không gian** (với đơn đã `CONFIRMED` / `CHECKED_IN` / `COMPLETED`): Vào 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings) hoặc 👉 [Tin nhắn hỗ trợ](/dashboard/chat).
                * 🔄 **Yêu cầu hủy đơn / hoàn tiền**: Thao tác trực tiếp tại 👉 [Đơn đặt chỗ của tôi](/workspaces/my-bookings).
                * ℹ️ **Điều khoản & Bảo mật**: [Điều khoản sử dụng](/terms-of-service) | [Chính sách bảo mật](/privacy-policy)
                """;
    }

    private static String buildWelcomeReply(GroundingSnapshot snapshot, String roleHint) {
        RuntimeSettings s = snapshot.settings();
        String effectiveRole = snapshot.user() != null ? snapshot.user().role() : roleHint;
        if ("ORGANIZER".equalsIgnoreCase(effectiveRole)) {
            return """
                    👋 **Xin chào Đối tác! Tôi là NexBot – Trợ lý AI của NexSpace.**

                    Tôi có thể hướng dẫn nhanh và tra cứu mọi quy trình vận hành cho bạn:
                    * 🏢 **Quản lý không gian & Floor Plan AI Studio** 👉 [Không gian của tôi](/dashboard/organizer/workspaces)
                    * 💰 **Bảng giá, Tiện ích add-on & Lịch bảo trì** 👉 [Ma trận giá](/dashboard/organizer/pricing)
                    * 💳 **Số dư HELD / Khả dụng & Rút tiền Payout** 👉 [Doanh thu & Payout](/dashboard/organizer/payouts)
                    * 📄 **Hợp đồng điện tử & Hồ sơ đối tác** 👉 [Hồ sơ & Hợp đồng](/dashboard/organizer/application)

                    Bạn cần hỗ trợ thao tác ở mục nào?
                    """;
        }
        if ("ADMIN".equalsIgnoreCase(effectiveRole)) {
            return """
                    👋 **Xin chào Quản trị viên! Tôi là NexBot – Trợ lý AI của NexSpace.**

                    Tôi hỗ trợ tra cứu quy trình kiểm duyệt, đối soát và điều hướng nhanh:
                    * 📝 **Duyệt hồ sơ & Workspace** 👉 [Hàng chờ Organizer](/dashboard/admin/organizers/queue)
                    * 💳 **Hoàn tiền, Payout & Đối soát** 👉 [Duyệt hoàn tiền](/dashboard/admin/refunds)
                    * ⚖️ **Tranh chấp & Báo cáo** 👉 [Tranh chấp](/dashboard/admin/disputes)

                    Bạn muốn kiểm tra nghiệp vụ nào?
                    """;
        }
        return String.format("""
                👋 **Xin chào! Tôi là NexBot – Trợ lý AI thông minh của NexSpace.**

                Tôi có thể tra cứu trực tiếp dữ liệu thật (kể cả **lọc ghép nhiều điều kiện** như thành phố + giá + ngày giờ + mã ghế + trạng thái `available`):
                * 📍 **Tìm không gian & kiểm tra chỗ trống realtime**: Gợi ý workspace đang mở, kiểm tra ghế/phòng còn trống theo giờ 👉 [Khám phá Không gian](/workspaces).
                * ⏱️ **Giữ chỗ tạm thời (%d phút)**: Quy định chống đặt trùng, giới hạn %d giữ chỗ đồng thời và chống spam.
                * 💳 **Thanh toán PayOS & Hủy/Hoàn tiền**: Hướng dẫn quét VietQR và tra mức hoàn theo chính sách.
                * 🤝 **Trở thành Đối tác Organizer**: Quy trình nộp hồ sơ, ký hợp đồng OTP và Floor Plan AI Studio 👉 [Đăng ký Organizer](/organizer/apply).

                Hãy nhập câu hỏi (ví dụ: *"Đà Nẵng giá 10.000đ ngày mai 9h-11h ghế số 1 có available không?"*) hoặc chọn gợi ý bên dưới nhé!
                """, s.holdTtlMinutes(), s.maxActiveHolds());
    }

    private static List<String> extractSuggestions(String lower, GroundingSnapshot snapshot, String roleHint) {
        String effectiveRole = snapshot.user() != null ? snapshot.user().role() : roleHint;
        if ("ORGANIZER".equalsIgnoreCase(effectiveRole) || matchesAny(lower, "organizer", "đối tác", "payout", "floor")) {
            return List.of(
                    "Quy trình đăng ký và ký hợp đồng Organizer như thế nào?",
                    "Số dư HELD và cách rút tiền Payout hoạt động ra sao?",
                    "Cách thiết lập giá, tiện ích add-on và Floor AI Studio?"
            );
        }
        if ("ADMIN".equalsIgnoreCase(effectiveRole) || matchesAny(lower, "admin", "kiểm duyệt", "tranh chấp")) {
            return List.of(
                    "Quy trình duyệt hồ sơ Organizer và Workspace ở đâu?",
                    "Cách xử lý hoàn tiền PayOS Payout và đối soát?",
                    "Các mức giữ chỗ và phạt spam hold hiện hành?"
            );
        }
        if (matchesAny(lower, "giá", "chi phí", "thanh toán", "payos")) {
            return List.of(
                    "Tìm không gian tại Đà Nẵng giá 10.000đ ngày mai 9h-11h có ghế trống không?",
                    "Chính sách hủy đơn và hoàn tiền như thế nào?",
                    "🎯 Hướng dẫn đặt chỗ theo trang hiện tại"
            );
        }
        if (matchesAny(lower, "hủy", "hoàn tiền")) {
            return List.of(
                    "Thanh toán qua PayOS VietQR hoạt động thế nào?",
                    "Cơ chế giữ chỗ tạm thời và chống spam hold là gì?",
                    "Đơn đặt chỗ hiện tại của tôi thế nào?"
            );
        }
        return List.of(
                "🎯 Hướng dẫn đặt chỗ theo trang hiện tại",
                "Tìm không gian tại Đà Nẵng giá 10.000đ ngày mai 9h-11h có ghế trống không?",
                "Quy trình đặt chỗ 6 bước tại NexSpace?",
                "Chính sách giữ chỗ tạm thời và hủy hoàn tiền?"
        );
    }

    private static boolean matchesAny(String input, String... keywords) {
        if (input == null || input.isBlank()) return false;
        for (String kw : keywords) {
            if (input.contains(kw.toLowerCase(Locale.ROOT))) {
                return true;
            }
        }
        return false;
    }
}
