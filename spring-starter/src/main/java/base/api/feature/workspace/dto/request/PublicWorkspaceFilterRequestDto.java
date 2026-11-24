package base.api.feature.workspace.dto.request;

import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.WorkspaceCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.EqualsAndHashCode;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@EqualsAndHashCode(callSuper = true)
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Tham số tìm kiếm và lọc không gian làm việc công khai")
public class PublicWorkspaceFilterRequestDto extends PageRequestDTO {

    @Schema(description = "Thành phố / Tỉnh thành", example = "Đà Nẵng")
    private String city;

    @Schema(description = "Quận / Huyện", example = "Hải Châu")
    private String district;

    @Schema(description = "Loại hình không gian", example = "COWORKING_HUB")
    private WorkspaceCategory category;

    @Schema(description = "Giá tối thiểu (VNĐ/giờ)", example = "20000")
    private BigDecimal minPrice;

    @Schema(description = "Giá tối đa (VNĐ/giờ)", example = "100000")
    private BigDecimal maxPrice;

    @Schema(description = "Danh sách ID tiện ích yêu cầu", example = "[1, 2, 4]")
    private List<Long> amenityIds;

    @Schema(description = "Danh mục chỗ ngồi yêu cầu (DESK, ROOM)", example = "[\"DESK\", \"ROOM\"]")
    private List<ResourceCategory> resourceCategories;

    @Schema(description = "Điểm đánh giá tối thiểu (1.0 - 5.0)", example = "4.0")
    private Double minRating;

    @Schema(description = "Thời gian bắt đầu tìm kiếm", example = "2026-11-25T08:00:00")
    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
    private java.time.LocalDateTime startTime;

    @Schema(description = "Thời gian kết thúc tìm kiếm", example = "2026-11-25T17:00:00")
    @org.springframework.format.annotation.DateTimeFormat(iso = org.springframework.format.annotation.DateTimeFormat.ISO.DATE_TIME)
    private java.time.LocalDateTime endTime;

    @Schema(description = "Vĩ độ người dùng (GPS)", example = "16.0544")
    private Double lat;

    @Schema(description = "Kinh độ người dùng (GPS)", example = "108.2022")
    private Double lng;
}

