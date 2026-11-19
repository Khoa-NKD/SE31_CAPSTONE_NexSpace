package base.api.feature.notification.dto.request;

import lombok.Data;

@Data
public class UpdateNotificationTemplateDto {
    private String subjectTemplate;
    private String bodyTemplate;
    private Boolean active;
}
