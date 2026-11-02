package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerProfileStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IOrganizerProfileRepository extends JpaRepository<OrganizerProfileModel, Long> {

    Optional<OrganizerProfileModel> findByOrganizerId(Long organizerId);

    Optional<OrganizerProfileModel> findByTaxIdAndStatus(String taxId, OrganizerProfileStatus status);

    Page<OrganizerProfileModel> findByStatus(OrganizerProfileStatus status, Pageable pageable);
}

