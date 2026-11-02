package base.api.feature.auth.repository;

import base.api.shared.entity.RoleModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IRoleRepository extends JpaRepository<RoleModel, Long> {

    Optional<RoleModel> findByName(String name);
}
