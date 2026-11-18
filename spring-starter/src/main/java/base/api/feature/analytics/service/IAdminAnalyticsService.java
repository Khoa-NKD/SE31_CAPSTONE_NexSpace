package base.api.feature.analytics.service;

import base.api.feature.analytics.dto.response.AdminDashboardOverviewResponseDTO;
import base.api.feature.analytics.dto.response.AdminPlatformAnalyticsResponseDTO;

public interface IAdminAnalyticsService {
    AdminDashboardOverviewResponseDTO getDashboardOverview(String timeRange);
    AdminPlatformAnalyticsResponseDTO getPlatformAnalytics(String timeRange);
}
