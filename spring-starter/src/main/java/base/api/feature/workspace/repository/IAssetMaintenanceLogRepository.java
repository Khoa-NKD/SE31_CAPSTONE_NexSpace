package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.AssetMaintenanceLogModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IAssetMaintenanceLogRepository extends JpaRepository<AssetMaintenanceLogModel, Long> {

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    List<AssetMaintenanceLogModel> findByAssetIdOrderByCreatedAtDesc(Long assetId);

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    Page<AssetMaintenanceLogModel> findByAssetId(Long assetId, Pageable pageable);

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    Optional<AssetMaintenanceLogModel> findByIdAndAssetId(Long id, Long assetId);

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    List<AssetMaintenanceLogModel> findByAssetWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);
}

