package base.api.feature.analytics.controller;

import base.api.feature.analytics.dto.response.AdminDashboardOverviewResponseDTO;
import base.api.feature.analytics.dto.response.AdminPlatformAnalyticsResponseDTO;
import base.api.feature.analytics.service.IAdminAnalyticsService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/v1/admin/analytics", "/api/admin/analytics"})
@RequiredArgsConstructor
@Tag(name = "Admin Analytics", description = "Số liệu thống kê, báo cáo và phân tích dữ liệu thực tế sàn NexSpace cho Admin")
public class AdminAnalyticsController extends BaseAPIController {

    private final IAdminAnalyticsService adminAnalyticsService;

    @GetMapping("/overview")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem tổng quan Dashboard điều hành Admin (KPIs, tác vụ ưu tiên, biểu đồ xu hướng, cảnh báo)")
    public ResponseEntity<ApiResponse<AdminDashboardOverviewResponseDTO>> getDashboardOverview(
            @RequestParam(required = false, defaultValue = "7d") String timeRange) {
        AdminDashboardOverviewResponseDTO overview = adminAnalyticsService.getDashboardOverview(timeRange);
        return success(overview, "Lấy dữ liệu tổng quan bảng điều khiển Admin thành công");
    }

    @GetMapping("/platform")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPER_ADMIN')")
    @Operation(summary = "Xem phân tích kinh doanh vĩ mô toàn sàn (Doanh thu GMV, hoa hồng, phân bổ dịch vụ, bảng xếp hạng)")
    public ResponseEntity<ApiResponse<AdminPlatformAnalyticsResponseDTO>> getPlatformAnalytics(
            @RequestParam(required = false, defaultValue = "7d") String timeRange) {
        AdminPlatformAnalyticsResponseDTO platform = adminAnalyticsService.getPlatformAnalytics(timeRange);
        return success(platform, "Lấy dữ liệu phân tích kinh doanh sàn thành công");
    }
}
