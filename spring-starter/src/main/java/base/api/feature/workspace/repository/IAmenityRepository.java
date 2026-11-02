package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.enums.AmenityCategory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IAmenityRepository extends JpaRepository<AmenityModel, Long> {
    List<AmenityModel> findByCategory(AmenityCategory category);
}

