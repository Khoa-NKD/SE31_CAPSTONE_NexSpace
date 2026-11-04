package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.MediaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IMediaRepository extends JpaRepository<MediaModel, Long> {

    List<MediaModel> findByWorkspaceIdOrderByDisplayOrderAsc(Long workspaceId);

    List<MediaModel> findByResourceIdOrderByDisplayOrderAsc(Long resourceId);

    Optional<MediaModel> findByIdAndWorkspaceId(Long id, Long workspaceId);

    Optional<MediaModel> findFirstByWorkspaceIdAndCoverTrue(Long workspaceId);

    Optional<MediaModel> findFirstByWorkspaceIdOrderByDisplayOrderAsc(Long workspaceId);

    boolean existsByWorkspaceId(Long workspaceId);

    int countByWorkspaceId(Long workspaceId);

    void deleteByWorkspaceId(Long workspaceId);
}
