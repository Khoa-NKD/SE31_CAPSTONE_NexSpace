package base.api.feature.auth.repository;

import base.api.shared.entity.EmailVerificationTokenModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IEmailVerificationTokenRepository extends JpaRepository<EmailVerificationTokenModel, Long> {

    Optional<EmailVerificationTokenModel> findByToken(String token);

    @Modifying
    @Query("DELETE FROM EmailVerificationTokenModel t WHERE t.userId = :userId")
    void deleteByUserId(@Param("userId") Long userId);
}
