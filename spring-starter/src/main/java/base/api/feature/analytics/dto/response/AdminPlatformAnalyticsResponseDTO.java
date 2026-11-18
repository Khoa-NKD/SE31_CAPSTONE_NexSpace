package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminPlatformAnalyticsResponseDTO {
    double averageOccupancyPercent;
    String occupancyChangePercent;
    long grossRevenueVnd;
    double grossRevenueUsd;
    String grossRevenueChangePercent;
    long netRevenueVnd;
    double netRevenueUsd;
    long totalBookings;
    String totalBookingsChangePercent;
    long activeWorkspacesCount;
    List<MacroTrendPointDTO> macroTrends;
    List<ResourceBreakdownPointDTO> resourceBreakdown;
    List<WorkspaceLeaderboardItemDTO> leaderboard;
}
