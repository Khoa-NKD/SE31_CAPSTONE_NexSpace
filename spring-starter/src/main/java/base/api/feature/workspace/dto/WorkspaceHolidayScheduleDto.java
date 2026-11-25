package base.api.feature.workspace.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import java.time.LocalDate;

/** Equal dates represent a single day; otherwise the range includes both endpoints. */
public record WorkspaceHolidayScheduleDto(
        @NotBlank String code,
        @NotNull LocalDate startDate,
        @NotNull LocalDate endDate) {}
