package base.api.feature.notification.dto.response;

import base.api.shared.enums.NotificationChannel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class NotificationTemplateResponseDto {
    private Long id;
    private String eventType;
    private NotificationChannel channel;
    private String language;
    private String subjectTemplate;
    private String bodyTemplate;
    private boolean active;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
