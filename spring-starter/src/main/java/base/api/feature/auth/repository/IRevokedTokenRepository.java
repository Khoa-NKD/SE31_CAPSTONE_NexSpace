package base.api.feature.auth.repository;

import base.api.shared.entity.RevokedTokenModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface IRevokedTokenRepository extends JpaRepository<RevokedTokenModel, Long> {

    boolean existsByTokenHash(String tokenHash);

    @Modifying
    @Query("DELETE FROM RevokedTokenModel t WHERE t.expiresAt < :now")
    int deleteExpired(@Param("now") LocalDateTime now);
}
