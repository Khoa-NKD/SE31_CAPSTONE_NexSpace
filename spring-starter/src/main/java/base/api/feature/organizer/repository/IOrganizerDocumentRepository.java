package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.enums.OrganizerDocumentType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface IOrganizerDocumentRepository extends JpaRepository<OrganizerDocumentModel, Long> {
    List<OrganizerDocumentModel> findByOrganizerProfileId(Long organizerProfileId);

    List<OrganizerDocumentModel> findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(Long organizerProfileId);

    /** A locking read sees the latest committed document even if an earlier account read opened a snapshot. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OrganizerDocumentModel> findFirstByOrganizerProfileIdAndDocumentTypeAndCurrentTrueOrderByIdDesc(
            Long organizerProfileId, OrganizerDocumentType documentType);
}
