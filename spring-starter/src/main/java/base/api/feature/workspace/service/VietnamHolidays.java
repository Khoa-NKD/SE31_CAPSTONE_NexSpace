package base.api.feature.workspace.service;

import base.api.shared.exception.BadRequestException;
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
    public static Set<String> activeCodes(LocalDate day) {
        var result=new HashSet<String>();
        for(var p:periods(NAMES.keySet(),day.getYear(),day.getYear(),false))
            if(!day.atStartOfDay().isBefore(p.start())&&day.atStartOfDay().isBefore(p.end()))result.add(p.code());
        return result.isEmpty()?Set.of("NONE"):result;
    }
    public static void validate(Set<String> codes,LocalDateTime start,LocalDateTime end) {
        if(codes==null||codes.isEmpty())return;
        for(var p:periods(codes,start.getYear(),end.minusNanos(1).getYear(),true))
            if(start.isBefore(p.end())&&end.isAfter(p.start()))throw new BadRequestException("Không gian nghỉ "+p.name()+" trong khoảng thời gian đã chọn.");
    }
    public static Closure current(Set<String> codes) {
        var now=LocalDateTime.now(ZONE);
        var periods=periods(codes,now.getYear(),now.getYear()+1,false);
        var active=periods.stream().filter(p->!now.isBefore(p.start())&&now.isBefore(p.end())).findFirst().orElse(null);
        if(active==null)return null;
        var end=active.end();var names=new LinkedHashSet<String>();names.add(active.name());
        for(var p:periods)if(!p.start().isAfter(end)&&p.end().isAfter(active.start())) {if(p.end().isAfter(end))end=p.end();names.add(p.name());}
        return new Closure(List.copyOf(names),active.start(),end,null);
    }
}
