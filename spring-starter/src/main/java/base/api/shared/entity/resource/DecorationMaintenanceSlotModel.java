package base.api.shared.entity.resource;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import lombok.Getter;
import lombok.Setter;

@Getter @Setter @Entity @Table(name="decoration_maintenance_slot")
public class DecorationMaintenanceSlotModel {
    @Id @GeneratedValue(strategy=GenerationType.IDENTITY) private Long id;
    @ManyToOne(fetch=FetchType.LAZY, optional=false) @JoinColumn(name="floor_plan_id") private FloorPlanModel floorPlan;
    @Column(name="decoration_id",nullable=false,length=64) private String decorationId;
    @Column(name="start_time",nullable=false) private LocalDateTime startTime;
    @Column(name="end_time",nullable=false) private LocalDateTime endTime;
    @Column(nullable=false,length=255) private String reason;
}
