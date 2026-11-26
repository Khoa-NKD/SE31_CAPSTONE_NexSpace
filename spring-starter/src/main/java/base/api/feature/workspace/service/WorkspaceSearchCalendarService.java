package base.api.feature.workspace.service;

import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.workspace.dto.request.PublicWorkspaceFilterRequestDto;
import base.api.feature.workspace.dto.response.SearchCalendarDto;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.feature.workspace.service.OperatingHours.Window;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Transactional(readOnly = true)
public class WorkspaceSearchCalendarService {
    private final IWorkspaceRepository workspaces;
    private final IWorkspaceOperatingHourRepository hours;
    private final IBookableResourceRepository resources;
    private final EntityManager em;

    public SearchCalendarDto calendar(LocalDate from, LocalDate to, Long workspaceId,
            PublicWorkspaceFilterRequestDto filters) {
        if (from == null || to == null || from.getYear() < 1000 || to.isAfter(LocalDate.of(9999, 12, 30))
                || to.isBefore(from) || ChronoUnit.DAYS.between(from, to) > 90) {
            throw new BadRequestException("Chọn khoảng lịch hợp lệ, tối đa 90 ngày.");
        }
        var start = from.atStartOfDay(); var end = to.plusDays(1).atStartOfDay();
        var now = LocalDateTime.now(VietnamHolidays.ZONE);
        var candidates = workspaces.searchPublic(WorkspaceStatus.ACTIVE, filters.normalizedSearch(), Pageable.unpaged())
                .stream().filter(w -> workspaceId == null || workspaceId.equals(w.getId()))
                .filter(w -> filters.getCategory() == null || filters.getCategory() == w.getCategory())
                .filter(w -> matches(w.getCity(), filters.getCity()) && matches(w.getDistrict(), filters.getDistrict())).toList();
        if (candidates.isEmpty()) return result(from, to, now, List.of());
        var ids = candidates.stream().map(WorkspaceModel::getId).toList();
        var groupedHours = hours.findByWorkspaceIdIn(ids).stream().collect(Collectors.groupingBy(h -> h.getWorkspace().getId()));
        var seats = resources.findAvailableResourcesByWorkspaceIds(ids).stream()
                .filter(r -> r.getParentRoom() == null && r.getResourceType() != null && r.getResourceType().isActive())
                .filter(r -> filters.getResourceCategories() == null || filters.getResourceCategories().isEmpty()
                        || filters.getResourceCategories().contains(r.getResourceType().getCategory())).toList();

        var wholeClosures = new HashMap<Long, List<Window>>();
        var resourceClosures = new HashMap<Long, List<Window>>();
        var groups = em.createQuery("select g.workspace.id,g.startTime,g.endTime from MaintenanceGroupModel g where g.workspace.id in :ids and g.cancelled=false and g.wholeWorkspace=true and g.startTime<:to and g.endTime>:from", Object[].class)
                .setParameter("ids", ids).setParameter("from", start).setParameter("to", end).getResultList();
        for (var row : groups) append(wholeClosures, (Long) row[0], new Window((LocalDateTime) row[1], (LocalDateTime) row[2]));
        var booked = em.createQuery("select r.id,p.id,b.startTime,b.endTime from BookingModel b join b.resource r left join r.parentRoom p where b.workspace.id in :ids and b.startTime<:to and b.endTime>:from and (b.status in (base.api.shared.enums.BookingStatus.CONFIRMED,base.api.shared.enums.BookingStatus.CHECKED_IN) or (b.status in (base.api.shared.enums.BookingStatus.PENDING_PAYMENT,base.api.shared.enums.BookingStatus.PENDING_APPROVAL) and (b.holdExpiresAt is null or b.holdExpiresAt>:now)))", Object[].class)
                .setParameter("ids", ids).setParameter("from", start).setParameter("to", end).setParameter("now", now).getResultList();
        var blocked = em.createQuery("select r.id,p.id,b.startTime,b.endTime from ResourceBlockedSlotModel b join b.resource r left join r.parentRoom p where r.floorPlan.workspace.id in :ids and b.startTime<:to and b.endTime>:from", Object[].class)
                .setParameter("ids", ids).setParameter("from", start).setParameter("to", end).getResultList();
        for (var rows : List.of(booked, blocked)) for (var row : rows) {
            var window = new Window((LocalDateTime) row[2], (LocalDateTime) row[3]);
            append(resourceClosures, (Long) row[0], window);
            if (row[1] != null) append(resourceClosures, (Long) row[1], window);
        }

        var workspaceOpenings = new HashMap<Long, List<Window>>();
        for (var workspace : candidates) {
            var closed = new ArrayList<>(wholeClosures.getOrDefault(workspace.getId(), List.of()));
            try {
                for (var holiday : VietnamHolidays.periods(workspace, from.getYear(), to.getYear(), true)) {
                    closed.add(new Window(holiday.start(), holiday.end()));
                }
            } catch (BadRequestException unknownCalendar) { continue; }
            workspaceOpenings.put(workspace.getId(), SearchCalendarWindows.subtract(
                    OperatingHours.windows(groupedHours.get(workspace.getId()), start, end), closed, start, end));
        }
        var available = new ArrayList<Window>();
        for (var seat : seats) {
            available.addAll(SearchCalendarWindows.subtract(
                    workspaceOpenings.getOrDefault(seat.getFloorPlan().getWorkspace().getId(), List.of()),
                    resourceClosures.getOrDefault(seat.getId(), List.of()), start, end));
        }
        return result(from, to, now, SearchCalendarWindows.prune(available));
    }

    private static void append(Map<Long, List<Window>> map, Long id, Window window) {
        map.computeIfAbsent(id, ignored -> new ArrayList<>()).add(window);
    }
    private static boolean matches(String value, String filter) {
        return filter == null || filter.isBlank() || value != null && value.toLowerCase(Locale.ROOT).contains(filter.trim().toLowerCase(Locale.ROOT));
    }
    private static SearchCalendarDto result(LocalDate from, LocalDate to, LocalDateTime now, List<Window> windows) {
        return new SearchCalendarDto(from, to, VietnamHolidays.ZONE.getId(), now,
                windows.stream().map(w -> new SearchCalendarDto.Interval(w.start(), w.end())).toList());
    }
}
