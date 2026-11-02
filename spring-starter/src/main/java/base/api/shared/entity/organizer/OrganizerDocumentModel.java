package base.api.shared.entity.organizer;

import base.api.shared.entity.BaseModel;
import base.api.shared.enums.OrganizerDocumentStatus;
import base.api.shared.enums.OrganizerDocumentType;
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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;
import org.hibernate.type.SqlTypes;

/**
 * Giấy tờ xác minh. Nộp lại cùng loại => bản cũ current = false, giữ lịch sử.
 */
@Getter
@Setter
@Entity
@AttributeOverride(name = "createdAt", column = @Column(name = "uploaded_at", updatable = false))
@Table(name = "organizer_document", indexes = {
        @Index(name = "ix_organizer_document_profile", columnList = "organizer_profile_id, is_current")
})
public class OrganizerDocumentModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "organizer_profile_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private OrganizerProfileModel organizerProfile;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "document_type", nullable = false, length = 30)
    private OrganizerDocumentType documentType;

    /** JPG/PNG/PDF <= 5 MB, kiểm tra ở backend. */
    @Column(name = "file_url", nullable = false, length = 500)
    private String fileUrl;

    @Column(name = "file_name", nullable = false)
    private String fileName;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(nullable = false, length = 20)
    private OrganizerDocumentStatus status = OrganizerDocumentStatus.PENDING;

    @Column(name = "admin_feedback", length = 500)
    private String adminFeedback;

    @Column(name = "is_current", nullable = false)
    private boolean current = true;
}
