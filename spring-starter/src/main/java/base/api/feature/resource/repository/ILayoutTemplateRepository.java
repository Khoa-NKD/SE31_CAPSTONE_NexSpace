package base.api.feature.resource.repository;

import base.api.shared.entity.resource.LayoutTemplateModel;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import jakarta.persistence.LockModeType;

public interface ILayoutTemplateRepository extends JpaRepository<LayoutTemplateModel, Long> {
    List<LayoutTemplateModel> findByOrganizerIdOrderByNameAsc(Long organizerId);
    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("select template from LayoutTemplateModel template where template.organizerId = :organizerId order by template.id")
    List<LayoutTemplateModel> findForUpdateByOrganizerId(@Param("organizerId") Long organizerId);
    Optional<LayoutTemplateModel> findByIdAndOrganizerId(Long id, Long organizerId);
    boolean existsByOrganizerIdAndNameIgnoreCaseAndIdNot(Long organizerId, String name, Long id);
}
