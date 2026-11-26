package base.api.feature.workspace.service;

import base.api.feature.workspace.service.OperatingHours.Window;
import java.time.LocalDateTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class SearchCalendarWindowsTest {
    private LocalDateTime at(String time) { return LocalDateTime.parse("2030-01-07T" + time + ":00"); }
    private Window window(String from, String to) { return new Window(at(from), at(to)); }

    @Test void blocksSplitAvailabilityWithoutBlockingTouchingIntervals() {
        var result = SearchCalendarWindows.subtract(List.of(window("08:00", "20:00")),
                List.of(window("12:00", "14:00")), at("00:00"), at("23:59"));
        assertThat(result).containsExactly(window("08:00", "12:00"), window("14:00", "20:00"));
    }
    @Test void overlappingBlocksAndShortFragmentsDoNotInventBookableTime() {
        var result = SearchCalendarWindows.subtract(List.of(window("08:00", "20:00")),
                List.of(window("08:10", "12:00"), window("11:00", "19:45")), at("00:00"), at("23:59"));
        assertThat(result).isEmpty();
    }
    @Test void pruningDoesNotJoinAdjacentWindowsFromDifferentResources() {
        assertThat(SearchCalendarWindows.prune(List.of(window("08:00", "12:00"), window("12:00", "20:00"))))
                .containsExactly(window("08:00", "12:00"), window("12:00", "20:00"));
    }
    @Test void pruningOnlyRemovesFullyContainedWindows() {
        assertThat(SearchCalendarWindows.prune(List.of(window("08:00", "12:00"), window("08:00", "20:00"), window("19:00", "23:00"))))
                .containsExactly(window("08:00", "20:00"), window("19:00", "23:00"));
    }
    @Test void consecutiveFullDaysMergeOnlyWithinTheSameResourcesOpeningSchedule() {
        var midnight = LocalDateTime.parse("2030-01-08T00:00:00");
        assertThat(SearchCalendarWindows.merge(List.of(new Window(at("00:00"), midnight),
                new Window(midnight, midnight.plusDays(1)))))
                .containsExactly(new Window(at("00:00"), midnight.plusDays(1)));
    }
}
