package base.api.feature.booking.dto.response;

import com.fasterxml.jackson.annotation.JsonProperty;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Value
@Builder
@Schema(description = "Thông tin phản hồi giữ chỗ tạm thời (Temporary Hold) kèm thời gian đếm ngược")
public class HoldResourceResponseDto {

    @Schema(description = "ID đơn đặt chỗ / phiên giữ chỗ", example = "501")
    Long bookingId;

    @Schema(description = "Mã đặt chỗ duy nhất", example = "BK-261113-ABCD")
    String bookingCode;

    @Schema(description = "Mã tài nguyên chỗ ngồi hoặc phòng", example = "101")
    Long resourceId;

    @Schema(description = "Tên tài nguyên chỗ ngồi hoặc phòng", example = "Bàn làm việc Focus 01")
    String resourceName;

    @Schema(description = "Mã không gian làm việc", example = "1")
    Long workspaceId;

    @Schema(description = "Tên không gian làm việc", example = "NexSpace Da Nang")
    String workspaceName;

    @Schema(description = "Thời gian bắt đầu đặt chỗ", example = "2026-11-25T09:00:00")
    LocalDateTime startTime;

    @Schema(description = "Thời gian kết thúc đặt chỗ", example = "2026-11-25T13:00:00")
    LocalDateTime endTime;

    @Schema(description = "Thời điểm phiên giữ chỗ hết hạn (sau đó slot sẽ tự động giải phóng)", example = "2026-11-25T08:45:00")
    LocalDateTime holdExpiresAt;

    @Schema(description = "Thời gian hiện tại của máy chủ để client đồng bộ đếm ngược chống lệch giờ", example = "2026-11-25T08:35:00")
    LocalDateTime serverTime;

    @Schema(description = "Số giây còn lại của phiên giữ chỗ", example = "600")
    long ttlSeconds;

    @Schema(description = "Thời lượng giữ chỗ cấu hình từ hệ thống / cơ sở dữ liệu (phút)", example = "7")
    Integer holdDurationMinutes;

    @JsonProperty("isReused")
    @Schema(description = "Cờ đánh dấu phiên giữ chỗ này được tái sử dụng (Idempotent Reuse)", example = "false")
    boolean isReused;

    @Schema(description = "Giá gốc trước thuế và giảm giá (VNĐ)", example = "140000.00")
    BigDecimal baseAmount;

    @Schema(description = "Chi phí tiện ích bổ sung (VNĐ)", example = "70000.00")
    BigDecimal addonAmount;

    @Schema(description = "Tổng tiền thanh toán cuối cùng (VNĐ)", example = "151200.00")
    BigDecimal finalPrice;

    @Schema(description = "Số lượt giữ hoặc hủy chỗ còn lại trước khi bị phạt block 20 phút", example = "3")
    Integer remainingHoldAttempts;

    @Schema(description = "Ngưỡng số lần giữ/hủy tối đa cho phép trước khi bị phạt", example = "3")
    Integer maxHoldAttempts;

    @Schema(description = "Thời gian phạt bị khóa quyền đặt chỗ nếu vi phạm spam hold (phút)", example = "20")
    Integer penaltyBlockMinutes;

    @Schema(description = "Cờ đánh dấu tài khoản có đang bị tạm khóa quyền đặt chỗ/giữ chỗ hay không", example = "false")
    Boolean isBookingSuspended;

    @Schema(description = "Thời điểm hết hạn tạm khóa quyền đặt chỗ", example = "2026-11-20T02:35:00")
    LocalDateTime bookingSuspendedUntil;

    @Schema(description = "Đơn vị tiền tệ", example = "VND")
    @Builder.Default
    String currency = "VND";
}
