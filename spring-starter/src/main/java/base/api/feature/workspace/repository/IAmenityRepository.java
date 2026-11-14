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

    boolean existsByNameIgnoreCaseAndOrganizerIsNull(String name);

    boolean existsByNameIgnoreCaseAndOrganizerIsNullAndIdNot(String name, Long id);

    boolean existsByNameIgnoreCaseAndOrganizerId(String name, Long organizerId);

    boolean existsByNameIgnoreCaseAndOrganizerIdAndIdNot(String name, Long organizerId, Long id);

    List<AmenityModel> findByActiveTrueOrderByNameAsc();

    List<AmenityModel> findByOrganizerIsNullAndActiveTrueOrderByNameAsc();

    @Query("SELECT a FROM AmenityModel a WHERE a.active = true AND a.organizer.id = :organizerId ORDER BY a.name ASC")
    List<AmenityModel> findAvailableForOrganizer(@Param("organizerId") Long organizerId);

    @Query("SELECT a FROM AmenityModel a WHERE a.organizer.id = :organizerId AND " +
            "(:category IS NULL OR a.category = :category) AND " +
            "(:active IS NULL OR a.active = :active) AND " +
            "(:search IS NULL OR LOWER(a.name) LIKE LOWER(CONCAT('%', :search, '%')))")
    Page<AmenityModel> findByOrganizerFiltered(
            @Param("organizerId") Long organizerId,
            @Param("category") AmenityCategory category,
            @Param("active") Boolean active,
            @Param("search") String search,
            Pageable pageable
    );

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
