package base.api.feature.auth.service.impl;

import base.api.shared.enums.UserStatus;
import org.springframework.web.util.HtmlUtils;

import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;

/**
 * HTML email đơn giản cho luồng auth. Thay bằng template engine (Thymeleaf...) khi cần.
 */
final class AuthEmailTemplates {

    private AuthEmailTemplates() {
    }

    static String verifyEmail(String name, String verifyUrl, long ttlHours) {
        return layout("Xác thực tài khoản", name,
                "<p>Cảm ơn bạn đã đăng ký. Vui lòng xác thực email để kích hoạt tài khoản.</p>",
                "Xác thực email", verifyUrl,
                "Link sẽ hết hạn sau " + ttlHours + " giờ.");
    }

    static String reverifyInactiveAccount(String name, String verifyUrl, long inactiveDays, long ttlHours) {
        return layout("Xác thực lại tài khoản không hoạt động", name,
                "<p>Tài khoản của bạn đã không đăng nhập quá <strong>" + inactiveDays
                        + " ngày</strong> và vừa được chuyển sang trạng thái tạm ngưng (<strong>INACTIVE</strong>) để bảo vệ an toàn tài khoản.</p>"
                        + "<p>Vui lòng nhấn nút bên dưới để xác thực lại email và kích hoạt lại tài khoản trước khi đăng nhập.</p>",
                "Xác thực lại email", verifyUrl,
                "Link sẽ hết hạn sau " + ttlHours + " giờ.");
    }

    static String resetPassword(String name, String resetUrl, long ttlMinutes) {
        return layout("Đặt lại mật khẩu", name,
                "<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>",
                "Đặt lại mật khẩu", resetUrl,
                "Link sẽ hết hạn sau " + ttlMinutes + " phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.");
    }

    static String passwordChanged(String name) {
        return layout("Mật khẩu đã được thay đổi", name,
                "<p>Mật khẩu tài khoản của bạn vừa được thay đổi.</p>",
                null, null,
                "Nếu không phải bạn thực hiện, hãy liên hệ quản trị viên ngay.");
    }

    static String userStatusChanged(String name, UserStatus newStatus, String reason, LocalDateTime lockedUntil) {
        return userStatusChanged(name, newStatus, reason, lockedUntil, null);
    }

