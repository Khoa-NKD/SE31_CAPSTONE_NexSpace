package base.api.feature.notification.dto.request;

import base.api.shared.enums.NotificationChannel;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateNotificationTemplateDto {

    @NotBlank(message = "Mã sự kiện không được để trống")
    private String eventType;

    @NotNull(message = "Kênh thông báo không được để trống")
    private NotificationChannel channel;

    @NotBlank(message = "Mã ngôn ngữ không được để trống")
    private String language = "vi";

    @NotBlank(message = "Tiêu đề mẫu thông báo không được để trống")
    private String subjectTemplate;

    @NotBlank(message = "Nội dung mẫu thông báo không được để trống")
    private String bodyTemplate;

    private Boolean active = true;
}
