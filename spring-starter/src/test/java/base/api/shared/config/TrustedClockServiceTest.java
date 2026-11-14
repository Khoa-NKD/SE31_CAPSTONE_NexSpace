package base.api.shared.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.time.Instant;
import java.time.LocalDateTime;

import static org.assertj.core.api.Assertions.assertThat;

class TrustedClockServiceTest {

    @Test
    @DisplayName("TrustedClockService khởi tạo và trả về thời gian thực theo múi giờ Việt Nam")
    void trustedClockService_ReturnsValidTime() {
        TrustedClockService clockService = new TrustedClockService();

        Instant instant = clockService.nowInstant();
        assertThat(instant).isNotNull();

        LocalDateTime vietnamTime = clockService.nowInVietnam();
        assertThat(vietnamTime).isNotNull();
    }

    @Test
    @DisplayName("TrustedClockService bảo đảm tính đơn điệu (Monotonic) theo thời gian CPU")
    void trustedClockService_MonotonicProgression() throws InterruptedException {
        TrustedClockService clockService = new TrustedClockService();

        Instant t1 = clockService.nowInstant();
        Thread.sleep(15);
        Instant t2 = clockService.nowInstant();

        assertThat(t2).isAfterOrEqualTo(t1);
    }
}

