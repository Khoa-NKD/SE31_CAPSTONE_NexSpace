package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.enums.AmenityCategory;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IAmenityRepository extends JpaRepository<AmenityModel, Long> {

    List<AmenityModel> findByCategory(AmenityCategory category);

    boolean existsByNameIgnoreCase(String name);

    boolean existsByNameIgnoreCaseAndIdNot(String name, Long id);

    List<AmenityModel> findByActiveTrueOrderByNameAsc();

    @Query("SELECT a FROM AmenityModel a WHERE " +
            "(:category IS NULL OR a.category = :category) AND " +
            "(:active IS NULL OR a.active = :active) AND " +
            "(:search IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<AmenityModel> findFiltered(
            @Param("category") AmenityCategory category,
            @Param("active") Boolean active,
            @Param("search") String search,
            Pageable pageable
    );
}
