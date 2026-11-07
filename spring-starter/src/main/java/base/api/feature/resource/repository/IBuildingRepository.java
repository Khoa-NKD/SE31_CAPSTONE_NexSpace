package base.api.feature.resource.repository;

import base.api.shared.entity.resource.BuildingModel;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface IBuildingRepository extends JpaRepository<BuildingModel, Long> {
    List<BuildingModel> findByOrganizerIdOrderByNameAsc(Long organizerId);
    boolean existsByOrganizerIdAndNameIgnoreCase(Long organizerId, String name);
}
