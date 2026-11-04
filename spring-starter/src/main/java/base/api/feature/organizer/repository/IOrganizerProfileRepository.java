package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.OrganizerProfileStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

import java.util.Optional;

@Repository
public interface IOrganizerProfileRepository extends JpaRepository<OrganizerProfileModel, Long> {

    Optional<OrganizerProfileModel> findByOrganizerId(Long organizerId);

    /** Lock the owned profile so approval-state checks and updates share one transaction boundary. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM OrganizerProfileModel p WHERE p.organizer.id = :organizerId")
    Optional<OrganizerProfileModel> findByOrganizerIdForUpdate(@Param("organizerId") Long organizerId);

    Optional<OrganizerProfileModel> findByTaxIdAndStatus(String taxId, OrganizerProfileStatus status);

    Page<OrganizerProfileModel> findByStatus(OrganizerProfileStatus status, Pageable pageable);
}

