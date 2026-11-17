package base.api.feature.organizer.service;

import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import static org.assertj.core.api.Assertions.assertThat;

class OrganizerIdentityImageCheckTest {
    @ParameterizedTest
    @CsvSource({
            "'CĂN CƯỚC | Họ, chữ đệm và tên | Ngày sinh', 1",
            "'IDENTITY CARD | Full name | Date of birth', 1",
            "'Ngày cấp | BỘ CÔNG AN | Nơi đăng ký khai sinh', 2",
            "'1D VN M 123456789012 <<<<<<<<<<', 2",
            "'ID VNM 123456789012', 0",
            "'Biên nhận thanh toán | Tổng tiền', 0"
    })
    void classifiesRecognizedFields(String text, int expectedSide) {
        assertThat(OrganizerIdentityImageCheck.classify(text)).isEqualTo(expectedSide);
    }
}
