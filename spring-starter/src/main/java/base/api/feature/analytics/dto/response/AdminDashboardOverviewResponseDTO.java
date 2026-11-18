package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminDashboardOverviewResponseDTO {
    String timeframe;
    List<AdminOverviewKpiDTO> kpis;
    List<AdminTriageItemDTO> triageItems;
    List<AdminOperationalTrendPointDTO> trendPoints;
    AdminVolumeSummaryDTO volumeSummary;
    List<AdminLiveSystemAlertDTO> alerts;
}
