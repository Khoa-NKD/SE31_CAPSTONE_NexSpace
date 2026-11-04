package base.api.feature.auth.repository;

import base.api.shared.entity.RoleModel;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IRoleRepository extends JpaRepository<RoleModel, Long> {

    Optional<RoleModel> findByName(String name);

    /** Serialize approval's conditional tax-ID uniqueness check without changing existing indexes. */
    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @org.springframework.data.jpa.repository.Query("SELECT r FROM RoleModel r WHERE r.name = :name")
    Optional<RoleModel> findByNameForOrganizerApproval(@org.springframework.data.repository.query.Param("name") String name);
}
