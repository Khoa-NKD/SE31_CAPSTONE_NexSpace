package base.api.feature.auth.service.impl;

import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

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
}

