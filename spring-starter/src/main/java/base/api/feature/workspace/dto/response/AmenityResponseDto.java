package base.api.feature.workspace.dto.response;

import base.api.shared.enums.AmenityCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
@Schema(description = "Thông tin tiện ích trả về")
public class AmenityResponseDto {

    @Schema(description = "ID tiện ích", example = "1")
    Long id;

    @Schema(description = "Tên tiện ích", example = "Wi-Fi tốc độ cao (1 Gbps)")
    String name;

    @Schema(description = "Danh mục tiện ích", example = "TECH")
    AmenityCategory category;

    @Schema(description = "Mã icon", example = "Wifi")
    String icon;

    @Schema(description = "Mô tả chi tiết", example = "Kết nối cáp quang đối xứng tốc độ cao")
    String description;

    @Schema(description = "Trạng thái kích hoạt", example = "true")
    boolean active;

    @Schema(description = "ID đối tác sở hữu (null nếu là tiện ích hệ thống)", example = "10")
    Long organizerId;

    @Schema(description = "Đánh dấu tiện ích riêng do đối tác tạo", example = "true")
    boolean custom;

    @Schema(description = "Thời gian tạo")
    LocalDateTime createdAt;

    @Schema(description = "Thời gian cập nhật")
    LocalDateTime updatedAt;
}
