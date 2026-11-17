package base.api.feature.booking.dto.response;

import base.api.shared.enums.BookingStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Value
@Builder
@Schema(description = "Thông tin ước tính và chính sách hoàn tiền trước khi hủy đơn")
public class BookingCancellationPreviewDto {
    Long bookingId;
    String bookingCode;
    BookingStatus status;
    LocalDateTime startTime;
    long hoursBeforeStart;
    BigDecimal finalPrice;
    BigDecimal refundPercent;
    BigDecimal refundAmount;
    boolean isHostCancellation;
    boolean canCancel;
    String cancellationPolicyExplanation;
    List<CancellationRuleItemDto> rules;

    @Value
    @Builder
    @Schema(description = "Mốc quy tắc hoàn tiền")
    public static class CancellationRuleItemDto {
        int minHoursBeforeStart;
        BigDecimal refundPercent;
        String label;
    }
}
