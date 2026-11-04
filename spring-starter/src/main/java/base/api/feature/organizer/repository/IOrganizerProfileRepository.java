package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.feature.organizer.dto.response.AdminOrganizerApplicationResponse;
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

    /** Match the submitted-list scope and fetch the applicant/role in one query. */
    @Query("""
            SELECT p FROM OrganizerProfileModel p
            JOIN FETCH p.organizer u JOIN FETCH u.roleEntity
            WHERE p.id = :applicationId AND p.submittedAt IS NOT NULL
              AND p.status <> base.api.shared.enums.OrganizerProfileStatus.DRAFT
            """)
    Optional<OrganizerProfileModel> findSubmittedApplicationDetails(@Param("applicationId") Long applicationId);

    /** Constructor projection avoids loading user roles/documents or triggering per-row lazy reads. */
    @Query(value = """
            SELECT new base.api.feature.organizer.dto.response.AdminOrganizerApplicationResponse(
                p.id, p.legalName, p.businessType, u.id, u.userName, u.email, p.status, p.submittedAt, p.reviewedAt)
            FROM OrganizerProfileModel p JOIN p.organizer u
            WHERE p.submittedAt IS NOT NULL
              AND p.status <> base.api.shared.enums.OrganizerProfileStatus.DRAFT
              AND (:status IS NULL OR p.status = :status)
              AND (:pattern IS NULL OR LOWER(p.legalName) LIKE :pattern ESCAPE '!'
                   OR LOWER(u.userName) LIKE :pattern ESCAPE '!'
                   OR LOWER(u.email) LIKE :pattern ESCAPE '!')
            """, countQuery = """
            SELECT COUNT(p) FROM OrganizerProfileModel p JOIN p.organizer u
            WHERE p.submittedAt IS NOT NULL
              AND p.status <> base.api.shared.enums.OrganizerProfileStatus.DRAFT
              AND (:status IS NULL OR p.status = :status)
              AND (:pattern IS NULL OR LOWER(p.legalName) LIKE :pattern ESCAPE '!'
                   OR LOWER(u.userName) LIKE :pattern ESCAPE '!'
                   OR LOWER(u.email) LIKE :pattern ESCAPE '!')
            """)
    Page<AdminOrganizerApplicationResponse> findSubmittedApplications(
            @Param("status") OrganizerProfileStatus status, @Param("pattern") String pattern, Pageable pageable);
}

