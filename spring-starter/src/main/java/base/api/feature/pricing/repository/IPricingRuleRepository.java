package base.api.feature.pricing.repository;

import base.api.shared.entity.pricing.PricingRuleModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IPricingRuleRepository extends JpaRepository<PricingRuleModel, Long> {
    List<PricingRuleModel> findByWorkspaceId(Long workspaceId);
    List<PricingRuleModel> findByResourceTypeId(Long resourceTypeId);
}

