package base.api.feature.workspace.dto.response;

import base.api.shared.enums.MediaType;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
public class WorkspaceMediaResponseDto {

    Long id;
    Long workspaceId;
    Long resourceId;
    String url;
    MediaType mediaType;
    boolean cover;
    int displayOrder;
    LocalDateTime createdAt;
    LocalDateTime updatedAt;

    public boolean isCover() {
        return cover;
    }

    public boolean getIsCover() {
        return cover;
    }
}

