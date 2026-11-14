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

    @Query("SELECT p FROM OrganizerProfileModel p WHERE p.organizer.id = :organizerId AND p.id = (SELECT MAX(q.id) FROM OrganizerProfileModel q WHERE q.organizer.id = :organizerId)")
    Optional<OrganizerProfileModel> findByOrganizerId(@Param("organizerId") Long organizerId);

    java.util.List<OrganizerProfileModel> findByOrganizerIdAndStatusOrderByIdDesc(Long organizerId, OrganizerProfileStatus status);

    boolean existsByOrganizerIdAndSuspendedTrue(Long organizerId);

    @Lock(LockModeType.PESSIMISTIC_READ)
    @Query("SELECT p FROM OrganizerProfileModel p WHERE p.organizer.id = :organizerId AND p.id = (SELECT MAX(q.id) FROM OrganizerProfileModel q WHERE q.organizer.id = :organizerId)")
    Optional<OrganizerProfileModel> findByOrganizerIdForBooking(@Param("organizerId") Long organizerId);

    @Query(value = "SELECT p FROM OrganizerProfileModel p JOIN FETCH p.organizer u " + PARTNER_FILTER
            + " ORDER BY p.legalName, p.id",
            countQuery = "SELECT COUNT(p) FROM OrganizerProfileModel p JOIN p.organizer u " + PARTNER_FILTER)
    Page<OrganizerProfileModel> findPartners(
            @Param("suspended") Boolean suspended, @Param("search") String search, Pageable pageable);

    String PARTNER_FILTER = """
            WHERE p.status = base.api.shared.enums.OrganizerProfileStatus.APPROVED
              AND u.roleEntity.name = 'ORGANIZER'
              AND p.id = (SELECT MAX(q.id) FROM OrganizerProfileModel q WHERE q.organizer.id = u.id)
              AND (:suspended IS NULL OR p.suspended = :suspended)
              AND (:search IS NULL OR LOCATE(:search, LOWER(p.legalName)) > 0
                   OR LOCATE(:search, LOWER(u.userName)) > 0 OR LOCATE(:search, LOWER(u.email)) > 0)
            """;
    boolean existsByTaxIdAndStatusAndIdNot(String taxId, OrganizerProfileStatus status, Long id);
    boolean existsByTaxIdAndStatusInAndIdNot(String taxId, java.util.Collection<OrganizerProfileStatus> statuses, Long id);

    @Query("SELECT p.organizer.id FROM OrganizerProfileModel p WHERE p.id = :id")
    Optional<Long> findApplicantId(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM OrganizerProfileModel p WHERE p.id = :id")
    Optional<OrganizerProfileModel> findByIdForLifecycleUpdate(@Param("id") Long id);

    /** Lock the owned profile so approval-state checks and updates share one transaction boundary. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT p FROM OrganizerProfileModel p WHERE p.organizer.id = :organizerId AND p.id = (SELECT MAX(q.id) FROM OrganizerProfileModel q WHERE q.organizer.id = :organizerId)")
    Optional<OrganizerProfileModel> findByOrganizerIdForUpdate(@Param("organizerId") Long organizerId);

    boolean existsByTaxIdAndStatusIn(String taxId, java.util.Collection<OrganizerProfileStatus> statuses);

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
                p.id, p.legalName, p.businessType, u.id, u.userName, u.email, p.status, p.submittedAt, p.reviewedAt, p.suspended)
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

