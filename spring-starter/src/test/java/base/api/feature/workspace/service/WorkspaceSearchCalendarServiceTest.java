package base.api.feature.workspace.service;

import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.workspace.dto.request.PublicWorkspaceFilterRequestDto;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.resource.FloorPlanModel;
import base.api.shared.entity.resource.ResourceTypeModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.entity.workspace.WorkspaceOperatingHourModel;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.exception.BadRequestException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.PageImpl;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceSearchCalendarServiceTest {
    @Mock IWorkspaceRepository workspaces;
    @Mock IWorkspaceOperatingHourRepository hours;
    @Mock IBookableResourceRepository resources;
    @Mock EntityManager em;
    @InjectMocks WorkspaceSearchCalendarService calendar;

    @SuppressWarnings("unchecked")
    private void rows(String entity, List<Object[]> rows) {
        var query = (TypedQuery<Object[]>) mock(TypedQuery.class, RETURNS_SELF);
        when(query.getResultList()).thenReturn(rows);
        when(em.createQuery(contains(entity), eq(Object[].class))).thenReturn(query);
    }

    @Test void bookedMorningAndAfternoonSeatsDoNotCombineIntoOneAvailableDay() {
        var workspace = new WorkspaceModel(); workspace.setId(18L);
        var opening = new WorkspaceOperatingHourModel(); opening.setWorkspace(workspace);
        opening.setId(new WorkspaceOperatingHourModel.Key(18L, 1));
        opening.setOpenTime(LocalTime.of(8, 0)); opening.setCloseTime(LocalTime.of(20, 0));
        var type = new ResourceTypeModel(); type.setCategory(ResourceCategory.DESK);
        var floor = new FloorPlanModel(); floor.setWorkspace(workspace);
        var a = new BookableResourceModel(); a.setId(10L); a.setFloorPlan(floor); a.setResourceType(type);
        var b = new BookableResourceModel(); b.setId(11L); b.setFloorPlan(floor); b.setResourceType(type);
        when(workspaces.searchPublic(any(), isNull(), any())).thenReturn(new PageImpl<>(List.of(workspace)));
        when(hours.findByWorkspaceIdIn(anyCollection())).thenReturn(List.of(opening));
        when(resources.findAvailableResourcesByWorkspaceIds(anyCollection())).thenReturn(List.of(a, b));
        var start = LocalDateTime.parse("2030-01-07T08:00:00");
        rows("MaintenanceGroupModel", List.of());
        rows("BookingModel", List.of(new Object[]{10L, null, start.plusHours(4), start.plusHours(12)},
                new Object[]{11L, null, start, start.plusHours(4)}));
        rows("ResourceBlockedSlotModel", List.of());
        var result = calendar.calendar(LocalDate.parse("2030-01-07"), LocalDate.parse("2030-01-07"), null, new PublicWorkspaceFilterRequestDto());
        assertThat(result.intervals()).hasSize(2);
        assertThat(result.intervals().get(0).end()).isEqualTo(start.plusHours(4));
        assertThat(result.intervals().get(1).start()).isEqualTo(start.plusHours(4));
    }

    @Test void invalidOrUnboundedRangesAreRejectedBeforeReadingTheCatalog() {
        var from = LocalDate.parse("2030-01-01");
        assertThatThrownBy(() -> calendar.calendar(from, from.plusDays(91), null, new PublicWorkspaceFilterRequestDto()))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> calendar.calendar(from, from.minusDays(1), null, new PublicWorkspaceFilterRequestDto()))
                .isInstanceOf(BadRequestException.class);
        verifyNoInteractions(workspaces, resources, hours, em);
    }
}
