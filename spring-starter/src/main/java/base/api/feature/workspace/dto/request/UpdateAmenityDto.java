package base.api.feature.workspace.dto.request;

import base.api.shared.enums.AmenityCategory;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
@Schema(description = "Yêu cầu cập nhật tiện ích")
public class UpdateAmenityDto {

    @NotBlank(message = "Tên tiện ích không được để trống")
    @Size(max = 100, message = "Tên tiện ích tối đa 100 ký tự")
    @Schema(description = "Tên tiện ích", example = "Wi-Fi chuyên dụng (1 Gbps)")
    private String name;

    @NotNull(message = "Danh mục tiện ích không được để trống")
    @Schema(description = "Phân loại tiện ích", example = "TECH")
    private AmenityCategory category;

    @Size(max = 100, message = "Mã icon tối đa 100 ký tự")
    @Schema(description = "Tên icon Lucide hoặc link icon", example = "Wifi")
    private String icon;

    @Size(max = 500, message = "Mô tả tối đa 500 ký tự")
    @Schema(description = "Mô tả chi tiết tiện ích", example = "Đường truyền Internet dự phòng kép")
    private String description;

    @Schema(description = "Trạng thái kích hoạt", example = "true")
    private Boolean active;
}

