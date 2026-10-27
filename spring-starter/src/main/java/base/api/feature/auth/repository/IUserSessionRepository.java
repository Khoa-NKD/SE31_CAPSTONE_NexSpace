package base.api.feature.auth.repository;

import base.api.shared.entity.UserSessionModel;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface IUserSessionRepository extends JpaRepository<UserSessionModel, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query("SELECT s FROM UserSessionModel s WHERE s.refreshTokenHash = :hash")
  Optional<UserSessionModel> findForRefresh(@Param("hash") String hash);

  @Modifying
  @Query(
      "UPDATE UserSessionModel s SET s.revoked = 1, s.revokedAt = :now WHERE s.userId = :userId AND s.revoked = 0")
  void revokeAll(@Param("userId") UUID userId, @Param("now") LocalDateTime now);
}
