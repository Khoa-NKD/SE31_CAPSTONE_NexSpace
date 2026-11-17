package base.api.feature.resource.repository;

import base.api.shared.entity.resource.ResourceTypeModel;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IResourceTypeRepository extends JpaRepository<ResourceTypeModel, Long> {
    boolean existsByWorkspaceIdAndNameIgnoreCase(Long workspaceId, String name);

    List<ResourceTypeModel> findByWorkspaceId(Long workspaceId);
}
