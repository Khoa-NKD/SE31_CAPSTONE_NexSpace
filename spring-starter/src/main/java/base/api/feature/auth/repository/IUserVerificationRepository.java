package base.api.feature.auth.repository;

import base.api.shared.entity.identity.UserVerificationModel;
import base.api.shared.enums.VerificationPurpose;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IUserVerificationRepository extends JpaRepository<UserVerificationModel, Long> {
    Optional<UserVerificationModel> findFirstByDestinationAndPurposeAndConsumedAtIsNullOrderByCreatedAtDesc(
            String destination, VerificationPurpose purpose);
}

