package base.api.feature.workspace.service;

import base.api.feature.operations.repository.MaintenanceGroupRepository;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.workspace.WorkspaceModel;
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

    /** Caller holds the workspace write lock, shared with reservation creation's workspace read lock. */
    public void saveSelection(WorkspaceModel workspace,Set<String> selected) {
        if(selected==null)return;
        if(!VietnamHolidays.NAMES.keySet().containsAll(selected))throw new BadRequestException("Tên ngày lễ không hợp lệ.");
        var added=new HashSet<>(selected);added.removeAll(workspace.getHolidayCodes());
        var now=LocalDateTime.now(VietnamHolidays.ZONE);
        for(var period:VietnamHolidays.periods(added,now.getYear(),VietnamHolidays.publishedThroughYear(),true)) {
            if(!period.end().isAfter(now))continue;
            long count=em.createQuery("select count(b) from BookingModel b where b.workspace.id=:id and b.startTime<:to and b.endTime>:from and (b.status in :confirmed or (b.status in :pending and (b.holdExpiresAt is null or b.holdExpiresAt>:now)))",Long.class)
                .setParameter("id",workspace.getId()).setParameter("from",period.start()).setParameter("to",period.end())
                .setParameter("now",now).setParameter("confirmed",List.of(BookingStatus.CONFIRMED,BookingStatus.CHECKED_IN))
                .setParameter("pending",List.of(BookingStatus.PENDING_PAYMENT,BookingStatus.PENDING_APPROVAL)).getSingleResult();
            if(count>0)throw new ConflictException("Không thể nghỉ "+period.name()+": đang có booking hoặc giữ chỗ trùng ngày nghỉ.");
        }
        workspace.getHolidayCodes().clear();workspace.getHolidayCodes().addAll(selected);
    }
    public void validate(Long workspaceId,LocalDateTime start,LocalDateTime end) {
        var codes=new HashSet<>(em.createQuery("select code from WorkspaceModel w join w.holidayCodes code where w.id=:id",String.class).setParameter("id",workspaceId).getResultList());
        VietnamHolidays.validate(codes,start,end);
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
                try {VietnamHolidays.validate(workspace.getHolidayCodes(),candidate,candidate.plusNanos(1));}
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
