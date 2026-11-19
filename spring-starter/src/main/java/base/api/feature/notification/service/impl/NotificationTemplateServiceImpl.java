package base.api.feature.notification.service.impl;

import base.api.feature.notification.dto.request.CreateNotificationTemplateDto;
import base.api.feature.notification.dto.request.UpdateNotificationTemplateDto;
import base.api.feature.notification.dto.response.NotificationTemplateResponseDto;
import base.api.feature.notification.repository.INotificationTemplateRepository;
import base.api.feature.notification.service.INotificationTemplateService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.review.NotificationTemplateModel;
import base.api.shared.enums.NotificationChannel;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationTemplateServiceImpl implements INotificationTemplateService {

    private final INotificationTemplateRepository templateRepository;

    @Override
    @Transactional(readOnly = true)
    public Page<NotificationTemplateResponseDto> getTemplates(
            NotificationChannel channel, String language, String search, PageRequestDTO pageRequest) {
        Page<NotificationTemplateModel> page = templateRepository.searchTemplates(
                channel, language, search, pageRequest.toPageable());
        return page.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public NotificationTemplateResponseDto getTemplateById(Long id) {
        NotificationTemplateModel template = templateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Mẫu thông báo không tồn tại: " + id));
        return toResponseDto(template);
    }

    @Override
    @Transactional
    public NotificationTemplateResponseDto createTemplate(CreateNotificationTemplateDto dto) {
        var existing = templateRepository.findByEventTypeAndChannelAndLanguage(
                dto.getEventType().trim(), dto.getChannel(), dto.getLanguage().trim());
        if (existing.isPresent()) {
            throw new ConflictException("Mẫu thông báo cho sự kiện " + dto.getEventType()
                    + " với kênh " + dto.getChannel() + " và ngôn ngữ " + dto.getLanguage() + " đã tồn tại");
        }

        NotificationTemplateModel model = new NotificationTemplateModel();
        model.setEventType(dto.getEventType().trim());
        model.setChannel(dto.getChannel());
        model.setLanguage(dto.getLanguage().trim());
        model.setSubjectTemplate(dto.getSubjectTemplate().trim());
        model.setBodyTemplate(dto.getBodyTemplate());
        model.setActive(dto.getActive() == null || dto.getActive());

        NotificationTemplateModel saved = templateRepository.save(model);
        log.info("Created notification template id={} for event={}", saved.getId(), saved.getEventType());
        return toResponseDto(saved);
    }

    @Override
    @Transactional
    public NotificationTemplateResponseDto updateTemplate(Long id, UpdateNotificationTemplateDto dto) {
        NotificationTemplateModel template = templateRepository.findById(id)
                .orElseThrow(() -> new NotFoundException("Mẫu thông báo không tồn tại: " + id));

        if (dto != null) {
            if (StringUtils.hasText(dto.getSubjectTemplate())) {
                template.setSubjectTemplate(dto.getSubjectTemplate().trim());
            }
            if (StringUtils.hasText(dto.getBodyTemplate())) {
                template.setBodyTemplate(dto.getBodyTemplate());
            }
            if (dto.getActive() != null) {
                template.setActive(dto.getActive());
            }
        }

        NotificationTemplateModel updated = templateRepository.save(template);
        log.info("Updated notification template id={}", updated.getId());
        return toResponseDto(updated);
    }

    @Override
    @Transactional
    public void deleteTemplate(Long id) {
        if (!templateRepository.existsById(id)) {
            throw new NotFoundException("Mẫu thông báo không tồn tại: " + id);
        }
        templateRepository.deleteById(id);
        log.info("Deleted notification template id={}", id);
    }

    private NotificationTemplateResponseDto toResponseDto(NotificationTemplateModel model) {
        return NotificationTemplateResponseDto.builder()
                .id(model.getId())
                .eventType(model.getEventType())
                .channel(model.getChannel())
                .language(model.getLanguage())
                .subjectTemplate(model.getSubjectTemplate())
                .bodyTemplate(model.getBodyTemplate())
                .active(model.isActive())
                .createdAt(model.getCreatedAt())
                .updatedAt(model.getUpdatedAt())
                .build();
    }
}
