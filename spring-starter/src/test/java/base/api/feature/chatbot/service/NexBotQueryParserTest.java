package base.api.feature.chatbot.service;

import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Clock;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;

import static org.assertj.core.api.Assertions.assertThat;

class NexBotQueryParserTest {

    private static final ZoneId VN_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final Clock FIXED_CLOCK = Clock.fixed(
            Instant.parse("2026-11-25T03:00:00Z"), // 10:00 25/11/2026 GMT+7
            VN_ZONE
    );

    @Test
    @DisplayName("Parses multi-condition Da Nang + 10.000đ + time + seat number + availability query")
    void parsesDaNangMultiConditionQuery() {
        String q = "muốn đặt nexspace tại đà nẵng giá 10.000 lúc 9h đến 11h ngày mai ghế số 1 có available không";
        NexBotQueryParser.ParsedQuery parsed = NexBotQueryParser.parse(q, FIXED_CLOCK);

        assertThat(parsed.locations()).contains("đà nẵng");
        assertThat(parsed.targetHourlyPrice()).isEqualByComparingTo(new BigDecimal("10000"));
        assertThat(parsed.startTime()).isEqualTo(LocalDateTime.of(2026, 11, 26, 9, 0));
        assertThat(parsed.endTime()).isEqualTo(LocalDateTime.of(2026, 11, 26, 11, 0));
        assertThat(parsed.resourceTokens()).contains("1");
        assertThat(parsed.resourceCategory()).isEqualTo(ResourceCategory.DESK);
        assertThat(parsed.availabilityRequested()).isTrue();
        assertThat(parsed.hasMultiFilterSearchIntent()).isTrue();
    }

    @Test
    @DisplayName("Parses price range, room capacity, noise level, explicit date, and seat code")
    void parsesRangeCapacityNoiseAndCode() {
        String q = "tìm phòng họp 6 người ở Cầu Giấy Hà Nội từ 30k đến 200k ngày 28/11 lúc 14:00 - 17:00 mã M-01 yên tĩnh wifi in ấn còn trống không";
        NexBotQueryParser.ParsedQuery parsed = NexBotQueryParser.parse(q, FIXED_CLOCK);

        assertThat(parsed.locations()).contains("cầu giấy", "hà nội");
        assertThat(parsed.minHourlyPrice()).isEqualByComparingTo(new BigDecimal("30000"));
        assertThat(parsed.maxHourlyPrice()).isEqualByComparingTo(new BigDecimal("200000"));
        assertThat(parsed.resourceCategory()).isEqualTo(ResourceCategory.ROOM);
        assertThat(parsed.minCapacity()).isEqualTo(6);
        assertThat(parsed.noiseLevel()).isEqualTo(NoiseLevel.QUIET);
        assertThat(parsed.resourceTokens()).contains("M-01");
        assertThat(parsed.amenityKeywords()).contains("wifi", "in ấn");
        assertThat(parsed.startTime()).isEqualTo(LocalDateTime.of(2026, 11, 28, 14, 0));
        assertThat(parsed.endTime()).isEqualTo(LocalDateTime.of(2026, 11, 28, 17, 0));
        assertThat(parsed.availabilityRequested()).isTrue();
    }

    @Test
    @DisplayName("Parses single clock + duration in Vietnamese correctly")
    void parsesSingleClockAndDuration() {
        String q = "tìm bàn ở Thủ Đức dưới 15k hôm nay lúc 2h chiều trong 3 tiếng";
        NexBotQueryParser.ParsedQuery parsed = NexBotQueryParser.parse(q, FIXED_CLOCK);

        assertThat(parsed.locations()).contains("thủ đức");
        assertThat(parsed.maxHourlyPrice()).isEqualByComparingTo(new BigDecimal("15000"));
        assertThat(parsed.startTime()).isEqualTo(LocalDateTime.of(2026, 11, 25, 14, 0));
        assertThat(parsed.endTime()).isEqualTo(LocalDateTime.of(2026, 11, 25, 17, 0));
    }
}

