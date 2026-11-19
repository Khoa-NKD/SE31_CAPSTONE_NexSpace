package base.api.feature.notification.service;

import base.api.feature.notification.dto.request.CreateNotificationTemplateDto;
import base.api.feature.notification.dto.request.UpdateNotificationTemplateDto;
import base.api.feature.notification.dto.response.NotificationTemplateResponseDto;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.NotificationChannel;
import org.springframework.data.domain.Page;

public interface INotificationTemplateService {

    Page<NotificationTemplateResponseDto> getTemplates(
            NotificationChannel channel, String language, String search, PageRequestDTO pageRequest);

    NotificationTemplateResponseDto getTemplateById(Long id);

    NotificationTemplateResponseDto createTemplate(CreateNotificationTemplateDto dto);

    NotificationTemplateResponseDto updateTemplate(Long id, UpdateNotificationTemplateDto dto);

    void deleteTemplate(Long id);
}
