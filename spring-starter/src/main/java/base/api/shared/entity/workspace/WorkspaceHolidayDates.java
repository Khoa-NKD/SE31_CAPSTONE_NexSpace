package base.api.shared.entity.workspace;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import java.time.LocalDate;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

/** Both dates are inclusive local calendar dates in Asia/Ho_Chi_Minh. */
@Embeddable
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
public class WorkspaceHolidayDates {
    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;
}
