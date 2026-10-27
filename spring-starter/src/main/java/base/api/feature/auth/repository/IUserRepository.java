package base.api.feature.auth.repository;

import base.api.shared.entity.UserModel;
import base.api.shared.enums.*;
import java.util.*;
import org.springframework.data.domain.*;
import org.springframework.data.jpa.repository.*;
import org.springframework.data.repository.query.Param;

public interface IUserRepository extends JpaRepository<UserModel, UUID> {
  Optional<UserModel> findByEmailIgnoreCase(String email);

  boolean existsByEmailIgnoreCase(String email);

  default Optional<UserModel> findByLogin(String login) {
    return login == null || login.isBlank()
        ? Optional.empty()
        : findByEmailIgnoreCase(login.trim());
  }

  @Query(
      """
        SELECT u FROM UserModel u
        WHERE (:search IS NULL OR LOWER(u.email) LIKE LOWER(CONCAT('%', :search, '%')) OR LOWER(u.fullName) LIKE LOWER(CONCAT('%', :search, '%')))
        AND (:role IS NULL OR u.role = :role) AND (:status IS NULL OR u.status = :status)
        """)
  Page<UserModel> search(
      @Param("search") String search,
      @Param("role") UserRole role,
      @Param("status") UserStatus status,
      Pageable pageable);
}
