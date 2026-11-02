package base.api.feature.notification.repository;

import base.api.shared.entity.review.UserNotificationModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface IUserNotificationRepository extends JpaRepository<UserNotificationModel, Long> {
    Page<UserNotificationModel> findByUserId(Long userId, Pageable pageable);
    Page<UserNotificationModel> findByUserIdAndReadFalse(Long userId, Pageable pageable);
    long countByUserIdAndReadFalse(Long userId);
}

