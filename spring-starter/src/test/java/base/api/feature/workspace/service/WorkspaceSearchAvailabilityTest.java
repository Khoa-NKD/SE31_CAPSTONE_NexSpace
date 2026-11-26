package base.api.feature.workspace.service;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.operations.repository.MaintenanceGroupRepository;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.resource.repository.IResourceBlockedSlotRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.FloorPlanModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceHolidayDates;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.ResourceCategory;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class WorkspaceSearchAvailabilityTest {
    @Mock IWorkspaceOperatingHourRepository hours;
    @Mock IBookableResourceRepository resources;
    @Mock IBookingRepository bookings;
    @Mock IResourceBlockedSlotRepository blocks;
    @Mock MaintenanceGroupRepository maintenance;
    @InjectMocks WorkspaceSearchAvailability search;

    private WorkspaceModel workspace() { var w = new WorkspaceModel(); w.setId(18L); return w; }
    private WorkspaceOperatingHourModel hours(WorkspaceModel w, int day, String open, String close) {
        var h = new WorkspaceOperatingHourModel(); h.setWorkspace(w); h.setId(new WorkspaceOperatingHourModel.Key(w.getId(), day));
        h.setOpenTime(LocalTime.parse(open)); h.setCloseTime(LocalTime.parse(close)); return h;
    }
    private BookableResourceModel seat(WorkspaceModel w, long id) {
        var type = new ResourceTypeModel(); type.setCategory(ResourceCategory.DESK);
        var floor = new FloorPlanModel(); floor.setWorkspace(w);
        var seat = new BookableResourceModel(); seat.setId(id); seat.setFloorPlan(floor); seat.setResourceType(type); return seat;
    }
    private Set<Long> find(WorkspaceModel w, String start, String end) {
        return search.matching(List.of(w), LocalDateTime.parse(start), LocalDateTime.parse(end), null);
    }

    @Test void startingAtClosingTimeDoesNotMatchEvenWhenNextDayOpensAtMidnight() {
        var w = workspace();
        when(hours.findByWorkspaceIdIn(anyCollection())).thenReturn(List.of(
                hours(w, 3, "00:00", "23:30"), hours(w, 4, "00:00", "23:59")));
        assertThat(find(w, "2026-11-25T23:30:00", "2026-11-26T00:00:00")).isEmpty();
    }

    @Test void endingExactlyAtClosingTimeMatchesWhenASeatIsFree() {
        var w = workspace();
        when(hours.findByWorkspaceIdIn(anyCollection())).thenReturn(List.of(hours(w, 3, "00:00", "23:30")));
        when(resources.findAvailableResourcesByWorkspaceIds(anyCollection())).thenReturn(List.of(seat(w, 10)));
        assertThat(find(w, "2026-11-25T23:00:00", "2026-11-25T23:30:00")).containsExactly(18L);
    }

    @Test void bookedHeldOrIndividuallyMaintainedSeatsDoNotMakeAWorkspaceAvailable() {
        var w = workspace();
        when(hours.findByWorkspaceIdIn(anyCollection())).thenReturn(List.of(hours(w, 3, "08:00", "20:00")));
        when(resources.findAvailableResourcesByWorkspaceIds(anyCollection())).thenReturn(List.of(seat(w, 10), seat(w, 11)));
        when(bookings.findSearchOccupiedResourceIds(anyCollection(), any(), any(), any())).thenReturn(Set.of(10L));
        when(blocks.findSearchBlockedResourceIds(anyCollection(), any(), any())).thenReturn(Set.of(11L));
        assertThat(find(w, "2026-11-25T09:00:00", "2026-11-25T10:00:00")).isEmpty();
    }

    @Test void holidayAndWholeWorkspaceMaintenanceExcludeOtherwiseOpenWorkspaces() {
        var w = workspace();
        when(hours.findByWorkspaceIdIn(anyCollection())).thenReturn(List.of(hours(w, 3, "08:00", "20:00")));
        w.getHolidayCodes().add("NEW_YEAR");
        w.getHolidaySchedules().put("NEW_YEAR", new WorkspaceHolidayDates(LocalDate.parse("2026-11-25"), LocalDate.parse("2026-11-25")));
        assertThat(find(w, "2026-11-25T09:00:00", "2026-11-25T10:00:00")).isEmpty();
        w.getHolidayCodes().clear(); w.getHolidaySchedules().clear();
        when(maintenance.wholeWorkspaceOverlappingIds(anyCollection(), any(), any())).thenReturn(Set.of(18L));
        assertThat(find(w, "2026-11-25T09:00:00", "2026-11-25T10:00:00")).isEmpty();
    }

    @Test void aGenuineFullDayScheduleSupportsMidnightAndClosedDaysStayExcluded() {
        var w = workspace(); var h = hours(w, 3, "00:00", "00:00"); h.setFullDay(true);
        when(hours.findByWorkspaceIdIn(anyCollection())).thenReturn(List.of(h));
        when(resources.findAvailableResourcesByWorkspaceIds(anyCollection())).thenReturn(List.of(seat(w, 10)));
        assertThat(find(w, "2026-11-25T23:30:00", "2026-11-26T00:00:00")).containsExactly(18L);
        h.setClosed(true);
        assertThat(find(w, "2026-11-25T23:30:00", "2026-11-26T00:00:00")).isEmpty();
    }
}
