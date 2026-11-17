package base.api.feature.organizer.service;

import base.api.shared.config.EmailService;
import jakarta.mail.Session;
import jakarta.mail.internet.MimeMessage;
import java.util.Properties;
import org.junit.jupiter.api.Test;
import org.springframework.mail.MailSendException;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.util.ReflectionTestUtils;
import static org.mockito.Mockito.*;
import static org.assertj.core.api.Assertions.*;

class RequiredContractEmailTest {
    @Test void missingSmtpCannotSilentlyAcceptAnOtpDelivery() {
        var sender = mock(JavaMailSender.class); var service = new EmailService(sender);
        assertThatThrownBy(() -> service.sendRequiredHtmlEmail("owner@example.test", "Verification", "Test content"))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("not configured");
        verifyNoInteractions(sender);
    }
    @Test void providerFailuresAreReportedWithoutLeakingProviderDetails() {
        var sender = mock(JavaMailSender.class); var service = new EmailService(sender);
        ReflectionTestUtils.setField(service, "fromEmail", "sender@example.test");
        when(sender.createMimeMessage()).thenReturn(new MimeMessage(Session.getInstance(new Properties())));
        doThrow(new MailSendException("private provider diagnostic")).when(sender).send(any(MimeMessage.class));
        assertThatThrownBy(() -> service.sendRequiredHtmlEmail("owner@example.test", "Verification", "Test content"))
                .isInstanceOf(IllegalStateException.class).hasMessageNotContaining("private provider diagnostic").hasNoCause();
    }
}
