package base.api.feature.organizer.service;

import base.api.shared.config.EmailService;
import base.api.shared.enums.*;
import org.junit.jupiter.api.Test;
import java.util.List;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class OrganizerReviewEmailNotificationTest {
    private OrganizerReviewNotification notice(OrganizerProfileStatus status) {
        return new OrganizerReviewNotification(42L, "owner@example.test", "<Applicant>", "Company & Co", status,
                "Reason <script>alert(1)</script>", List.of(new OrganizerReviewNotification.DocumentChange(OrganizerDocumentType.BUSINESS_LICENSE, "Upload a clearer copy")));
    }

    @Test void composesThreeDecisionsWithSafeLinksAndEscapedFeedback() {
        for (var status : List.of(OrganizerProfileStatus.APPROVED, OrganizerProfileStatus.REJECTED, OrganizerProfileStatus.REVISION_REQUESTED)) {
            var content = OrganizerReviewEmailNotification.compose(notice(status), "http://localhost:3000/");
            assertThat(content.html()).contains("http://localhost:3000/auth/sign-in?redirect=", "&lt;Applicant&gt;", "Company &amp; Co")
                    .doesNotContain("<script>", "<Applicant>");
            if (status == OrganizerProfileStatus.APPROVED) assertThat(content.html()).contains("%2Fdashboard%2Forganizer%2Fworkspaces");
            else assertThat(content.html()).contains("%2Forganizer%2Fapply");
            if (status == OrganizerProfileStatus.REVISION_REQUESTED) assertThat(content.html()).contains("Upload a clearer copy", "Giấy phép kinh doanh", "Gửi lại hồ sơ");
            if (status == OrganizerProfileStatus.REJECTED) assertThat(content.html()).contains("không được chỉnh sửa hoặc gửi lại").doesNotContain("Upload a clearer copy");
        }
    }

    @Test void usesExistingMailSenderAndDoesNotPropagateQueueFailures() {
        var email = mock(EmailService.class);
        var listener = new OrganizerReviewEmailNotification(email, "http://localhost:3000");
        doThrow(new org.springframework.core.task.TaskRejectedException("test queue full"))
                .when(email).sendHtmlEmail(anyString(), anyString(), anyString());
        assertThatCode(() -> listener.onReview(notice(OrganizerProfileStatus.APPROVED))).doesNotThrowAnyException();
        verify(email).sendHtmlEmail(eq("owner@example.test"), contains("đã được phê duyệt"), contains("#42"));
    }

    @Test void invalidDestinationDoesNotQueueMailAndSnapshotDoesNotLeakRecipient() {
        var email = mock(EmailService.class);
        new OrganizerReviewEmailNotification(email, "https://example.test/?redirect=untrusted")
                .onReview(notice(OrganizerProfileStatus.APPROVED));
        verifyNoInteractions(email);
        assertThat(notice(OrganizerProfileStatus.APPROVED).toString()).doesNotContain("owner@example.test", "Reason");
    }
}
