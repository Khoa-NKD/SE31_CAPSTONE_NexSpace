package base.api.feature.resource.repository;

import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.enums.BookableResourceStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IBookableResourceRepository extends JpaRepository<BookableResourceModel, Long> {
    List<BookableResourceModel> findByFloorPlanId(Long floorPlanId);
    List<BookableResourceModel> findByFloorPlanIdAndStatus(Long floorPlanId, BookableResourceStatus status);
}

