package base.api.feature.workspace.dto.response;

import lombok.Builder;
import lombok.Value;

@Value
@Builder
public class AdminWorkspaceKpisDto {
    long totalPlatformUsers;
    long activeOrganizers;
    long activeWorkspaces;
    long totalBookings;
    long totalWorkspaces;
    long activeCount;
    long pendingCount;
    long maintenanceCount;
    long draftCount;
    long suspendedCount;
}

