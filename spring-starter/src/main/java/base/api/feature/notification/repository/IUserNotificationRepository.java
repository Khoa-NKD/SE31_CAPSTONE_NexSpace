package base.api.feature.notification.repository;

import base.api.shared.entity.review.UserNotificationModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface IUserNotificationRepository extends JpaRepository<UserNotificationModel, Long> {
    @Query(value = "SELECT n FROM UserNotificationModel n WHERE n.user.id = :userId ORDER BY n.read ASC, n.createdAt DESC",
           countQuery = "SELECT COUNT(n) FROM UserNotificationModel n WHERE n.user.id = :userId")
    Page<UserNotificationModel> findByUserId(@Param("userId") Long userId, Pageable pageable);

    @Query(value = "SELECT n FROM UserNotificationModel n WHERE n.user.id = :userId AND n.read = false ORDER BY n.createdAt DESC",
           countQuery = "SELECT COUNT(n) FROM UserNotificationModel n WHERE n.user.id = :userId AND n.read = false")
    Page<UserNotificationModel> findByUserIdAndReadFalse(@Param("userId") Long userId, Pageable pageable);
    long countByUserIdAndReadFalse(Long userId);

    @Modifying
    @Query("UPDATE UserNotificationModel n SET n.read = true WHERE n.user.id = :userId AND n.read = false")
    int markAllAsReadForUser(@Param("userId") Long userId);

    @Modifying
    @Query("UPDATE UserNotificationModel n SET n.read = true WHERE n.user.id = :userId AND n.id IN :notificationIds AND n.read = false")
    int markBatchAsReadForUser(@Param("userId") Long userId, @Param("notificationIds") java.util.List<Long> notificationIds);

    @Query("SELECT CASE WHEN COUNT(n) > 0 THEN true ELSE false END FROM UserNotificationModel n WHERE n.user.id = :userId AND n.relatedEntityType = :relatedEntityType AND n.relatedEntityId = :relatedEntityId")
    boolean existsByUserIdAndRelatedEntityTypeAndRelatedEntityId(
            @Param("userId") Long userId,
            @Param("relatedEntityType") String relatedEntityType,
            @Param("relatedEntityId") Long relatedEntityId);
}

