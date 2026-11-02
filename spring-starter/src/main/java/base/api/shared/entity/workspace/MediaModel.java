package base.api.shared.entity.workspace;

import base.api.shared.entity.BaseModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.MediaType;
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
 * Ảnh của không gian (resource = NULL) hoặc của 1 chỗ. Mỗi chủ thể chỉ 1 ảnh bìa (kiểm tra ở backend).
 */
@Getter
@Setter
@Entity
@Table(name = "media", indexes = {
        @Index(name = "ix_media_owner", columnList = "workspace_id, resource_id, display_order")
})
public class MediaModel extends BaseModel {

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "workspace_id", nullable = false)
    @OnDelete(action = OnDeleteAction.CASCADE)
    private WorkspaceModel workspace;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "resource_id")
    private BookableResourceModel resource;

    /** JPG/PNG <= 5 MB (BR-37). */
    @Column(nullable = false, length = 500)
    private String url;

    @Enumerated(EnumType.STRING)
    @JdbcTypeCode(SqlTypes.VARCHAR)
    @Column(name = "media_type", nullable = false, length = 20)
    private MediaType mediaType = MediaType.IMAGE;

    @Column(name = "is_cover", nullable = false)
    private boolean cover;

    @Column(name = "display_order", nullable = false)
    private int displayOrder;
}
