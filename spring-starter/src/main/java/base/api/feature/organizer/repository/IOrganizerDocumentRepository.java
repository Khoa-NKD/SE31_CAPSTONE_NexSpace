package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.OrganizerDocumentModel;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.feature.organizer.dto.response.AdminOrganizerDocumentResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import jakarta.persistence.LockModeType;

import java.util.List;
import java.util.Optional;

@Repository
public interface IOrganizerDocumentRepository extends JpaRepository<OrganizerDocumentModel, Long> {
    List<OrganizerDocumentModel> findByOrganizerProfileId(Long organizerProfileId);

    Optional<OrganizerDocumentModel> findByIdAndOrganizerProfileId(Long id, Long organizerProfileId);

    /** One projection query includes current and retained versions, without loading storage keys. */
    @Query("""
            SELECT new base.api.feature.organizer.dto.response.AdminOrganizerDocumentResponse(
                d.id, d.documentType, d.fileName, d.status, d.createdAt, d.current, d.adminFeedback)
            FROM OrganizerDocumentModel d WHERE d.organizerProfile.id = :profileId
            ORDER BY d.current DESC, d.id DESC
            """)
    List<AdminOrganizerDocumentResponse> findAdminMetadataByProfileId(@Param("profileId") Long profileId);

    List<OrganizerDocumentModel> findByOrganizerProfileIdAndCurrentTrueOrderByIdDesc(Long organizerProfileId);

    /** A locking read sees the latest committed document even if an earlier account read opened a snapshot. */
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    Optional<OrganizerDocumentModel> findFirstByOrganizerProfileIdAndDocumentTypeAndCurrentTrueOrderByIdDesc(
            Long organizerProfileId, OrganizerDocumentType documentType);
}
