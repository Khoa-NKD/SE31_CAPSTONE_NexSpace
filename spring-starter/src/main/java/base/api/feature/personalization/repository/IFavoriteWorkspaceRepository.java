package base.api.feature.personalization.repository;

import base.api.shared.entity.personalization.FavoriteWorkspaceModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IFavoriteWorkspaceRepository extends JpaRepository<FavoriteWorkspaceModel, FavoriteWorkspaceModel.Key> {
    Page<FavoriteWorkspaceModel> findByCustomerId(Long customerId, Pageable pageable);
    Optional<FavoriteWorkspaceModel> findByCustomerIdAndWorkspaceId(Long customerId, Long workspaceId);
    boolean existsByCustomerIdAndWorkspaceId(Long customerId, Long workspaceId);
}

