package base.api.feature.personalization.dto.request;

import base.api.shared.enums.BookingPurpose;
import base.api.shared.enums.NoiseLevel;
import base.api.shared.enums.ResourceCategoryPreference;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Schema(description = "Dữ liệu yêu cầu cập nhật sở thích không gian của khách hàng")
public class UpdateCustomerPreferenceDto {

    @Size(max = 5, message = "Danh sách khu vực tối đa 5 quận")
    @Schema(description = "Danh sách tên các quận mong muốn (tối đa 5 quận)", example = "[\"Hải Châu\", \"Sơn Trà\"]")
    private List<String> districts;

    @Size(max = 10, message = "Danh sách tiện ích tối đa 10 tiện ích")
    @Schema(description = "Danh sách ID các tiện ích mong muốn (tối đa 10 tiện ích)", example = "[1, 2, 5]")
    private List<Long> amenityIds;

    @DecimalMin(value = "0.0", inclusive = true, message = "Ngân sách tối thiểu không được âm")
    @Schema(description = "Ngân sách tối thiểu mong muốn (VND)", example = "50000")
    private BigDecimal budgetMin;

    @DecimalMin(value = "0.0", inclusive = true, message = "Ngân sách tối đa không được âm")
    @Schema(description = "Ngân sách tối đa sẵn sàng chi trả (VND)", example = "200000")
    private BigDecimal budgetMax;

    @Schema(description = "Loại hình không gian ưu tiên (DESK, ROOM, ANY)", example = "DESK")
    private ResourceCategoryPreference resourceCategory;

    @Schema(description = "Mức độ yên tĩnh mong muốn (QUIET, MODERATE, LIVELY)", example = "QUIET")
    private NoiseLevel noiseLevel;

    @Schema(description = "Mục đích sử dụng không gian (STUDY, FREELANCE, TEAM_WORK, MEETING, EVENT, OTHER)", example = "FREELANCE")
    private BookingPurpose purpose;
}

