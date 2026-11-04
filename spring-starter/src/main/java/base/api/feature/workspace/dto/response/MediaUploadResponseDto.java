package base.api.feature.workspace.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import lombok.Builder;
import lombok.Value;

import java.time.LocalDateTime;

@Value
@Builder
@JsonInclude(JsonInclude.Include.NON_NULL)
public class MediaUploadResponseDto {
    String id;
    String publicId;
    String url;
    String originalFileName;
    String originalName;
    String filename;
    String mimeType;
    String format;
    Long bytes;
    Long size;
    Integer width;
    Integer height;
    LocalDateTime uploadedAt;
}

