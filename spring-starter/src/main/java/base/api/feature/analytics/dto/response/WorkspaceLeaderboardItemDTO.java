package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class WorkspaceLeaderboardItemDTO {
    int rank;
    String id;
    String name;
    String address;
    String city;
    String district;
    int totalBookings30d;
    double grossRevenueUsd;
    long grossRevenueVnd;
    String grossRevenueDisplay;
    String localCurrencyDisplay;
    double averageOccupancyPercent;
    String occupancyStatus; // Optimal, Steady, Standard
    double satisfactionRating;
    int reviewsCount;
    String iconType;
    String coverImageUrl;
}
