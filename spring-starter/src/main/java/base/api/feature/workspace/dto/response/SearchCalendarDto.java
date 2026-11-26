package base.api.feature.workspace.dto.response;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** Public-safe continuous availability windows; every window belongs to one real bookable resource. */
public record SearchCalendarDto(LocalDate from, LocalDate to, String timezone,
        LocalDateTime generatedAt, List<Interval> intervals) {
    public record Interval(LocalDateTime start, LocalDateTime end) {}
}
