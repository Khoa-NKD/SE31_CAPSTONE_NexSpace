package base.api.feature.resource.repository;

import base.api.shared.entity.resource.LayoutTemplateModel;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ILayoutTemplateRepository extends JpaRepository<LayoutTemplateModel, Long> {
    List<LayoutTemplateModel> findByOrganizerIdOrderByNameAsc(Long organizerId);
    Optional<LayoutTemplateModel> findByIdAndOrganizerId(Long id, Long organizerId);
    boolean existsByOrganizerIdAndNameIgnoreCaseAndIdNot(Long organizerId, String name, Long id);
}
