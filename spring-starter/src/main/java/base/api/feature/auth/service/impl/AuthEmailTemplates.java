package base.api.feature.auth.service.impl;

import org.springframework.web.util.HtmlUtils;

/** HTML email đơn giản cho luồng auth. Thay bằng template engine (Thymeleaf...) khi cần. */
final class AuthEmailTemplates {

  private AuthEmailTemplates() {}

  static String verifyEmail(String name, String verifyUrl, long ttlHours) {
    return layout(
        "Xác thực tài khoản",
        name,
        "<p>Cảm ơn bạn đã đăng ký. Vui lòng xác thực email để kích hoạt tài khoản.</p>",
        "Xác thực email",
        verifyUrl,
        "Link sẽ hết hạn sau " + ttlHours + " giờ.");
  }

  static String resetPassword(String name, String resetUrl, long ttlMinutes) {
    return layout(
        "Đặt lại mật khẩu",
        name,
        "<p>Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản của bạn.</p>",
        "Đặt lại mật khẩu",
        resetUrl,
        "Link sẽ hết hạn sau "
            + ttlMinutes
            + " phút. Nếu bạn không yêu cầu, hãy bỏ qua email này.");
  }

  static String passwordChanged(String name) {
    return layout(
        "Mật khẩu đã được thay đổi",
        name,
        "<p>Mật khẩu tài khoản của bạn vừa được thay đổi.</p>",
        null,
        null,
        "Nếu không phải bạn thực hiện, hãy liên hệ quản trị viên ngay.");
  }

  private static String layout(
      String title,
      String name,
      String bodyHtml,
      String buttonText,
      String buttonUrl,
      String note) {
    String button =
        buttonUrl == null
            ? ""
            : "<p style='text-align:center;margin:28px 0'>"
                + "<a href='"
                + HtmlUtils.htmlEscape(buttonUrl)
                + "' style='background:#2563eb;color:#fff;"
                + "padding:12px 28px;border-radius:6px;text-decoration:none;font-weight:600'>"
                + buttonText
                + "</a></p>";
    return "<html><body style='font-family:Arial,sans-serif;line-height:1.6;color:#333'>"
        + "<div style='max-width:560px;margin:0 auto;padding:24px;border:1px solid #e5e7eb;border-radius:10px'>"
        + "<h2 style='margin-top:0'>"
        + title
        + "</h2>"
        + "<p>Xin chào <strong>"
        + HtmlUtils.htmlEscape(name)
        + "</strong>,</p>"
        + bodyHtml
        + button
        + "<p style='color:#6b7280;font-size:13px'>"
        + note
        + "</p>"
        + "</div></body></html>";
  }
}
