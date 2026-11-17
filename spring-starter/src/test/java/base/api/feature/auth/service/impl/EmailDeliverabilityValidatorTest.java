package base.api.feature.auth.service.impl;

import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.net.ConnectException;

import static org.assertj.core.api.Assertions.assertThatCode;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

@DisplayName("Kiểm thử Trình Xác thực Tính Khả dụng của Email (EmailDeliverabilityValidatorTest)")
class EmailDeliverabilityValidatorTest {

    private EmailDeliverabilityValidator validator;

    @BeforeEach
    void setUp() {
        validator = new EmailDeliverabilityValidator();
    }

    @Test
    @DisplayName("Email cú pháp rỗng hoặc không hợp lệ: ném BadRequestException")
    void invalidSyntax_ThrowsBadRequest() {
        assertThatThrownBy(() -> validator.validateEmailDeliverability(""))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> validator.validateEmailDeliverability("notanemail"))
                .isInstanceOf(BadRequestException.class);

        assertThatThrownBy(() -> validator.validateEmailDeliverability("user@"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Tên miền example.com / test.com bị chặn: ném BadRequestException")
    void blockedDomains_ThrowsBadRequest() {
        assertThatThrownBy(() -> validator.validateEmailDeliverability("admin@example.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không tồn tại hoặc thuộc tên miền không được hỗ trợ");

        assertThatThrownBy(() -> validator.validateEmailDeliverability("user@test.com"))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    @DisplayName("Tên người dùng Gmail dưới 6 ký tự hoặc chứa dấu chấm liên tiếp: ném BadRequestException")
    void invalidGmailRules_ThrowsBadRequest() {
        assertThatThrownBy(() -> validator.validateEmailDeliverability("abc@gmail.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("từ 6 đến 30 ký tự");

        assertThatThrownBy(() -> validator.validateEmailDeliverability("user..name12@gmail.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("không đúng định dạng");
    }

    @Test
    @DisplayName("Email Gmail không tồn tại thực tế (máy chủ SMTP trả về 550): ném BadRequestException")
    void nonExistentGmail_ThrowsBadRequest() {
        EmailDeliverabilityValidator mockValidator = new EmailDeliverabilityValidator(
                (address, email) -> new EmailDeliverabilityValidator.SmtpResult(
                        550, "550 5.1.1 The email account that you tried to reach does not exist.")
        );

        assertThatThrownBy(() -> mockValidator.validateEmailDeliverability("khoankdde180292@gmail.com"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Địa chỉ email không tồn tại trong hệ thống Gmail: 550 5.1.1");
    }

    @Test
    @DisplayName("Email Gmail tồn tại thực tế (máy chủ SMTP trả về 250): xác thực thành công")
    void validGmail_Success() {
        EmailDeliverabilityValidator mockValidator = new EmailDeliverabilityValidator(
                (address, email) -> new EmailDeliverabilityValidator.SmtpResult(250, "250 2.1.5 OK")
        );

        assertThatCode(() -> mockValidator.validateEmailDeliverability("valid.user123@gmail.com"))
                .doesNotThrowAnyException();
    }

    @Test
    @DisplayName("Máy chủ SMTP không thể kết nối (tường lửa CI chặn cổng 25): kích hoạt fail-open an toàn")
    void smtpUnavailable_FailsOpenGracefully() {
        EmailDeliverabilityValidator mockValidator = new EmailDeliverabilityValidator(
                (address, email) -> {
                    throw new ConnectException("Connection timed out: port 25 blocked by firewall");
                }
        );

        assertThatCode(() -> mockValidator.validateEmailDeliverability("user.name12@gmail.com"))
                .doesNotThrowAnyException();
    }
}
