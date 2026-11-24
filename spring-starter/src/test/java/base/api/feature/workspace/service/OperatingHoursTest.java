package base.api.feature.workspace.service;

import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import java.util.stream.IntStream;
import org.junit.jupiter.api.Test;
import static org.assertj.core.api.Assertions.assertThat;

class OperatingHoursTest {
    private static WorkspaceOperatingHourModel day(int day, String open, String close, boolean full) {
        var row = new WorkspaceOperatingHourModel();
        row.setId(new WorkspaceOperatingHourModel.Key(1L, day));
        row.setOpenTime(LocalTime.parse(open)); row.setCloseTime(LocalTime.parse(close));
        row.setFullDay(full); row.setClosesNextDay(!full && row.getCloseTime().isBefore(row.getOpenTime()));
        return row;
    }
    private static boolean covers(List<WorkspaceOperatingHourModel> rows, String start, String end) {
        return OperatingHours.covers(rows, LocalDateTime.parse(start), LocalDateTime.parse(end));
    }
    @Test void fullDayCoversMidnightMultipleDaysAndWeekBoundary() {
        var rows = IntStream.rangeClosed(1,7).mapToObj(d -> day(d,"00:00","00:00",true)).toList();
        assertThat(covers(rows,"2030-01-06T09:00","2030-01-08T09:00")).isTrue();
    }
    @Test void rejectsTwentyFourHourBookingWhenThereIsAnyClosedGap() {
        var rows = IntStream.rangeClosed(1,7).mapToObj(d -> day(d,"08:00","20:00",false)).toList();
        assertThat(covers(rows,"2030-01-07T09:00","2030-01-08T09:00")).isFalse();
        assertThat(covers(rows,"2030-01-07T08:00","2030-01-07T20:00")).isTrue();
        assertThat(covers(rows,"2030-01-07T08:00","2030-01-07T20:01")).isFalse();
    }
    @Test void overnightWindowCoversEarlyNextDayEvenWhenNextDayIsClosed() {
        var rows = List.of(day(1,"22:00","02:00",false));
        assertThat(covers(rows,"2030-01-07T23:00","2030-01-08T02:00")).isTrue();
        assertThat(covers(rows,"2030-01-08T00:30","2030-01-08T01:00")).isTrue();
        assertThat(covers(rows,"2030-01-08T01:30","2030-01-08T02:01")).isFalse();
    }
    @Test void adjacentWindowsMergeButMissingSchedulesNeverAllowBooking() {
        var rows = List.of(day(1,"20:00","02:00",false),day(2,"02:00","08:00",false));
        assertThat(covers(rows,"2030-01-07T22:00","2030-01-08T08:00")).isTrue();
        assertThat(covers(List.of(),"2030-01-07T09:00","2030-01-07T10:00")).isFalse();
        assertThat(covers(rows,"2030-01-07T22:00","2030-01-07T22:00")).isFalse();
    }
}
