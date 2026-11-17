package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.WorkspaceAssetModel;
import base.api.shared.enums.AssetStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IWorkspaceAssetRepository extends JpaRepository<WorkspaceAssetModel, Long> {

    @EntityGraph(attributePaths = {"resource", "amenity"})
    Optional<WorkspaceAssetModel> findByIdAndWorkspaceId(Long id, Long workspaceId);

    boolean existsByWorkspaceIdAndAssetCodeIgnoreCase(Long workspaceId, String assetCode);

    boolean existsByWorkspaceIdAndAssetCodeIgnoreCaseAndIdNot(Long workspaceId, String assetCode, Long id);

    @EntityGraph(attributePaths = {"resource", "amenity"})
    List<WorkspaceAssetModel> findByWorkspaceId(Long workspaceId);

    @Query("SELECT a FROM WorkspaceAssetModel a " +
           "LEFT JOIN FETCH a.resource " +
           "LEFT JOIN FETCH a.amenity " +
           "WHERE a.workspace.id = :workspaceId " +
           "AND (:status IS NULL OR a.status = :status) " +
           "AND (:search IS NULL OR :search = '' OR " +
           "     LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%')) OR " +
           "     LOWER(a.assetCode) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<WorkspaceAssetModel> searchAssets(
            @Param("workspaceId") Long workspaceId,
            @Param("status") AssetStatus status,
            @Param("search") String search,
            Pageable pageable
    );
}

