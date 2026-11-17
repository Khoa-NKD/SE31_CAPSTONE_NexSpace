package base.api.feature.organizer.service;

import base.api.shared.config.EmailService;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.shared.enums.OrganizerProfileStatus;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.event.TransactionPhase;
import org.springframework.transaction.event.TransactionalEventListener;
import org.springframework.web.util.HtmlUtils;
import java.net.URI;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;

/** Queues the existing asynchronous mail sender only after a review transaction commits. */
@Component
@Slf4j
public class OrganizerReviewEmailNotification {
    private final EmailService email;
    private final String clientUrl;

    public OrganizerReviewEmailNotification(EmailService email, @Value("${app.client-url}") String clientUrl) {
        this.email = email;
        this.clientUrl = clientUrl;
    }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onReview(OrganizerReviewNotification notification) {
        try {
            var content = compose(notification, clientUrl);
            email.sendHtmlEmail(notification.recipient(), content.subject(), content.html());
        } catch (RuntimeException ex) {
            // A queue/configuration failure must not turn an already-committed decision into a failed API call.
            log.error("Organizer review email could not be queued for application {} ({})",
                    notification.applicationId(), notification.status());
        }
    }

    record Content(String subject, String html) { }

    @TransactionalEventListener(phase = TransactionPhase.AFTER_COMMIT)
    public void onOperationalStatusChanged(OrganizerPartnerService.StatusChanged notification) {
        try {
            String title = notification.suspended() ? "Quyền hoạt động đối tác đã tạm ngưng"
                    : "Quyền hoạt động đối tác đã được khôi phục";
            String explanation = notification.suspended()
                    ? "Các workspace của bạn tạm ngưng nhận đặt chỗ mới. Bạn vẫn có thể đăng nhập, xem hồ sơ và xử lý các đặt chỗ đã tạo."
                    : "Bạn có thể tiếp tục quản lý workspace. Các chỗ đủ điều kiện có thể nhận đặt mới.";
            String url = clientBase(clientUrl) + "/dashboard/organizer/application";
            email.sendHtmlEmail(notification.recipient(), "[NexSpace] " + title,
                    "<h1>" + title + "</h1><p>" + explanation + "</p><p><strong>Lý do</strong></p><p>"
                            + escape(notification.reason()) + "</p><p><a href='" + escape(url)
                            + "'>Mở trang Quản lý hồ sơ đối tác</a></p>");
        } catch (RuntimeException ex) {
            log.error("Organizer operational status email could not be queued for organizer {}", notification.organizerId());
        }
    }

