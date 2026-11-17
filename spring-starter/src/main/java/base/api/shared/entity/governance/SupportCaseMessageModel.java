package base.api.shared.entity.governance;

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
import org.hibernate.annotations.OnDelete;
import org.hibernate.annotations.OnDeleteAction;

/**
 * Tin nhắn trong case (gộp Support_Case_Evidence qua attachment*). sender = NULL => tin hệ thống.
 */
@Getter
@Setter
@Entity
@Table(name = "support_case_message", indexes = {
        @Index(name = "ix_support_case_message_case", columnList = "support_case_id, created_at")
})
@Check(name = "ck_scm_has_content", constraints = "body IS NOT NULL OR attachment_url IS NOT NULL")
public class SupportCaseMessageModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "support_case_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private SupportCaseModel supportCase;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id")
    private UserModel sender;

    /** true = ghi chú chỉ Admin thấy. */
    @Column(name = "is_internal", nullable = false)
    private boolean internal;

    @Column(columnDefinition = "TEXT")
    private String body;

    @Column(name = "attachment_url", length = 500)
    private String attachmentUrl;

    @Column(name = "attachment_name")
    private String attachmentName;
}
