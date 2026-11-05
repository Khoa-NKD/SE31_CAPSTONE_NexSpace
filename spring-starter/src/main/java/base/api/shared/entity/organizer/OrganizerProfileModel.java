package base.api.shared.entity.organizer;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.BusinessType;
import base.api.shared.enums.OrganizerProfileStatus;
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
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.time.LocalDateTime;

/**
 * Hồ sơ đối tác (BR-04/05). Các trường được NULL khi Draft, bắt buộc khi nộp.
 * MariaDB không có filtered unique index: "tax_id unique trong các hồ sơ APPROVED" kiểm tra ở service.
 */
@Getter
@Setter
@Entity
@Table(name = "organizer_profile", indexes = {
        @Index(name = "ix_organizer_profile_tax_id", columnList = "tax_id"),
        @Index(name = "ix_organizer_profile_queue", columnList = "status, submitted_at")
})
public class OrganizerProfileModel extends BaseModel {

    @OneToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_id", nullable = false, unique = true)
    private UserModel organizer;

    @Column(name = "legal_name")
    private String legalName;

    /** Applicant-provided motivation; nullable for legacy applications and incomplete drafts. */
    @Column(name = "registration_reason", length = 2000)
    private String registrationReason;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "business_type", length = 30)
    private BusinessType businessType;

    @Column(name = "tax_id", length = 50)
    private String taxId;

    @Column(name = "representative_name", length = 100)
    private String representativeName;

    @Column(length = 500)
    private String address;

    @Column(name = "contact_phone", length = 20)
    private String contactPhone;

    @Column(name = "contact_email")
    private String contactEmail;

    @Column(name = "bank_name", length = 100)
    private String bankName;

    /** Mã hoá; UI hiện 4 số cuối. */
    @Column(name = "bank_account_number")
    private String bankAccountNumber;

    @Column(name = "bank_account_holder", length = 100)
    private String bankAccountHolder;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 30)
    private OrganizerProfileStatus status = OrganizerProfileStatus.DRAFT;

    /** Operational restriction is independent of application review and the account role. */
    @org.hibernate.annotations.ColumnDefault("0")
    @Column(name = "is_suspended", nullable = false)
    private boolean suspended;

    @Column(name = "submitted_at")
    private LocalDateTime submittedAt;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private UserModel reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "review_feedback", length = 500)
    private String reviewFeedback;
}
