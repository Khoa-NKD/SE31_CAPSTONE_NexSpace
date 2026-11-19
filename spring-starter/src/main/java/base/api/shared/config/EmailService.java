package base.api.shared.config;

import jakarta.mail.MessagingException;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.mail.MailException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${spring.mail.username:}")
    private String fromEmail;

    public boolean isConfigured() {
        return fromEmail != null && !fromEmail.isBlank();
    }

    /** Required verification messages must report failure to the caller and never log their contents. */
    public void sendRequiredHtmlEmail(String to, String subject, String htmlContent) {
        if (!isConfigured()) {
            throw new IllegalStateException("Email delivery is not configured. Please contact support.");
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            helper.setFrom(fromEmail);
            mailSender.send(message);
        } catch (MessagingException | MailException exception) {
            // Provider exceptions can include recipients or authentication details.
            throw new IllegalStateException("Email could not be delivered. Please try again later.");
        }
    }

    /** Gửi bất đồng bộ; lỗi SMTP chỉ được log, không làm fail request. */
    @Async("emailExecutor")
    public void sendHtmlEmail(String to, String subject, String htmlContent) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("SMTP chưa cấu hình (spring.mail.username). Bỏ qua email '{}' tới {}", subject, to);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            helper.setFrom(fromEmail);
            mailSender.send(message);
        } catch (MessagingException | MailException e) {
            log.error("Gửi email '{}' tới {} thất bại: {}", subject, to, e.getMessage(), e);
        }
    }

    /** Gửi email kèm file đính kèm bất đồng bộ; lỗi SMTP chỉ được log, không làm gián đoạn transaction. */
    @Async("emailExecutor")
    public void sendHtmlEmailWithAttachment(String to, String subject, String htmlContent, String attachmentFilename, byte[] attachmentBytes, String contentType) {
        if (fromEmail == null || fromEmail.isBlank()) {
            log.warn("SMTP chưa cấu hình (spring.mail.username). Bỏ qua email '{}' tới {}", subject, to);
            return;
        }
        try {
            MimeMessage message = mailSender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, "UTF-8");
            helper.setTo(to);
            helper.setSubject(subject);
            helper.setText(htmlContent, true);
            helper.setFrom(fromEmail);
            if (attachmentBytes != null && attachmentBytes.length > 0) {
                helper.addAttachment(attachmentFilename, new ByteArrayResource(attachmentBytes), contentType != null ? contentType : "application/pdf");
            }
            mailSender.send(message);
            log.info("Đã gửi email '{}' kèm hóa đơn tới {}", subject, to);
        } catch (MessagingException | MailException e) {
            log.error("Gửi email kèm hóa đơn '{}' tới {} thất bại: {}", subject, to, e.getMessage(), e);
        }
    }
}
