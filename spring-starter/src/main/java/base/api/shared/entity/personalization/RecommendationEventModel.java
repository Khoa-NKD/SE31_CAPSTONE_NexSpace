package base.api.shared.entity.personalization;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.RecommendationEventType;
import jakarta.persistence.AttributeOverride;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

/**
 * Chỉ ghi thêm. Nguồn số liệu CTR / tỉ lệ chuyển đổi gợi ý (M19-UC06).
 * requestKey nối Impression -> Click -> Booking của cùng 1 lần gợi ý.
 */
@Getter
@Setter
@Entity
@AttributeOverride(name = "createdAt", column = @Column(name = "occurred_at", updatable = false))
@Table(name = "recommendation_event", indexes = {
        @Index(name = "ix_recommendation_event_metrics", columnList = "event_type, occurred_at"),
        @Index(name = "ix_recommendation_event_request", columnList = "request_key")
})
public class RecommendationEventModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "customer_id")
    private UserModel customer;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private WorkspaceModel workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private BookingModel booking;

    @Column(name = "request_key", nullable = false, length = 100)
    private String requestKey;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "event_type", nullable = false, length = 20)
    private RecommendationEventType eventType;

    @Column(name = "rank_position")
    private Integer rankPosition;
}
