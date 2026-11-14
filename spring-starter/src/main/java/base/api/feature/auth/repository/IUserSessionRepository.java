package base.api.feature.auth.repository;

import base.api.shared.entity.identity.UserSessionModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IUserSessionRepository extends JpaRepository<UserSessionModel, Long> {
    Optional<UserSessionModel> findByRefreshTokenHash(String refreshTokenHash);
    List<UserSessionModel> findByUserIdAndRevokedAtIsNull(Long userId);

    @Query("SELECT MAX(s.revokedAt) FROM UserSessionModel s WHERE s.user.id = :userId AND s.revokedAt IS NOT NULL")
    Optional<LocalDateTime> findLatestRevokedAtByUserId(@Param("userId") Long userId);
}

