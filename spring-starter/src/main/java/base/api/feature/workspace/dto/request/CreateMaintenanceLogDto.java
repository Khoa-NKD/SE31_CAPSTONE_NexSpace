package base.api.feature.workspace.dto.request;

import base.api.shared.enums.MaintenanceStatus;
import base.api.shared.enums.MaintenanceType;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CreateMaintenanceLogDto {

    @NotNull(message = "Loại bảo trì không được để trống")
    @Schema(description = "Loại bảo dưỡng / sửa chữa", example = "REPAIR")
    private MaintenanceType maintenanceType;

    @Builder.Default
    @Schema(description = "Trạng thái bảo trì", example = "SCHEDULED")
    private MaintenanceStatus status = MaintenanceStatus.SCHEDULED;

    @NotBlank(message = "Mô tả công việc bảo trì không được để trống")
    @Size(max = 1000, message = "Mô tả tối đa 1000 ký tự")
    @Schema(description = "Mô tả sự cố hoặc nội dung bảo trì", example = "Bóng đèn máy chiếu chập chờn cần thay thế")
    private String description;

    @Size(max = 100, message = "Tên đơn vị thực hiện tối đa 100 ký tự")
    @Schema(description = "Kỹ thuật viên hoặc đơn vị bảo trì", example = "Trung tâm kỹ thuật Epson VN")
    private String performedBy;

    @Min(value = 0, message = "Chi phí bảo trì không được âm")
    @Schema(description = "Chi phí dự kiến / thực tế", example = "1200000")
    private BigDecimal cost;

    @Schema(description = "Thời gian lên lịch bảo trì")
    private LocalDateTime scheduledAt;

    @Schema(description = "Thời gian bắt đầu xử lý")
    private LocalDateTime startedAt;

    @Schema(description = "Thời gian hoàn thành")
    private LocalDateTime completedAt;

    @Size(max = 1000, message = "Ghi chú kết quả tối đa 1000 ký tự")
    @Schema(description = "Ghi chú kết quả sau bảo trì")
    private String resultNote;
}

