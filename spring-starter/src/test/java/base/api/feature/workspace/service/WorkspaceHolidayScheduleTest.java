package base.api.feature.workspace.service;

import base.api.feature.operations.repository.MaintenanceGroupRepository;
import base.api.feature.workspace.dto.WorkspaceHolidayScheduleDto;
import base.api.feature.workspace.mapper.WorkspaceMapper;
import base.api.feature.workspace.repository.IWorkspaceOperatingHourRepository;
import base.api.shared.entity.workspace.WorkspaceHolidayDates;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import jakarta.persistence.EntityManager;
import jakarta.persistence.TypedQuery;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class WorkspaceHolidayScheduleTest {
    @Mock EntityManager em;
    @Mock IWorkspaceOperatingHourRepository hours;
    @Mock MaintenanceGroupRepository maintenance;
    @Mock TypedQuery<Long> countQuery;
    @InjectMocks WorkspaceHolidayService service;

    @BeforeEach void injectPersistenceContext() {
        org.springframework.test.util.ReflectionTestUtils.setField(service, "em", em);
    }

    private WorkspaceModel workspace() {
        var workspace = new WorkspaceModel();
        workspace.setId(18L);
        workspace.setStatus(WorkspaceStatus.ACTIVE);
        return workspace;
    }

    private WorkspaceHolidayScheduleDto schedule(String code, String start, String end) {
        return new WorkspaceHolidayScheduleDto(code, LocalDate.parse(start), LocalDate.parse(end));
    }

    private void bookings(long count) {
        when(em.createQuery(anyString(), eq(Long.class))).thenReturn(countQuery);
        when(countQuery.setParameter(anyString(), any())).thenReturn(countQuery);
        when(countQuery.getSingleResult()).thenReturn(count);
    }

    @Test void singleDayIncludesTheWholeDayAndAllowsTouchingBoundaries() {
        var workspace = workspace();
        bookings(0);
        service.saveSelection(workspace, Set.of("LUNAR_NEW_YEAR"),
                List.of(schedule("LUNAR_NEW_YEAR", "2090-02-07", "2090-02-07")));
        assertThatThrownBy(() -> VietnamHolidays.validate(workspace,
                LocalDateTime.parse("2090-02-07T23:59:00"), LocalDateTime.parse("2090-02-08T00:00:00")))
                .isInstanceOf(BadRequestException.class);
        assertThatCode(() -> VietnamHolidays.validate(workspace,
                LocalDateTime.parse("2090-02-06T23:00:00"), LocalDateTime.parse("2090-02-07T00:00:00")))
                .doesNotThrowAnyException();
        assertThatCode(() -> VietnamHolidays.validate(workspace,
                LocalDateTime.parse("2090-02-08T00:00:00"), LocalDateTime.parse("2090-02-08T01:00:00")))
                .doesNotThrowAnyException();
    }

    @Test void rangeIncludesLastDayAndDoesNotRepeatInAnotherYear() {
        var workspace = workspace();
        workspace.getHolidayCodes().add("NEW_YEAR");
        workspace.getHolidaySchedules().put("NEW_YEAR", new WorkspaceHolidayDates(
                LocalDate.parse("2090-01-02"), LocalDate.parse("2090-01-04")));
        assertThat(VietnamHolidays.current(workspace, LocalDateTime.parse("2090-01-04T23:59:59")).end())
                .isEqualTo(LocalDateTime.parse("2090-01-05T00:00:00"));
        assertThat(VietnamHolidays.current(workspace, LocalDateTime.parse("2090-01-05T00:00:00"))).isNull();
        assertThatCode(() -> VietnamHolidays.validate(workspace,
                LocalDateTime.parse("2091-01-01T10:00:00"), LocalDateTime.parse("2091-01-01T11:00:00")))
                .doesNotThrowAnyException();
        assertThat(workspace.getBaseStatus()).isEqualTo(WorkspaceStatus.ACTIVE);
        assertThat(WorkspaceMapper.toDetailDto(workspace, List.of()).getHolidaySchedules())
                .containsExactly(schedule("NEW_YEAR", "2090-01-02", "2090-01-04"));
    }

    @Test void conflictingBookingOrLiveHoldRejectsTheChangeWithoutReplacingOldDates() {
        var workspace = workspace();
        workspace.getHolidayCodes().add("LABOUR_DAY");
        var original = new WorkspaceHolidayDates(LocalDate.parse("2090-05-01"), LocalDate.parse("2090-05-01"));
        workspace.getHolidaySchedules().put("LABOUR_DAY", original);
        bookings(1);
        assertThatThrownBy(() -> service.saveSelection(workspace, Set.of("LABOUR_DAY"),
                List.of(schedule("LABOUR_DAY", "2090-05-01", "2090-05-03"))))
                .isInstanceOf(ConflictException.class).hasMessageContaining("booking hoặc giữ chỗ");
        assertThat(workspace.getHolidaySchedules().get("LABOUR_DAY")).isSameAs(original);
    }

    @Test void invalidRangesDuplicateCodesAndMissingDatesAreRejected() {
        var workspace = workspace();
        var valid = schedule("NEW_YEAR", "2090-01-01", "2090-01-01");
        assertThatThrownBy(() -> service.saveSelection(workspace, null,
                List.of(schedule("NEW_YEAR", "2090-01-02", "2090-01-01"))))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.saveSelection(workspace, null, List.of(valid, valid)))
                .isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.saveSelection(workspace, Set.of("NEW_YEAR"), List.of()))
                .isInstanceOf(BadRequestException.class);
        assertThat(workspace.getHolidayCodes()).isEmpty();
    }

    @Test void clearingSelectionRemovesCustomDatesWithoutChangingBaseStatus() {
        var workspace = workspace();
        workspace.setStatus(WorkspaceStatus.DRAFT);
        workspace.getHolidayCodes().add("NEW_YEAR");
        workspace.getHolidaySchedules().put("NEW_YEAR", new WorkspaceHolidayDates(
                LocalDate.parse("2090-01-01"), LocalDate.parse("2090-01-01")));
        service.saveSelection(workspace, Set.of(), List.of());
        assertThat(workspace.getHolidaySchedules()).isEmpty();
        assertThat(workspace.getHolidayCodes()).isEmpty();
        assertThat(workspace.getBaseStatus()).isEqualTo(WorkspaceStatus.DRAFT);
    }

    @Test void legacyAnnualSelectionsRemainReadable() {
        var workspace = workspace();
        workspace.getHolidayCodes().add("NEW_YEAR");
        assertThatThrownBy(() -> VietnamHolidays.validate(workspace,
                LocalDateTime.parse("2030-01-01T10:00:00"), LocalDateTime.parse("2030-01-01T11:00:00")))
                .isInstanceOf(BadRequestException.class);
    }
}
