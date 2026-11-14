package base.api.feature.personalization.repository;

import base.api.shared.entity.personalization.SavedSearchFilterModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ISavedSearchFilterRepository extends JpaRepository<SavedSearchFilterModel, Long> {

    List<SavedSearchFilterModel> findByCustomerIdOrderByCreatedAtDesc(Long customerId);

    Optional<SavedSearchFilterModel> findByIdAndCustomerId(Long id, Long customerId);

    boolean existsByCustomerIdAndName(Long customerId, String name);

    long countByCustomerId(Long customerId);
}

