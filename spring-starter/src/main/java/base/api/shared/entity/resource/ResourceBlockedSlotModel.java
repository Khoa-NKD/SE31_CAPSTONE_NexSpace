package base.api.shared.entity.resource;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

import lombok.Getter;
import lombok.Setter;

import org.hibernate.annotations.Check;

import java.time.LocalDateTime;

/**
 * Khoá lịch 1 chỗ (bảo trì, sự kiện riêng...). Khoá cả khu = nhiều dòng; gỡ khoá = xoá dòng + ghi
 * Audit_Log.
 */
@Getter
@Setter
@Entity
@Table(
        name = "resource_blocked_slot",
        indexes = {@Index(name = "ix_rbs_resource_time", columnList = "resource_id, start_time")})
@Check(name = "ck_rbs_time", constraints = "end_time > start_time")
public class ResourceBlockedSlotModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "resource_id", nullable = false)
    private BookableResourceModel resource;

    @Column(name = "start_time", nullable = false)
    private LocalDateTime startTime;

    @Column(name = "end_time", nullable = false)
    private LocalDateTime endTime;

    private String reason;

    @jakarta.persistence.Enumerated(jakarta.persistence.EnumType.STRING)
    @org.hibernate.annotations.JdbcTypeCode(org.hibernate.type.SqlTypes.VARCHAR)
    @Column(name = "block_type", nullable = false, length = 20)
    private base.api.shared.enums.ResourceBlockType blockType =
            base.api.shared.enums.ResourceBlockType.BLOCKED;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "created_by", nullable = false)
    private UserModel createdBy;
}
