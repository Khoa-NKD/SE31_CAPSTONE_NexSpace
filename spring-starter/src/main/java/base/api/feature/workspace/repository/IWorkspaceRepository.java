package base.api.feature.workspace.repository;

import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.ResourceCategory;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface IWorkspaceRepository extends JpaRepository<WorkspaceModel, Long> {
    List<WorkspaceModel> findByOrganizerIdOrderByIdDesc(Long organizerId);

    @org.springframework.data.jpa.repository.Lock(jakarta.persistence.LockModeType.PESSIMISTIC_WRITE)
    @Query("select w from WorkspaceModel w where w.id = :id and w.organizer.id = :actorId")
    Optional<WorkspaceModel> findOwnedForResourceUpdate(@Param("id") Long id, @Param("actorId") Long actorId);

    @Query("""
            SELECT w FROM WorkspaceModel w
            WHERE w.organizer.id = :organizerId
              AND (:status IS NULL OR w.status = :status)
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchByOrganizer(
            @Param("organizerId") Long organizerId,
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);

    Optional<WorkspaceModel> findByIdAndOrganizerId(Long id, Long organizerId);

    Optional<WorkspaceModel> findByIdAndStatus(Long id, WorkspaceStatus status);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchPublic(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY (
                SELECT COALESCE(MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour)), 999999999)
                FROM BookableResourceModel r
                WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
            ) ASC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchPublicOrderByPriceAsc(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY (
                SELECT COALESCE(MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour)), 0)
                FROM BookableResourceModel r
                WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
            ) DESC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchPublicOrderByPriceDesc(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY (
                SELECT COALESCE(AVG(cr.rating), 0)
                FROM CustomerReviewModel cr
                WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
            ) DESC, (
                SELECT COUNT(cr2.id)
                FROM CustomerReviewModel cr2
                WHERE cr2.workspace = w AND cr2.status = base.api.shared.enums.ReviewStatus.PUBLISHED
            ) DESC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchPublicOrderByRatingDesc(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            ORDER BY (
                SELECT COUNT(b.id)
                FROM BookingModel b
                WHERE b.workspace = w
            ) DESC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchPublicOrderByPopular(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            """)
    Page<WorkspaceModel> filterPublic(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            @Param("city") String city,
            @Param("district") String district,
            @Param("category") WorkspaceCategory category,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            @Param("hasAmenityFilter") boolean hasAmenityFilter,
            @Param("amenityIds") List<Long> amenityIds,
            @Param("amenityCount") Long amenityCount,
            @Param("hasResourceCatFilter") boolean hasResourceCatFilter,
            @Param("resourceCategories") List<ResourceCategory> resourceCategories,
            @Param("minRating") Double minRating,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            ORDER BY (
                SELECT COALESCE(MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour)), 999999999)
                FROM BookableResourceModel r
                WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
            ) ASC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            """)
    Page<WorkspaceModel> filterPublicOrderByPriceAsc(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            @Param("city") String city,
            @Param("district") String district,
            @Param("category") WorkspaceCategory category,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            @Param("hasAmenityFilter") boolean hasAmenityFilter,
            @Param("amenityIds") List<Long> amenityIds,
            @Param("amenityCount") Long amenityCount,
            @Param("hasResourceCatFilter") boolean hasResourceCatFilter,
            @Param("resourceCategories") List<ResourceCategory> resourceCategories,
            @Param("minRating") Double minRating,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            ORDER BY (
                SELECT COALESCE(MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour)), 0)
                FROM BookableResourceModel r
                WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
            ) DESC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            """)
    Page<WorkspaceModel> filterPublicOrderByPriceDesc(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            @Param("city") String city,
            @Param("district") String district,
            @Param("category") WorkspaceCategory category,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            @Param("hasAmenityFilter") boolean hasAmenityFilter,
            @Param("amenityIds") List<Long> amenityIds,
            @Param("amenityCount") Long amenityCount,
            @Param("hasResourceCatFilter") boolean hasResourceCatFilter,
            @Param("resourceCategories") List<ResourceCategory> resourceCategories,
            @Param("minRating") Double minRating,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            ORDER BY (
                SELECT COALESCE(AVG(cr.rating), 0)
                FROM CustomerReviewModel cr
                WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
            ) DESC, (
                SELECT COUNT(cr2.id)
                FROM CustomerReviewModel cr2
                WHERE cr2.workspace = w AND cr2.status = base.api.shared.enums.ReviewStatus.PUBLISHED
            ) DESC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            """)
    Page<WorkspaceModel> filterPublicOrderByRatingDesc(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            @Param("city") String city,
            @Param("district") String district,
            @Param("category") WorkspaceCategory category,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            @Param("hasAmenityFilter") boolean hasAmenityFilter,
            @Param("amenityIds") List<Long> amenityIds,
            @Param("amenityCount") Long amenityCount,
            @Param("hasResourceCatFilter") boolean hasResourceCatFilter,
            @Param("resourceCategories") List<ResourceCategory> resourceCategories,
            @Param("minRating") Double minRating,
            Pageable pageable);

    @Query(value = """
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            ORDER BY (
                SELECT COUNT(b.id)
                FROM BookingModel b
                WHERE b.workspace = w
            ) DESC, w.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(w) FROM WorkspaceModel w
            WHERE w.status = :status
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :search, '%')))
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city) OR LOWER(w.city) LIKE LOWER(CONCAT('%', :city, '%')))
              AND (:district IS NULL OR LOWER(w.district) = LOWER(:district) OR LOWER(w.district) LIKE LOWER(CONCAT('%', :district, '%')))
              AND (:category IS NULL OR w.category = :category)
              AND (:minPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) >= :minPrice)
              AND (:maxPrice IS NULL OR (
                  SELECT MIN(COALESCE(r.pricePerHour, r.resourceType.pricePerHour))
                  FROM BookableResourceModel r
                  WHERE r.floorPlan.workspace = w AND r.status = base.api.shared.enums.BookableResourceStatus.ACTIVE AND r.parentRoom IS NULL
              ) <= :maxPrice)
              AND (:hasAmenityFilter = false OR (
                  SELECT COUNT(DISTINCT wa.amenity.id)
                  FROM WorkspaceAmenityModel wa
                  WHERE wa.workspace = w AND wa.amenity.id IN :amenityIds
              ) >= :amenityCount)
              AND (:hasResourceCatFilter = false OR EXISTS (
                  SELECT 1 FROM ResourceTypeModel rt
                  WHERE rt.workspace = w AND rt.active = true AND rt.category IN :resourceCategories
              ))
              AND (:minRating IS NULL OR (
                  SELECT COALESCE(AVG(cr.rating), 0)
                  FROM CustomerReviewModel cr
                  WHERE cr.workspace = w AND cr.status = base.api.shared.enums.ReviewStatus.PUBLISHED
              ) >= :minRating)
            """)
    Page<WorkspaceModel> filterPublicOrderByPopular(
            @Param("status") WorkspaceStatus status,
            @Param("search") String search,
            @Param("city") String city,
            @Param("district") String district,
            @Param("category") WorkspaceCategory category,
            @Param("minPrice") java.math.BigDecimal minPrice,
            @Param("maxPrice") java.math.BigDecimal maxPrice,
            @Param("hasAmenityFilter") boolean hasAmenityFilter,
            @Param("amenityIds") List<Long> amenityIds,
            @Param("amenityCount") Long amenityCount,
            @Param("hasResourceCatFilter") boolean hasResourceCatFilter,
            @Param("resourceCategories") List<ResourceCategory> resourceCategories,
            @Param("minRating") Double minRating,
            Pageable pageable);

    long countByStatus(WorkspaceStatus status);

    @Query("""
            SELECT w FROM WorkspaceModel w
            WHERE (:status IS NULL OR w.status = :status)
              AND (:city IS NULL OR LOWER(w.city) = LOWER(:city))
              AND (:search IS NULL OR LOWER(w.name) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.organizer.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(w.organizer.lastName) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<WorkspaceModel> searchAdmin(
            @Param("status") WorkspaceStatus status,
            @Param("city") String city,
            @Param("search") String search,
            Pageable pageable);

    @Query("""
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND w.featuredOrder IS NOT NULL
              AND (w.featuredUntil IS NULL OR w.featuredUntil > CURRENT_TIMESTAMP)
            ORDER BY w.featuredOrder ASC, w.createdAt DESC
            """)
    java.util.List<WorkspaceModel> findFeaturedWorkspaces(@Param("status") WorkspaceStatus status);

    @Query(value = """
            SELECT w.id AS id,
                   (ST_Distance_Sphere(POINT(w.longitude, w.latitude), POINT(:targetLng, :targetLat)) / 1000.0) AS distanceKm
            FROM workspace w
            WHERE w.status = 'ACTIVE'
              AND w.latitude IS NOT NULL
              AND w.longitude IS NOT NULL
              AND (ST_Distance_Sphere(POINT(w.longitude, w.latitude), POINT(:targetLng, :targetLat)) / 1000.0) <= :radiusKm
            ORDER BY distanceKm ASC
            """,
            countQuery = """
            SELECT COUNT(*)
            FROM workspace w
            WHERE w.status = 'ACTIVE'
              AND w.latitude IS NOT NULL
              AND w.longitude IS NOT NULL
              AND (ST_Distance_Sphere(POINT(w.longitude, w.latitude), POINT(:targetLng, :targetLat)) / 1000.0) <= :radiusKm
            """,
            nativeQuery = true)
    Page<WorkspaceDistanceProjection> findNearbyWorkspaceIds(
            @Param("targetLat") Double targetLat,
            @Param("targetLng") Double targetLng,
            @Param("radiusKm") Double radiusKm,
            Pageable pageable);

    @Query("""
            SELECT w FROM WorkspaceModel w
            WHERE w.status = :status
              AND (LOWER(w.name) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(w.address) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(w.district) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(w.city) LIKE LOWER(CONCAT('%', :query, '%'))
                   OR LOWER(w.description) LIKE LOWER(CONCAT('%', :query, '%')))
            ORDER BY (
                SELECT COUNT(b.id) FROM BookingModel b WHERE b.workspace = w
            ) DESC, w.createdAt DESC
            """)
    List<WorkspaceModel> findTopSuggestions(
            @Param("status") WorkspaceStatus status,
            @Param("query") String query,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT w.city FROM WorkspaceModel w
            WHERE w.status = :status
              AND w.city IS NOT NULL
              AND LOWER(w.city) LIKE LOWER(CONCAT('%', :query, '%'))
            """)
    List<String> findDistinctCitiesMatching(
            @Param("status") WorkspaceStatus status,
            @Param("query") String query,
            Pageable pageable);

    @Query("""
            SELECT DISTINCT w.district, w.city FROM WorkspaceModel w
            WHERE w.status = :status
              AND w.district IS NOT NULL
              AND LOWER(w.district) LIKE LOWER(CONCAT('%', :query, '%'))
            """)
    List<Object[]> findDistinctDistrictsMatching(
            @Param("status") WorkspaceStatus status,
            @Param("query") String query,
            Pageable pageable);
}

