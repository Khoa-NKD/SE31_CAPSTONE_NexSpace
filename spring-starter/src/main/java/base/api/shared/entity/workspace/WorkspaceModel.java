package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;

/**
 * Không gian làm việc. 1 vòng đời status duy nhất (gộp review/operating/moderation).
 * Hiển thị/đặt được = status ACTIVE AND Organizer_Profile APPROVED.
 */
@Getter
@Setter
@Entity
@Table(name = "workspace", indexes = {
        @Index(name = "ix_workspace_organizer", columnList = "organizer_id, created_at"),
        @Index(name = "ix_workspace_discovery", columnList = "city, district"),
        @Index(name = "ix_workspace_review_queue", columnList = "status, submitted_at")
})
public class WorkspaceModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false)
    private UserModel organizer;

    /** Được NULL khi Draft. */
    private String name;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(length = 30)
    private WorkspaceCategory category;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(length = 500)
    private String address;

    @Column(length = 100)
    private String district;

    @Column(length = 100)
    private String city;

    @Column(precision = 10, scale = 8)
    private BigDecimal latitude;

    @Column(precision = 11, scale = 8)
    private BigDecimal longitude;

    @Column(name = "area_sqm", precision = 10, scale = 2)
    private BigDecimal areaSqm;

    @Column(name = "support_phone", length = 20)
    private String supportPhone;

    @Column(name = "entry_instructions", length = 1000)
    private String entryInstructions;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "booking_confirmation_mode", nullable = false, length = 20)
    private BookingConfirmationMode bookingConfirmationMode = BookingConfirmationMode.INSTANT;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private WorkspaceStatus status = WorkspaceStatus.DRAFT;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private UserModel reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    /** Lý do từ chối hoặc lý do đình chỉ (BR-07). */
    @Column(name = "review_feedback", length = 500)
    private String reviewFeedback;

    /** NOT NULL = đang được Admin ghim nổi bật. */
    @Column(name = "featured_order")
    private Integer featuredOrder;

    @Column(name = "featured_until")
    private LocalDateTime featuredUntil;
}
