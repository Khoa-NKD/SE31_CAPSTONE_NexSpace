package base.api.feature.personalization.repository;

import base.api.shared.entity.personalization.CustomerPreferenceModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ICustomerPreferenceRepository extends JpaRepository<CustomerPreferenceModel, Long> {
    Optional<CustomerPreferenceModel> findByCustomerId(Long customerId);
}

