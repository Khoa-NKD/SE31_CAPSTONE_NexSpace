package base.api.feature.workspace.service;

import base.api.feature.workspace.service.OperatingHours.Window;
import java.time.Duration;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;

final class SearchCalendarWindows {
    private SearchCalendarWindows() {}

    static List<Window> merge(List<Window> source) {
        var sorted = source.stream().filter(w -> w.end().isAfter(w.start()))
                .sorted(Comparator.comparing(Window::start)).toList();
        var merged = new ArrayList<Window>();
        for (var window : sorted) {
            if (merged.isEmpty() || window.start().isAfter(merged.get(merged.size() - 1).end())) {
                merged.add(window);
            } else {
                var previous = merged.remove(merged.size() - 1);
                merged.add(new Window(previous.start(), later(previous.end(), window.end())));
            }
        }
        return merged;
    }

    static List<Window> subtract(List<Window> openings, List<Window> blocked,
            LocalDateTime from, LocalDateTime to) {
        var result = new ArrayList<Window>();
        var closures = merge(blocked);
        for (var opening : merge(openings)) {
            var start = later(opening.start(), from);
            var end = earlier(opening.end(), to);
            if (!end.isAfter(start)) continue;
            for (var closure : closures) {
                if (!closure.end().isAfter(start)) continue;
                if (!closure.start().isBefore(end)) break;
                if (closure.start().isAfter(start)) add(result, start, earlier(closure.start(), end));
                start = later(start, closure.end());
                if (!start.isBefore(end)) break;
            }
            add(result, start, end);
        }
        return result;
    }

    /** Prune only contained windows; merging across resources could invent an impossible booking. */
    static List<Window> prune(List<Window> windows) {
        var ordered = windows.stream().sorted(Comparator.comparing(Window::start)
                .thenComparing(Window::end, Comparator.reverseOrder())).toList();
        var result = new ArrayList<Window>();
        LocalDateTime furthest = null;
        for (var window : ordered) {
            if (furthest == null || window.end().isAfter(furthest)) {
                result.add(window);
                furthest = window.end();
            }
        }
        return result;
    }

    private static void add(List<Window> windows, LocalDateTime start, LocalDateTime end) {
        if (Duration.between(start, end).compareTo(Duration.ofMinutes(30)) >= 0) windows.add(new Window(start, end));
    }
    private static LocalDateTime earlier(LocalDateTime a, LocalDateTime b) { return a.isBefore(b) ? a : b; }
    private static LocalDateTime later(LocalDateTime a, LocalDateTime b) { return a.isAfter(b) ? a : b; }
}
