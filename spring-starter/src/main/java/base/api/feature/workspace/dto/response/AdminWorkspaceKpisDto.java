package base.api.feature.workspace.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminWorkspaceKpisDto {
    long totalWorkspaces;
    long pendingReviewCount;
    long activeCount;
    long suspendedCount;
}

