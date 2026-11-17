package base.api.feature.resource.dto.response;

import base.api.shared.enums.ResourceOccupancyStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * DTO phản hồi trạng thái khả dụng của phòng làm việc/họp theo thời gian thực (Real-time Room Availability).
 */
@Value
@Builder
@Schema(description = "Thông tin trạng thái khả dụng của phòng làm việc/họp theo thời gian thực")
public class RoomAvailabilityResponseDto {

    @Schema(description = "Mã định danh phòng", example = "201")
    Long roomId;

    @Schema(description = "Mã phòng trên sơ đồ", example = "R-01")
    String label;

    @Schema(description = "Tên hiển thị của phòng", example = "Phòng họp Sáng Tạo")
    String name;

    @Schema(description = "Tên phân khu", example = "Meeting Zone")
    String zoneName;

    @Schema(description = "Sức chứa tối đa (người)", example = "8")
    Integer capacity;

    @Schema(description = "Giá thuê theo giờ hiệu lực (VNĐ)", example = "250000.00")
    BigDecimal pricePerHour;

    @Schema(description = "Trạng thái khả dụng hiện tại", example = "AVAILABLE")
    ResourceOccupancyStatus status;

    @Schema(description = "Thời điểm hết hạn giữ chỗ tạm thời (nếu có)", example = "2026-11-13T08:45:00")
    LocalDateTime holdExpiresAt;

    @Schema(description = "Được giữ/đặt bởi chính người dùng hiện tại", example = "false")
    Boolean isOccupiedByMe;

    @Schema(description = "Có ghế con bên trong đang bị đặt hoặc giữ hay không (Xung đột ROOM-DESK)", example = "false")
    Boolean hasConflictingDesks;

    @Schema(description = "Số lượng ghế con bên trong đang bị đặt/giữ", example = "0")
    Integer occupiedChildDeskCount;

    @Schema(description = "Phòng đang hoặc sẽ trong khoảng đệm dọn dẹp vệ sinh", example = "true")
    Boolean isCleaningInProgress;

    @Schema(description = "Thời điểm phòng bắt đầu sẵn sàng đón khách tiếp theo sau dọn dẹp", example = "2026-11-13T11:15:00")
    LocalDateTime nextAvailableAt;

    @Schema(description = "Thời lượng đệm dọn dẹp vệ sinh (phút)", example = "15")
    Integer cleaningBufferMinutes;

    @Schema(description = "Tọa độ X trên sơ đồ tầng", example = "150.00")
    BigDecimal posX;

    @Schema(description = "Tọa độ Y trên sơ đồ tầng", example = "200.00")
    BigDecimal posY;

    @Schema(description = "Chiều rộng trên sơ đồ tầng", example = "80.00")
    BigDecimal width;

    @Schema(description = "Chiều dài trên sơ đồ tầng", example = "100.00")
    BigDecimal height;

    @Schema(description = "Góc xoay trên sơ đồ tầng", example = "0.00")
    BigDecimal rotation;
}

