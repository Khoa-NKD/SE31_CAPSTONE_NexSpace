package base.api.feature.workspace.service;

import base.api.shared.exception.BadRequestException;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.feature.workspace.dto.WorkspaceHolidayScheduleDto;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.core.io.ClassPathResource;
import java.time.*;
import java.util.*;

/** Authoritative holiday dates; weekend closures remain governed by each workspace's weekly hours. */
public final class VietnamHolidays {
    public static final ZoneId ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    public static final Map<String,String> NAMES = Map.of(
        "NEW_YEAR","Tết Dương lịch", "LUNAR_NEW_YEAR","Tết Nguyên đán", "HUNG_KINGS","Giỗ Tổ Hùng Vương",
        "REUNIFICATION","Ngày Chiến thắng", "LABOUR_DAY","Quốc tế Lao động", "NATIONAL_DAY","Quốc khánh");
    private static final JsonNode DATES;
    static {
        try (var stream = new ClassPathResource("workspace/vietnam-holidays.json").getInputStream()) {
            DATES = new ObjectMapper().readTree(stream);
        } catch (Exception failure) { throw new ExceptionInInitializerError(failure); }
    }
    private VietnamHolidays() {}
    public record Period(String code, String name, LocalDateTime start, LocalDateTime end) {}
    public record Closure(List<String> names, LocalDateTime start, LocalDateTime end, LocalDateTime reopensAt) {}
    public static int publishedThroughYear() { return 2027; }
    public static Period period(String code,int year) {
        LocalDate start;
        switch (code) {
            case "NEW_YEAR" -> start=LocalDate.of(year,1,1);
            case "REUNIFICATION" -> start=LocalDate.of(year,4,30);
            case "LABOUR_DAY" -> start=LocalDate.of(year,5,1);
            default -> {
                var row=DATES.path(String.valueOf(year)).path(code);
                if (row.isMissingNode()) throw new BadRequestException("Lịch nghỉ lễ năm "+year+" chưa được cập nhật. Chưa thể đặt khoảng thời gian này.");
                return new Period(code,NAMES.get(code),LocalDate.parse(row.path("start").asText()).atStartOfDay(),LocalDate.parse(row.path("end").asText()).atStartOfDay());
            }
        }
        return new Period(code,NAMES.get(code),start.atStartOfDay(),start.plusDays(1).atStartOfDay());
    }
    public static List<Period> periods(Set<String> codes,int firstYear,int lastYear,boolean strict) {
        var result=new ArrayList<Period>();
        if(codes==null)return result;
        for(int year=firstYear;year<=lastYear;year++)for(var code:codes) {
            try { result.add(period(code,year)); } catch(BadRequestException unavailable) {if(strict)throw unavailable;}
        }
        result.sort(Comparator.comparing(Period::start));return result;
    }
    /** Explicit dates replace the annual calendar for that code, including outside the entered year. */
    public static List<Period> periods(WorkspaceModel workspace, int firstYear, int lastYear, boolean strict) {
        var legacy = new HashSet<>(workspace.getHolidayCodes());
        legacy.removeAll(workspace.getHolidaySchedules().keySet());
        var result = periods(legacy, firstYear, lastYear, strict);
        workspace.getHolidaySchedules().forEach((code, dates) -> {
            if (workspace.getHolidayCodes().contains(code)) {
                result.add(new Period(code, NAMES.get(code), dates.getStartDate().atStartOfDay(),
                        dates.getEndDate().plusDays(1).atStartOfDay()));
            }
        });
        result.sort(Comparator.comparing(Period::start));
        return result;
    }

    public static List<WorkspaceHolidayScheduleDto> schedules(WorkspaceModel workspace) {
        return workspace.getHolidaySchedules().entrySet().stream()
                .filter(entry -> workspace.getHolidayCodes().contains(entry.getKey()))
                .sorted(Map.Entry.comparingByKey())
                .map(entry -> new WorkspaceHolidayScheduleDto(entry.getKey(),
                        entry.getValue().getStartDate(), entry.getValue().getEndDate())).toList();
    }

    public static Set<String> activeCodes(LocalDate day) {
        var result = new HashSet<String>();
        for (var period : periods(NAMES.keySet(), day.getYear(), day.getYear(), false)) {
            if (!day.atStartOfDay().isBefore(period.start()) && day.atStartOfDay().isBefore(period.end())) {
                result.add(period.code());
            }
        }
        return result.isEmpty() ? Set.of("NONE") : result;
    }

    public static void validate(Set<String> codes, LocalDateTime start, LocalDateTime end) {
        validatePeriods(periods(codes, start.getYear(), end.minusNanos(1).getYear(), true), start, end);
    }

    public static void validate(WorkspaceModel workspace, LocalDateTime start, LocalDateTime end) {
        validatePeriods(periods(workspace, start.getYear(), end.minusNanos(1).getYear(), true), start, end);
    }

    private static void validatePeriods(List<Period> periods, LocalDateTime start, LocalDateTime end) {
        for (var period : periods) {
            if (start.isBefore(period.end()) && end.isAfter(period.start())) {
                throw new BadRequestException("Không gian nghỉ " + period.name() + " trong khoảng thời gian đã chọn.");
            }
        }
    }

    public static Closure current(Set<String> codes) {
        var now = LocalDateTime.now(ZONE);
        return closure(periods(codes, now.getYear(), now.getYear() + 1, false), now);
    }

    public static Closure current(WorkspaceModel workspace) {
        return current(workspace, LocalDateTime.now(ZONE));
    }

    public static Closure current(WorkspaceModel workspace, LocalDateTime now) {
        return closure(periods(workspace, now.getYear(), now.getYear() + 1, false), now);
    }

    private static Closure closure(List<Period> periods, LocalDateTime now) {
        var active = periods.stream()
                .filter(period -> !now.isBefore(period.start()) && now.isBefore(period.end()))
                .findFirst().orElse(null);
        if (active == null) return null;
        var start = active.start();
        var end = active.end();
        var names = new LinkedHashSet<String>();
        // Sorted intervals merge adjacent holidays; a real gap ends the closure.
        for (var period : periods) {
            if (period.end().isBefore(start)) continue;
            if (period.start().isAfter(end)) break;
            if (period.end().isAfter(end)) end = period.end();
            if (period.start().isBefore(start)) start = period.start();
            names.add(period.name());
        }
        return new Closure(List.copyOf(names), start, end, null);
    }
}
