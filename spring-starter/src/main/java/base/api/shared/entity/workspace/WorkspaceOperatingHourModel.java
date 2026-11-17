package base.api.shared.entity.workspace;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import jakarta.persistence.EmbeddedId;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.MapsId;
import jakarta.persistence.Table;
import lombok.AllArgsConstructor;
import lombok.EqualsAndHashCode;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

import java.io.Serializable;
import java.time.LocalTime;

/**
 * Giờ mở cửa theo thứ (1 = Thứ 2 ... 7 = Chủ nhật). Mở 24h: 00:00 -> 23:59.
 */
@Getter
@Setter
@Entity
@Table(name = "workspace_operating_hour")
@Check(name = "ck_woh_valid", constraints = "is_closed = 1 OR close_time > open_time")
public class WorkspaceOperatingHourModel {

    @EmbeddedId
    private Key id = new Key();

    @MapsId("workspaceId")
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id")
    @OnDelete(action = OnDeleteAction.CASCADE)
    private WorkspaceModel workspace;

    @Column(name = "open_time")
    private LocalTime openTime;

    @Column(name = "close_time")
    private LocalTime closeTime;

    @Column(name = "is_closed", nullable = false)
    private boolean closed;

    @Getter
    @Setter
    @NoArgsConstructor
    @AllArgsConstructor
    @EqualsAndHashCode
    @Embeddable
    public static class Key implements Serializable {

        @Column(name = "workspace_id")
        private Long workspaceId;

        @Column(name = "day_of_week", columnDefinition = "TINYINT")
        private Integer dayOfWeek;
    }
}
