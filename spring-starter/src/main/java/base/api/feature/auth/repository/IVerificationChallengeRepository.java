package base.api.feature.auth.repository;

import base.api.shared.entity.VerificationChallengeModel;
import jakarta.persistence.LockModeType;
import java.time.LocalDateTime;
import java.util.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface IVerificationChallengeRepository
    extends JpaRepository<VerificationChallengeModel, UUID> {
  @Lock(LockModeType.PESSIMISTIC_WRITE)
  @Query(
      "SELECT c FROM VerificationChallengeModel c WHERE c.proofHash = :hash AND c.purpose = :purpose")
  Optional<VerificationChallengeModel> findForConsumption(
      @Param("hash") String hash, @Param("purpose") String purpose);

  @Modifying
  @Query(
      "UPDATE VerificationChallengeModel c SET c.invalidatedAt = :now WHERE c.userId = :userId AND c.purpose = :purpose AND c.consumedAt IS NULL AND c.invalidatedAt IS NULL")
  void invalidate(
      @Param("userId") UUID userId,
      @Param("purpose") String purpose,
      @Param("now") LocalDateTime now);
}
