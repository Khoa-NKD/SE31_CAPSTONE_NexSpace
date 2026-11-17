package base.api.feature.resource.repository;

import base.api.shared.entity.resource.BuildingModel;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

public interface IBuildingRepository extends JpaRepository<BuildingModel, Long> {
    List<BuildingModel> findByOrganizerIdOrderByNameAsc(Long organizerId);
    boolean existsByOrganizerIdAndNameIgnoreCase(Long organizerId, String name);

    @Query("select b.address from BuildingModel b where b.organizer.id = :organizerId")
    List<String> findAddressesByOrganizerId(Long organizerId);
}
