package base.api.feature.workspace.service;

import base.api.feature.operations.repository.MaintenanceGroupRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceHolidayDates;
import base.api.feature.workspace.dto.WorkspaceHolidayScheduleDto;
import base.api.shared.enums.BookingStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import java.time.*;
import java.util.*;

@Service
@RequiredArgsConstructor
public class WorkspaceHolidayService {
    @PersistenceContext private EntityManager em;
    private final IWorkspaceOperatingHourRepository hours;
    private final MaintenanceGroupRepository maintenance;

    /** Caller holds the workspace write lock, also consulted by reservation creation. */
    public void saveSelection(WorkspaceModel workspace, Set<String> selected,
            List<WorkspaceHolidayScheduleDto> schedules) {
        if (selected == null && schedules == null) return;
        var codes = new HashSet<>(selected == null ? workspace.getHolidayCodes() : selected);
        var dates = new LinkedHashMap<>(workspace.getHolidaySchedules());
        if (schedules != null) {
            if (schedules.size() > VietnamHolidays.NAMES.size()) {
                throw new BadRequestException("Chỉ chọn tối đa 6 dịp lễ.");
            }
            dates.clear();
            for (var schedule : schedules) {
                if (schedule == null || !VietnamHolidays.NAMES.containsKey(schedule.code())
                        || schedule.startDate() == null || schedule.endDate() == null
                        || schedule.endDate().isBefore(schedule.startDate())
                        || schedule.startDate().getYear() < 1000 || schedule.endDate().getYear() > 9999) {
                    throw new BadRequestException("Chọn ngày nghỉ hợp lệ; ngày kết thúc không được trước ngày bắt đầu.");
                }
                if (dates.putIfAbsent(schedule.code(),
                        new WorkspaceHolidayDates(schedule.startDate(), schedule.endDate())) != null) {
                    throw new BadRequestException("Mỗi dịp lễ chỉ có một lịch nghỉ.");
                }
            }
            if (selected != null && !codes.equals(dates.keySet())) {
                throw new BadRequestException("Mỗi dịp lễ đã chọn phải có đủ ngày nghỉ.");
            }
            codes = new HashSet<>(dates.keySet());
        }
        if (!VietnamHolidays.NAMES.keySet().containsAll(codes)) {
            throw new BadRequestException("Tên ngày lễ không hợp lệ.");
        }
        dates.keySet().retainAll(codes);
        var proposed = new WorkspaceModel();
        proposed.setHolidayCodes(codes);
        proposed.setHolidaySchedules(dates);
        var now = LocalDateTime.now(VietnamHolidays.ZONE);
        // Include manual dates in any year; legacy annual selections retain their published calendar.
        var periods = configuredPeriods(proposed, now.getYear());
        var previous = configuredPeriods(workspace, now.getYear());
        for (var period : periods) {
            if (!period.end().isAfter(now) || previous.contains(period)) continue;
            long count = em.createQuery("select count(b) from BookingModel b where b.workspace.id=:id and b.startTime<:to and b.endTime>:from and (b.status in :confirmed or (b.status in :pending and (b.holdExpiresAt is null or b.holdExpiresAt>:now)))", Long.class)
                    .setParameter("id", workspace.getId()).setParameter("from", period.start()).setParameter("to", period.end())
                    .setParameter("now", now).setParameter("confirmed", List.of(BookingStatus.CONFIRMED, BookingStatus.CHECKED_IN))
                    .setParameter("pending", List.of(BookingStatus.PENDING_PAYMENT, BookingStatus.PENDING_APPROVAL)).getSingleResult();
            if (count > 0) throw new ConflictException("Không thể nghỉ " + period.name() + ": đang có booking hoặc giữ chỗ trùng ngày nghỉ.");
        }
        workspace.getHolidayCodes().clear();
        workspace.getHolidayCodes().addAll(codes);
        workspace.getHolidaySchedules().clear();
        workspace.getHolidaySchedules().putAll(dates);
    }

    private List<VietnamHolidays.Period> configuredPeriods(WorkspaceModel workspace, int currentYear) {
        var periods = new ArrayList<VietnamHolidays.Period>();
        var legacy = new HashSet<>(workspace.getHolidayCodes());
        legacy.removeAll(workspace.getHolidaySchedules().keySet());
        periods.addAll(VietnamHolidays.periods(legacy, currentYear, VietnamHolidays.publishedThroughYear(), false));
        workspace.getHolidaySchedules().forEach((code, dates) -> periods.add(new VietnamHolidays.Period(
                code, VietnamHolidays.NAMES.get(code), dates.getStartDate().atStartOfDay(),
                dates.getEndDate().plusDays(1).atStartOfDay())));
        return periods;
    }

    public void validate(Long workspaceId, LocalDateTime start, LocalDateTime end) {
        var workspace = em.find(WorkspaceModel.class, workspaceId);
        if (workspace == null) throw new BadRequestException("Không tìm thấy không gian.");
        VietnamHolidays.validate(workspace, start, end);
    }
    public VietnamHolidays.Closure withReopening(WorkspaceModel workspace,VietnamHolidays.Closure closure) {
        var schedule=hours.findByWorkspaceIdOrderByDayOfWeekAsc(workspace.getId());
        var blocks=maintenance.overlapping(workspace.getId(),closure.end(),closure.end().plusDays(370)).stream().filter(g->g.isWholeWorkspace()).toList();
        LocalDateTime reopening=null;
        search:for(var day=closure.end().toLocalDate().minusDays(1);!day.isAfter(closure.end().toLocalDate().plusDays(370));day=day.plusDays(1)) {
            int weekday=day.getDayOfWeek().getValue();
            var row=schedule.stream().filter(h->h.getId().getDayOfWeek()==weekday).findFirst().orElse(null);
            if(row==null||row.isClosed())continue;
            var from=row.isFullDay()?day.atStartOfDay():row.getOpenTime()==null?null:day.atTime(row.getOpenTime());
            var to=row.isFullDay()?day.plusDays(1).atStartOfDay():row.getCloseTime()==null?null:day.plusDays(row.isClosesNextDay()?1:0).atTime(row.getCloseTime());
            if(from==null||to==null||!to.isAfter(closure.end()))continue;
            var candidate=from.isBefore(closure.end())?closure.end():from;
            while(candidate.isBefore(to)) {
                try {VietnamHolidays.validate(workspace,candidate,candidate.plusNanos(1));}
                catch(BadRequestException closed) {candidate=candidate.toLocalDate().plusDays(1).atStartOfDay();continue;}
                var time=candidate;
                var block=blocks.stream().filter(g->!time.isBefore(g.getStartTime())&&time.isBefore(g.getEndTime())).findFirst().orElse(null);
                if(block!=null) {candidate=block.getEndTime();continue;}
                reopening=candidate;break search;
            }
        }
        return new VietnamHolidays.Closure(closure.names(),closure.start(),closure.end(),reopening);
    }
}
