package base.api.feature.analytics.dto;

import base.api.shared.enums.ResourceCategory;
import base.api.shared.exception.BadRequestException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;

/** Calendar dates are inclusive; database timestamps use a half-open interval. */
public record AnalyticsFilter(LocalDate from, LocalDate to, Long workspaceId,
                              Integer floorNumber, Long resourceTypeId, ResourceCategory category) {
    public AnalyticsFilter {
        if (from == null || to == null || to.isBefore(from)
                || ChronoUnit.DAYS.between(from, to) >= 366) {
            throw new BadRequestException("Chọn khoảng thời gian hợp lệ, tối đa 366 ngày");
        }
        if (from.getYear() < 1000 || to.getYear() > 9998) {
            throw new BadRequestException("Khoảng ngày nằm ngoài phạm vi lưu trữ hỗ trợ");
        }
        if ((workspaceId != null && workspaceId <= 0) || (resourceTypeId != null && resourceTypeId <= 0)) {
            throw new BadRequestException("Mã workspace hoặc loại chỗ không hợp lệ");
        }
        if (floorNumber != null && workspaceId == null) {
            throw new BadRequestException("Chọn workspace trước khi lọc tầng");
        }
    }

    public LocalDateTime start() { return from.atStartOfDay(); }
    public LocalDateTime end() { return to.plusDays(1).atStartOfDay(); }
    public AnalyticsFilter previous() {
        long days = ChronoUnit.DAYS.between(from, to) + 1;
        if (from.minusDays(days).getYear() < 1000) throw new BadRequestException("Kỳ so sánh nằm ngoài phạm vi lưu trữ hỗ trợ");
        return new AnalyticsFilter(from.minusDays(days), from.minusDays(1), workspaceId, floorNumber, resourceTypeId, category);
    }
}
