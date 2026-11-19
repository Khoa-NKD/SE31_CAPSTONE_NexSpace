package base.api.feature.notification.repository;

import base.api.shared.entity.review.NotificationTemplateModel;
import base.api.shared.enums.NotificationChannel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface INotificationTemplateRepository extends JpaRepository<NotificationTemplateModel, Long> {

    Optional<NotificationTemplateModel> findByEventTypeAndChannelAndLanguage(
            String eventType, NotificationChannel channel, String language);

    @Query("""
            SELECT t FROM NotificationTemplateModel t
            WHERE (:channel IS NULL OR t.channel = :channel)
              AND (:language IS NULL OR t.language = :language)
              AND (:search IS NULL
                   OR LOWER(t.eventType) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(t.subjectTemplate) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<NotificationTemplateModel> searchTemplates(
            @Param("channel") NotificationChannel channel,
            @Param("language") String language,
            @Param("search") String search,
            Pageable pageable);
}