    static Content compose(OrganizerReviewNotification n, String configuredClientUrl) {
        String title;
        String explanation;
        String button;
        String target;
        if (n.status() == OrganizerProfileStatus.APPROVED) {
            title = "Hồ sơ Organizer đã được phê duyệt";
            explanation = "Chúc mừng! Hồ sơ doanh nghiệp của bạn đã được NexSpace phê duyệt. Tài khoản của bạn đã được cấp quyền Organizer. Bạn có thể đăng nhập để truy cập dashboard và bắt đầu quản lý không gian làm việc.";
            button = "Đăng nhập và mở Organizer Dashboard";
            target = "/dashboard/organizer/workspaces";
        } else if (n.status() == OrganizerProfileStatus.CONTRACT_PENDING) {
            title = "Hồ sơ đã đạt yêu cầu — mời xác nhận hợp đồng";
            explanation = "Giấy tờ của bạn đã được kiểm tra và chấp thuận. Vui lòng đăng nhập, đọc hợp đồng và hoàn tất bước xác nhận bằng OTP email. Tài khoản chỉ được cấp quyền Organizer sau khi hoàn thành bước này. Hợp đồng Local có nhãn thử nghiệm và không dùng cho giao dịch thực tế.";
            button = "Xem và xác nhận hợp đồng";
            target = "/organizer/apply";
        } else if (n.status() == OrganizerProfileStatus.REVISION_REQUESTED) {
            title = "Hồ sơ Organizer cần bổ sung tài liệu";
            explanation = "Quản trị viên đã kiểm tra hồ sơ và yêu cầu bạn bổ sung các tài liệu bên dưới. Hồ sơ của bạn chưa bị từ chối. Vui lòng mở trang đăng ký Organizer, thay đúng tài liệu được yêu cầu và nhấn gửi lại để tiếp tục xét duyệt.";
            button = "Mở hồ sơ để bổ sung tài liệu";
            target = "/organizer/apply";
        } else if (n.status() == OrganizerProfileStatus.REJECTED) {
            title = "Thông báo từ chối hồ sơ Organizer";
            explanation = "Sau khi xem xét, NexSpace chưa thể chấp thuận hồ sơ Organizer của bạn vì lý do bên dưới. Đây là quyết định từ chối hồ sơ; hồ sơ này không được chỉnh sửa hoặc gửi lại. Bạn vẫn có thể sử dụng tài khoản người dùng hiện tại và đăng nhập để xem kết quả.";
            button = "Xem kết quả hồ sơ";
            target = "/organizer/apply";
        } else {
            throw new IllegalArgumentException("Unsupported review notification state");
        }
        String url = clientBase(configuredClientUrl) + "/auth/sign-in?redirect="
                + URLEncoder.encode(target, StandardCharsets.UTF_8);
        StringBuilder details = new StringBuilder();
        if (n.status() == OrganizerProfileStatus.APPROVED) {
            String agreementUrl = clientBase(configuredClientUrl) + "/auth/sign-in?redirect="
                    + URLEncoder.encode("/dashboard/organizer/application", StandardCharsets.UTF_8);
            details.append("<p>Bạn có thể xem và tải bản hợp đồng kèm biên nhận xác nhận tại <a href=\"")
                    .append(escape(agreementUrl)).append("\">Quản lý hồ sơ đăng ký</a>.</p>");
        }
        if (n.feedback() != null && !n.feedback().isBlank()) {
            details.append("<div style='margin:20px 0;padding:16px;background:#f5f6fa;border-radius:10px'>")
                    .append("<strong>").append(n.status() == OrganizerProfileStatus.APPROVED ? "Ghi chú từ quản trị viên" : "Lý do từ quản trị viên")
                    .append("</strong><p style='white-space:pre-wrap;margin-bottom:0'>").append(escape(n.feedback())).append("</p></div>");
        }
        if (n.status() == OrganizerProfileStatus.REVISION_REQUESTED) {
            details.append("<h3 style='font-size:16px'>Tài liệu cần thay thế</h3><ul style='padding-left:20px'>");
            for (var document : n.documentChanges()) {
                details.append("<li style='margin-bottom:12px'><strong>").append(documentLabel(document.type()))
                        .append("</strong><div style='white-space:pre-wrap'>").append(escape(document.feedback())).append("</div></li>");
            }
            details.append("</ul><p>Các tài liệu không được yêu cầu thay thế sẽ được giữ nguyên. Sau khi hoàn tất, hãy nhấn <strong>Gửi lại hồ sơ</strong>; chỉ tải file lên chưa gửi hồ sơ để duyệt.</p>");
        }
        String html = "<!doctype html><html lang='vi'><body style='margin:0;background:#f4f5f9;font-family:Arial,sans-serif;color:#172033;line-height:1.65'>"
                + "<div style='max-width:600px;margin:24px auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:28px'>"
                + "<p style='color:#5145e8;font-size:20px;font-weight:bold;margin-top:0'>NexSpace</p><h1 style='font-size:22px'>" + title + "</h1>"
                + "<p>Xin chào <strong>" + escape(n.applicantName()) + "</strong>,</p><p>" + explanation + "</p>"
                + "<p><strong>Hồ sơ:</strong> #" + n.applicationId() + "<br><strong>Doanh nghiệp:</strong> " + escape(n.legalName()) + "</p>"
                + details + "<p style='margin:28px 0'><a href='" + escape(url) + "' style='display:inline-block;background:#5145e8;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:bold'>" + button + "</a></p>"
                + "<p style='font-size:13px;color:#637083'>Vui lòng đăng nhập bằng tài khoản đã gửi hồ sơ. Đường dẫn không tự đăng nhập và không cấp quyền truy cập cho người khác.</p>"
                + "<p style='font-size:12px;color:#637083;word-break:break-all'>Nếu nút không mở được, sao chép đường dẫn này vào trình duyệt:<br><a href='" + escape(url) + "'>" + escape(url) + "</a></p>"
                + "<hr style='border:0;border-top:1px solid #e5e7eb'><p style='font-size:12px;color:#637083'>Đây là email thông báo tự động. Kết quả và yêu cầu mới nhất được hiển thị trong hồ sơ của bạn trên NexSpace.</p></div></body></html>";
        return new Content("[NexSpace] " + title + " (#" + n.applicationId() + ")", html);
    }

    private static String clientBase(String value) {
        URI uri = URI.create(value.trim());
        if (!("https".equals(uri.getScheme()) || "http".equals(uri.getScheme())) || uri.getHost() == null
                || uri.getUserInfo() != null || uri.getRawQuery() != null || uri.getRawFragment() != null) {
            throw new IllegalArgumentException("Invalid client URL configuration");
        }
        return uri.toString().replaceAll("/+$", "");
    }

    private static String escape(String value) { return HtmlUtils.htmlEscape(value == null ? "" : value); }
    private static String documentLabel(OrganizerDocumentType type) {
        return switch (type) {
            case BUSINESS_LICENSE -> "Giấy phép kinh doanh";
            case ID_CARD_FRONT -> "CCCD / giấy tờ định danh – mặt trước";
            case ID_CARD_BACK -> "CCCD / giấy tờ định danh – mặt sau";
            case TAX_CERTIFICATE -> "Giấy chứng nhận thuế";
            case WORKSPACE_OVERVIEW -> "Hồ sơ giới thiệu workspace";
            case OTHER -> "Giấy tờ sở hữu, vận hành hoặc tài liệu khác";
            default -> "Tài liệu xác minh";
        };
    }
}
