package base.api.feature.workspace.dto.request;

import base.api.shared.enums.MaintenanceStatus;
import io.swagger.v3.oas.annotations.media.Schema;
import jakarta.validation.constraints.Min;
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
public class UpdateMaintenanceLogDto {

    @Schema(description = "Trạng thái bảo trì mới", example = "COMPLETED")
    private MaintenanceStatus status;

    @Size(max = 100, message = "Tên đơn vị thực hiện tối đa 100 ký tự")
    @Schema(description = "Kỹ thuật viên hoặc đơn vị bảo trì", example = "Trung tâm kỹ thuật Epson VN")
    private String performedBy;

    @Min(value = 0, message = "Chi phí bảo trì không được âm")
    @Schema(description = "Chi phí bảo trì thực tế", example = "1200000")
    private BigDecimal cost;

    @Schema(description = "Thời gian bắt đầu xử lý")
    private LocalDateTime startedAt;

    @Schema(description = "Thời gian hoàn thành")
    private LocalDateTime completedAt;

    @Size(max = 1000, message = "Ghi chú kết quả tối đa 1000 ký tự")
    @Schema(description = "Ghi chú kết quả sau bảo trì")
    private String resultNote;
}

