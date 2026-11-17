package base.api.feature.workspace.dto.request;

import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.AmenityCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
@Schema(description = "Tham số lọc danh sách tiện ích")
public class AmenityFilterDto extends PageRequestDTO {

    @Schema(description = "Lọc theo danh mục tiện ích: TECH, COMFORT, SPACE", example = "TECH")
    private AmenityCategory category;

    @Schema(description = "Lọc theo trạng thái kích hoạt", example = "true")
    private Boolean active;
}
