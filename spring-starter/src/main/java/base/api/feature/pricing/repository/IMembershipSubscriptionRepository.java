package base.api.feature.pricing.repository;

import base.api.shared.entity.pricing.MembershipSubscriptionModel;
import base.api.shared.enums.SubscriptionStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IMembershipSubscriptionRepository extends JpaRepository<MembershipSubscriptionModel, Long> {
    List<MembershipSubscriptionModel> findByCustomerIdAndStatus(Long customerId, SubscriptionStatus status);
}