    static String userStatusChanged(String name, UserStatus newStatus, String reason, LocalDateTime lockedUntil, String verifyUrl) {
        String statusLabel;
        String statusColor;
        String description;

        switch (newStatus) {
            case ACTIVE -> {
                statusLabel = "Đang hoạt động (ACTIVE)";
                statusColor = "#16a34a";
                description = "<p>Tài khoản của bạn đã được kích hoạt / mở khóa trở lại. Bạn có thể đăng nhập và tiếp tục sử dụng tất cả dịch vụ trên nền tảng NexSpace.</p>";
            }
            case LOCKED -> {
                statusLabel = "Bị khóa (LOCKED)";
                statusColor = "#dc2626";
                if (lockedUntil != null) {
                    description = "<p>Tài khoản của bạn đã bị tạm khóa đến <strong>"
                            + lockedUntil.format(DateTimeFormatter.ofPattern("HH:mm:ss dd/MM/yyyy"))
                            + " (Múi giờ Việt Nam GMT+7 / UTC+7)</strong>. Sau thời điểm này, bạn có thể thực hiện đăng nhập lại bình thường.</p>";
                } else {
                    description = "<p>Tài khoản của bạn đã bị khóa vô thời hạn bởi Ban Quản trị hệ thống NexSpace.</p>";
                }
            }
            case INACTIVE -> {
                statusLabel = "Không hoạt động (INACTIVE)";
                statusColor = "#d97706";
                description = "<p>Vì đã lâu bạn không đăng nhập vào hệ thống NexSpace, tài khoản của bạn đã được tự động chuyển sang trạng thái <strong>Không hoạt động (INACTIVE)</strong>.</p>"
                        + "<p>Để kích hoạt lại tài khoản và tiếp tục sử dụng tất cả dịch vụ trên nền tảng NexSpace, vui lòng nhấn nút <strong>\"Xác thực email và Kích hoạt tài khoản\"</strong> bên dưới. "
                        + "Sau khi xác thực thành công, tài khoản sẽ tự động chuyển sang trạng thái <strong>Đang hoạt động (ACTIVE)</strong> và đưa bạn đến trang đăng nhập.</p>";
            }
            case DELETED -> {
                statusLabel = "Đã bị xóa (DELETED)";
                statusColor = "#4b5563";
                description = "<p>Tài khoản của bạn đã bị xóa khỏi hệ thống NexSpace theo quyết định của Ban Quản trị.</p>";
            }
            default -> {
                statusLabel = newStatus != null ? newStatus.name() : "Chưa xác định";
                statusColor = "#2563eb";
                description = "<p>Trạng thái tài khoản của bạn đã được cập nhật.</p>";
            }
        }

        String reasonContent;
        if (newStatus == UserStatus.INACTIVE) {
            reasonContent = (reason != null && !reason.isBlank())
                    ? reason
                    : "Hệ thống tự động chuyển trạng thái do tài khoản không phát sinh hoạt động đăng nhập trong thời gian dài.";
        } else {
            reasonContent = (reason != null && !reason.isBlank())
                    ? reason
                    : "Theo quyết định điều hành từ Ban Quản trị hệ thống NexSpace";
        }
        String reasonHtml = "<div style='margin:18px 0;padding:14px 18px;background-color:#f9fafb;border-left:4px solid " + statusColor + ";border-radius:6px;'>"
                + "<p style='margin:0 0 6px 0;font-weight:600;color:#111827;'>Lý do thay đổi trạng thái:</p>"
                + "<p style='margin:0;color:#374151;'>" + HtmlUtils.htmlEscape(reasonContent) + "</p>"
                + "</div>";

        String securityNotice = "<div style='margin:20px 0;padding:12px 16px;background-color:#fef2f2;border:1px solid #fee2e2;border-radius:6px;color:#991b1b;font-size:13px;'>"
                + "<strong>Lưu ý bảo mật:</strong> Để đảm bảo an toàn cho tài khoản và hệ thống, toàn bộ phiên đăng nhập hiện tại trên tất cả thiết bị của bạn đã được hệ thống tự động thu hồi và đăng xuất ngay lập tức."
                + "</div>";

        String bodyHtml = "<p>Chúng tôi xin thông báo trạng thái tài khoản của bạn trên NexSpace đã được cập nhật sang: "
                + "<span style='display:inline-block;padding:3px 10px;border-radius:4px;font-weight:bold;color:#ffffff;background-color:" + statusColor + ";'>"
                + statusLabel + "</span></p>"
                + description
                + reasonHtml
                + securityNotice;

        String buttonText = (newStatus == UserStatus.INACTIVE && verifyUrl != null)
                ? "Xác thực email và Kích hoạt tài khoản"
                : null;
        String buttonUrl = (newStatus == UserStatus.INACTIVE) ? verifyUrl : null;
        String note = (newStatus == UserStatus.INACTIVE && verifyUrl != null)
                ? "Liên kết xác thực email có hiệu lực trong 24 giờ. Sau khi nhấn nút xác thực, tài khoản của bạn sẽ tự động chuyển sang trạng thái Đang hoạt động (ACTIVE) và tự động chuyển hướng tới trang đăng nhập."
                : "Nếu bạn có bất kỳ thắc mắc hoặc cần giải đáp khiếu nại, vui lòng phản hồi email này hoặc liên hệ bộ phận Chăm sóc Khách hàng NexSpace.";

        return layout("Thông báo cập nhật trạng thái tài khoản", name, bodyHtml,
                buttonText, buttonUrl, note);
    }

    private static String layout(String title, String name, String bodyHtml,
                                 String buttonText, String buttonUrl, String note) {
        String button = buttonUrl == null ? "" :
                "<p style='text-align:center;margin:28px 0'>"
                        + "<a href='" + HtmlUtils.htmlEscape(buttonUrl) + "' target='_self' style='background:#2563eb;color:#fff;"
                        + "padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600'>"
                        + buttonText + "</a></p>";
        return "<html><body style='font-family:Arial,sans-serif;line-height:1.6;color:#333'>"
                + "<div style='max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px'>"
                + "<h2 style='margin-top:0'>" + title + "</h2>"
                + "<p>Xin chào <strong>" + HtmlUtils.htmlEscape(name) + "</strong>,</p>"
                + bodyHtml
                + button
                + "<p style='color:#6b7280;font-size:13px'>" + note + "</p>"
                + "</div></body></html>";
    }
}
