package base.api.shared.entity.review;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.ReviewStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToOne;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.Setter;
import org.hibernate.annotations.Check;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Đánh giá — mỗi booking hoàn thành 1 đánh giá.
 */
@Getter
@Setter
@Entity
@Table(name = "customer_review", indexes = {
        @Index(name = "ix_customer_review_public", columnList = "workspace_id, status, created_at")
})
@Check(name = "ck_customer_review_rating", constraints = "rating BETWEEN 1 AND 5")
public class CustomerReviewModel extends BaseModel {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private BookingModel booking;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    private WorkspaceModel workspace;

    @Column(nullable = false, columnDefinition = "TINYINT")
    private Integer rating;

    /** JSON điểm theo tiêu chí. */
    @Column(name = "dimension_ratings", columnDefinition = "TEXT")
    private String dimensionRatings;

    @Column(columnDefinition = "TEXT")
    private String content;

    /** JSON mảng URL. */
    @Column(name = "photo_urls", columnDefinition = "TEXT")
    private String photoUrls;

    @Column(name = "organizer_reply", columnDefinition = "TEXT")
    private String organizerReply;

    /** Giữ lại kể cả khi xoá phản hồi => chỉ trả lời 1 lần (BR-25). */
    @Column(name = "replied_at")
    private LocalDateTime repliedAt;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private ReviewStatus status = ReviewStatus.PUBLISHED;

    @Column(name = "moderation_reason", length = 500)
    private String moderationReason;
}
