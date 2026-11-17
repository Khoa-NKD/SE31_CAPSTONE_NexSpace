package base.api.feature.auth.repository;

import base.api.shared.entity.PasswordResetTokenModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IPasswordResetTokenRepository extends JpaRepository<PasswordResetTokenModel, Long> {

    Optional<PasswordResetTokenModel> findByToken(String token);

    @Modifying
    @Query("DELETE FROM PasswordResetTokenModel t WHERE t.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
