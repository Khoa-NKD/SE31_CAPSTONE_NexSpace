package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.MediaModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IMediaRepository extends JpaRepository<MediaModel, Long> {
    List<MediaModel> findByWorkspaceIdOrderByDisplayOrderAsc(Long workspaceId);
    List<MediaModel> findByResourceIdOrderByDisplayOrderAsc(Long resourceId);
}

