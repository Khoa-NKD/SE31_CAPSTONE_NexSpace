package base.api.feature.personalization.dto.response;

import base.api.shared.enums.BookingPurpose;
import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategoryPreference;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Thông tin sở thích không gian của khách hàng")
public class CustomerPreferenceDto {

    @Schema(description = "Mã định danh của khách hàng", example = "10")
    private Long customerId;

    @Schema(description = "Danh sách tên các quận ưu tiên", example = "[\"Hải Châu\", \"Sơn Trà\"]")
    private List<String> districts;

    @Schema(description = "Danh sách ID các tiện ích ưu tiên", example = "[1, 2, 5]")
    private List<Long> amenityIds;

    @Schema(description = "Mức ngân sách tối thiểu (VND)", example = "50000")
    private BigDecimal budgetMin;

    @Schema(description = "Mức ngân sách tối đa (VND)", example = "200000")
    private BigDecimal budgetMax;

    @Schema(description = "Loại không gian ưu tiên (DESK, ROOM, ANY)", example = "DESK")
    private ResourceCategoryPreference resourceCategory;

    @Schema(description = "Mức độ yên tĩnh mong muốn (QUIET, MODERATE, LIVELY)", example = "QUIET")
    private NoiseLevel noiseLevel;

    @Schema(description = "Mục đích sử dụng không gian", example = "WORK")
    private BookingPurpose purpose;

    @Schema(description = "Thời gian cập nhật gần nhất")
    private LocalDateTime updatedAt;
}

