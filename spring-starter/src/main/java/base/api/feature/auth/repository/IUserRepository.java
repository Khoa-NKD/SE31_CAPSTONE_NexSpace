package base.api.feature.auth.repository;

import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IUserRepository extends JpaRepository<UserModel, Long> {

    Optional<UserModel> findByUserNameIgnoreCase(String userName);

    Optional<UserModel> findByEmailIgnoreCase(String email);

    /** Tìm theo username hoặc email (có '@' thì coi là email). */
    default Optional<UserModel> findByLogin(String login) {
        if (login == null || login.isBlank()) {
            return Optional.empty();
        }
        String value = login.trim();
        return value.contains("@") ? findByEmailIgnoreCase(value) : findByUserNameIgnoreCase(value);
    }

    boolean existsByUserNameIgnoreCase(String userName);

    boolean existsByEmailIgnoreCase(String email);

    @Query("""
            SELECT u FROM UserModel u
            WHERE (:search IS NULL
                   OR LOWER(u.userName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(u.lastName) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:roleName IS NULL OR u.roleEntity.name = :roleName)
              AND (:status IS NULL OR u.status = :status)
            """)
    Page<UserModel> search(@Param("search") String search,
                           @Param("roleName") String roleName,
                           @Param("status") UserStatus status,
                           Pageable pageable);
}
