package base.api.feature.organizer.repository;

import base.api.shared.entity.organizer.BusinessTypeModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Collection;
import java.util.List;

@Repository
public interface IBusinessTypeRepository extends JpaRepository<BusinessTypeModel, Long> {
    List<BusinessTypeModel> findByCodeInOrderBySortOrderAscIdAsc(Collection<String> codes);
}
