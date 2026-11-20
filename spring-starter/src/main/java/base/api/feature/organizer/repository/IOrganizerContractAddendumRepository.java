package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerContractAddendumModel;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

/** Mutations are serialized using the owning profile's existing pessimistic lock. */
public interface IOrganizerContractAddendumRepository extends JpaRepository<OrganizerContractAddendumModel, Long> {
    List<OrganizerContractAddendumModel> findByContractIdOrderByIdDesc(Long contractId);
    Optional<OrganizerContractAddendumModel> findByContractIdAndTemplateVersion(Long contractId, String templateVersion);
    Optional<OrganizerContractAddendumModel> findByIdAndContractId(Long id, Long contractId);
}
