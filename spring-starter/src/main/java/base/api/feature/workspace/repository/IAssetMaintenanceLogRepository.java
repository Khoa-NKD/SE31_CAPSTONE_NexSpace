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

    @org.springframework.data.jpa.repository.Query("""
            select distinct log.asset.id from AssetMaintenanceLogModel log
            where log.asset.workspace.id = :workspaceId and log.status in :statuses
              and coalesce(log.startedAt, log.scheduledAt, log.createdAt) <= :now
              and (log.plannedEndAt is null or log.plannedEndAt > :now)
            """)
    java.util.Set<Long> findMaintainedAssetIds(Long workspaceId, java.time.LocalDateTime now,
            java.util.Collection<base.api.shared.enums.MaintenanceStatus> statuses);

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    List<AssetMaintenanceLogModel> findByAssetIdOrderByCreatedAtDesc(Long assetId);

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    Page<AssetMaintenanceLogModel> findByAssetId(Long assetId, Pageable pageable);

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    Optional<AssetMaintenanceLogModel> findByIdAndAssetId(Long id, Long assetId);

    @EntityGraph(attributePaths = {"asset", "reportedBy"})
    List<AssetMaintenanceLogModel> findByAssetWorkspaceIdOrderByCreatedAtDesc(Long workspaceId);
}

