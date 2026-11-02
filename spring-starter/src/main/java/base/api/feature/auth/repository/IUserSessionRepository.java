package base.api.feature.auth.repository;

import base.api.shared.entity.identity.UserSessionModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IUserSessionRepository extends JpaRepository<UserSessionModel, Long> {
    Optional<UserSessionModel> findByRefreshTokenHash(String refreshTokenHash);
    List<UserSessionModel> findByUserIdAndRevokedAtIsNull(Long userId);
}

