package base.api.feature.pricing.repository;

import base.api.shared.entity.pricing.MembershipPlanModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IMembershipPlanRepository extends JpaRepository<MembershipPlanModel, Long> {
    List<MembershipPlanModel> findByOrganizerIdAndActiveTrue(Long organizerId);
}
