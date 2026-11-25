package base.api.feature.workspace.service;

import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.exception.BadRequestException;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

/** Validates continuous coverage of a half-open booking interval, including overnight windows. */
public final class OperatingHours {
    private OperatingHours() {}

    public static void validate(List<WorkspaceOperatingHourModel> hours, LocalDateTime start, LocalDateTime end) {
        if (!covers(hours, start, end)) {
            throw new BadRequestException("Khoảng đặt chỗ có thời gian ngoài giờ hoạt động của không gian.");
        }
    }

    public static boolean covers(List<WorkspaceOperatingHourModel> hours, LocalDateTime start, LocalDateTime end) {
        if (start == null || end == null || !end.isAfter(start) || hours == null || hours.isEmpty()) return false;
        var windows = new ArrayList<Window>();
        for (LocalDate date = start.toLocalDate().minusDays(1); !date.isAfter(end.toLocalDate()); date = date.plusDays(1)) {
            int day = date.getDayOfWeek().getValue();
            var row = hours.stream().filter(h -> h.getId() != null && Integer.valueOf(day).equals(h.getId().getDayOfWeek()))
                    .findFirst().orElse(null);
            if (row == null || row.isClosed()) continue;
            if (row.isFullDay()) {
                windows.add(new Window(date.atStartOfDay(), date.plusDays(1).atStartOfDay()));
            } else if (row.getOpenTime() != null && row.getCloseTime() != null) {
                windows.add(new Window(date.atTime(row.getOpenTime()),
                        date.plusDays(row.isClosesNextDay() ? 1 : 0).atTime(row.getCloseTime())));
            }
        }
        windows.sort(Comparator.comparing(Window::start));
        LocalDateTime covered = start;
        for (var window : windows) {
            if (window.start().isAfter(covered)) break;
            if (window.end().isAfter(covered)) covered = window.end();
            if (!covered.isBefore(end)) return true;
        }
        return false;
    }

    private record Window(LocalDateTime start, LocalDateTime end) {}
}
