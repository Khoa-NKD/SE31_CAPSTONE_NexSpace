package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.WorkspaceAmenityModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface IWorkspaceAmenityRepository extends JpaRepository<WorkspaceAmenityModel, Long> {

    @Query("""
            SELECT wa FROM WorkspaceAmenityModel wa
            JOIN FETCH wa.amenity a
            WHERE wa.workspace.id = :workspaceId
              AND wa.resource IS NULL
            ORDER BY a.name ASC
            """)
    List<WorkspaceAmenityModel> findAllByWorkspaceId(@Param("workspaceId") Long workspaceId);

    @Query("""
            SELECT wa FROM WorkspaceAmenityModel wa
            JOIN FETCH wa.amenity a
            WHERE wa.workspace.id = :workspaceId
              AND wa.amenity.id = :amenityId
              AND wa.resource IS NULL
            """)
    Optional<WorkspaceAmenityModel> findByWorkspaceIdAndAmenityId(
            @Param("workspaceId") Long workspaceId,
            @Param("amenityId") Long amenityId);

    boolean existsByWorkspaceIdAndAmenityIdAndResourceIsNull(Long workspaceId, Long amenityId);

    @Modifying
    @Query("DELETE FROM WorkspaceAmenityModel wa WHERE wa.workspace.id = :workspaceId AND wa.resource IS NULL")
    void deleteAllByWorkspaceIdAndResourceIsNull(@Param("workspaceId") Long workspaceId);
}

