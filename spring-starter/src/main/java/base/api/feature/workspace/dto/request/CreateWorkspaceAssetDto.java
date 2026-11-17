package base.api.feature.workspace.dto.request;

import base.api.shared.enums.AssetStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateWorkspaceAssetDto {

    @NotBlank(message = "Mã tài sản không được để trống")
    @Size(max = 50, message = "Mã tài sản tối đa 50 ký tự")
    @Schema(description = "Mã định danh tài sản nội bộ", example = "PRJ-001")
    private String assetCode;

    @NotBlank(message = "Tên tài sản không được để trống")
    @Size(max = 255, message = "Tên tài sản tối đa 255 ký tự")
    @Schema(description = "Tên tài sản / thiết bị", example = "Máy chiếu Epson Full HD")
    private String name;

    @Min(value = 1, message = "Số lượng phải lớn hơn 0")
    @Builder.Default
    @Schema(description = "Số lượng", example = "1")
    private int quantity = 1;

    @Builder.Default
    @Schema(description = "Trạng thái hoạt động", example = "IN_USE")
    private AssetStatus status = AssetStatus.IN_USE;

    @Schema(description = "ID vị trí / chỗ ngồi bookable gắn kèm (nếu có)")
    private Long resourceId;

    @Schema(description = "ID danh mục tiện ích liên quan (nếu có)")
    private Long amenityId;

    @Schema(description = "Ngày mua thiết bị")
    private LocalDate purchaseDate;

    @Min(value = 0, message = "Giá mua không được âm")
    @Schema(description = "Giá mua", example = "15000000")
    private BigDecimal purchasePrice;

    @Schema(description = "Thời hạn bảo hành")
    private LocalDate warrantyUntil;

    @Schema(description = "Ngày bảo trì định kỳ kế tiếp")
    private LocalDate nextMaintenanceDate;

    @Size(max = 1000, message = "Ghi chú tối đa 1000 ký tự")
    @Schema(description = "Ghi chú tài sản", example = "Đặt tại phòng họp Sapphire")
    private String note;
}

