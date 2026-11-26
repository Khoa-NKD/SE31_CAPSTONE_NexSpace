package base.api.feature.workspace.service;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.operations.repository.MaintenanceGroupRepository;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.exception.BadRequestException;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

/** Read-only search snapshot. Booking creation still acquires locks and validates again. */
@Service
@RequiredArgsConstructor
public class WorkspaceSearchAvailability {
    private final IWorkspaceOperatingHourRepository hours;
    private final IBookableResourceRepository resources;
    private final IBookingRepository bookings;
    private final IResourceBlockedSlotRepository blocks;
    private final MaintenanceGroupRepository maintenance;

    public Set<Long> matching(List<WorkspaceModel> candidates, LocalDateTime start, LocalDateTime end,
            Collection<ResourceCategory> categories) {
        if (candidates.isEmpty()) return Set.of();
        var ids = candidates.stream().map(WorkspaceModel::getId).toList();
        var byWorkspace = hours.findByWorkspaceIdIn(ids).stream()
                .collect(Collectors.groupingBy(row -> row.getWorkspace().getId()));
        var maintained = maintenance.wholeWorkspaceOverlappingIds(ids, start, end);
        var eligible = new HashSet<Long>();
        for (var workspace : candidates) {
            if (maintained.contains(workspace.getId()) || !OperatingHours.covers(byWorkspace.get(workspace.getId()), start, end)) continue;
            try {
                VietnamHolidays.validate(workspace, start, end);
                eligible.add(workspace.getId());
            } catch (BadRequestException closedOrUnknownCalendar) {
                // An unverified holiday calendar cannot establish a bookable search result.
            }
        }
        if (eligible.isEmpty()) return Set.of();
        var unavailable = new HashSet<>(bookings.findSearchOccupiedResourceIds(eligible, start, end,
                LocalDateTime.now(VietnamHolidays.ZONE)));
        unavailable.addAll(blocks.findSearchBlockedResourceIds(eligible, start, end));
        return resources.findAvailableResourcesByWorkspaceIds(eligible).stream()
                .filter(resource -> resource.getParentRoom() == null)
                .filter(resource -> resource.getResourceType() != null && resource.getResourceType().isActive())
                .filter(resource -> categories == null || categories.isEmpty()
                        || categories.contains(resource.getResourceType().getCategory()))
                .filter(resource -> !unavailable.contains(resource.getId()))
                .map(resource -> resource.getFloorPlan().getWorkspace().getId())
                .collect(Collectors.toSet());
    }
}
