package base.api.feature.analytics.dto.response;

import lombok.Builder;
import lombok.Value;

import java.util.List;

@Value
@Builder
public class AdminTriageItemDTO {
    String id;
    String title;
    String targetScreenCode;
    String targetScreenTitle;
    String category; // action, verification, dispute
    String statusBadge;
    int count;
    String countLabel;
    List<String> breakdown;
    String waitingNotice;
    String actionLabel;
}
