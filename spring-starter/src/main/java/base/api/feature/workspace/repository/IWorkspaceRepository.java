package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.WorkspaceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface IWorkspaceRepository extends JpaRepository<WorkspaceModel, Long> {
    List<WorkspaceModel> findByOrganizerIdOrderByIdDesc(Long organizerId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WorkspaceModel w where w.id = :id and w.organizer.id = :actorId")
    Optional<WorkspaceModel> findOwnedForResourceUpdate(@Param("id") Long id, @Param("actorId") Long actorId);

    @Query("""
            SELECT w FROM WorkspaceModel w
            WHERE w.organizer.id = :organizerId
              AND (:status IS NULL OR w.status = :status)
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchByOrganizer(
            @Param("organizerId") Long organizerId,
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);

    Optional<WorkspaceModel> findByIdAndOrganizerId(Long id, Long organizerId);

    Optional<WorkspaceModel> findByIdAndStatus(Long id, WorkspaceStatus status);

    @Query("""
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchPublic(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);
}

