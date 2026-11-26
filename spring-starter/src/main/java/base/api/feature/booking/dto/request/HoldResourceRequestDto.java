package base.api.feature.booking.dto.request;

import base.api.shared.enums.PriceType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Future;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu giữ chỗ tạm thời (Temporary Hold) cho bàn hoặc phòng làm việc")
public class HoldResourceRequestDto {

    @NotNull(message = "Mã chỗ ngồi/phòng không được để trống")
    @Schema(description = "ID của Bookable Resource (Ghế/Phòng)", example = "101")
    private Long resourceId;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    @Future(message = "Thời gian bắt đầu phải ở tương lai")
    @Schema(description = "Thời gian bắt đầu giữ chỗ", example = "2026-11-25T09:00:00")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    @Schema(description = "Thời gian kết thúc giữ chỗ", example = "2026-11-25T13:00:00")
    private LocalDateTime endTime;

    @Builder.Default
    @Min(value = 1, message = "Số lượng người tối thiểu là 1")
    @Schema(description = "Số lượng người tham gia", example = "1", defaultValue = "1")
    private int partySize = 1;

    @Builder.Default
    @NotNull(message = "Loại giá không được để trống")
    @Schema(description = "Loại hình tính giá (HOURLY / DAILY / MONTHLY)", example = "HOURLY")
    private PriceType priceType = PriceType.HOURLY;

    @jakarta.validation.constraints.Size(max = 100)
    private java.util.List<@jakarta.validation.constraints.NotNull @jakarta.validation.constraints.Positive Long> amenityIds;

    @Size(max = 500, message = "Ghi chú không được vượt quá 500 ký tự")
    @Schema(description = "Ghi chú hoặc mục đích sử dụng", example = "Làm việc cá nhân")
    private String notes;
}
