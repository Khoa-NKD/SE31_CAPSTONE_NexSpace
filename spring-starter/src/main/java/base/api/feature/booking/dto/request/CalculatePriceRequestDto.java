package base.api.feature.booking.dto.request;

import base.api.shared.enums.PriceType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Yêu cầu tạm tính chi phí đặt chỗ trước khi xác nhận")
public class CalculatePriceRequestDto {

    @NotNull(message = "ID không gian không được để trống")
    @Schema(description = "ID của Workspace", example = "1")
    private Long workspaceId;

    @NotNull(message = "ID chỗ ngồi không được để trống")
    @Schema(description = "ID của Bookable Resource", example = "42")
    private Long resourceId;

    @NotNull(message = "Thời gian bắt đầu không được để trống")
    @Schema(description = "Thời gian bắt đầu", example = "2026-11-25T09:00:00")
    private LocalDateTime startTime;

    @NotNull(message = "Thời gian kết thúc không được để trống")
    @Schema(description = "Thời gian kết thúc", example = "2026-11-25T13:00:00")
    private LocalDateTime endTime;

    @Builder.Default
    @Schema(description = "Loại giá (HOURLY / DAILY / MONTHLY)", example = "HOURLY")
    private PriceType priceType = PriceType.HOURLY;
}
