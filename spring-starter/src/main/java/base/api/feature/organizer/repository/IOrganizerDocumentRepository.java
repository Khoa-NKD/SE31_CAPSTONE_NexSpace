package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerDocumentModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IOrganizerDocumentRepository extends JpaRepository<OrganizerDocumentModel, Long> {
    List<OrganizerDocumentModel> findByProfileId(Long profileId);
}

