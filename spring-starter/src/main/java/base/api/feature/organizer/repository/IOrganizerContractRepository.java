package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerContractModel;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Writes are serialized by the owning profile's existing pessimistic lock. */
public interface IOrganizerContractRepository extends JpaRepository<OrganizerContractModel, Long> {
    Optional<OrganizerContractModel> findByProfileId(Long profileId);
}
