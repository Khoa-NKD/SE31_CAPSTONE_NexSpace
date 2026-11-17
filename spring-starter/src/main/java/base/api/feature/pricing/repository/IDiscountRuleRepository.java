package base.api.feature.pricing.repository;

import base.api.shared.entity.pricing.DiscountRuleModel;
import base.api.shared.enums.DiscountRuleStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IDiscountRuleRepository extends JpaRepository<DiscountRuleModel, Long> {
    Optional<DiscountRuleModel> findByCodeAndStatus(String code, DiscountRuleStatus status);
}

