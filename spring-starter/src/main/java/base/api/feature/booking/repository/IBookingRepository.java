package base.api.feature.booking.repository;

import base.api.shared.entity.booking.BookingModel;
import base.api.shared.enums.BookingStatus;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.Collection;
import java.util.List;
import java.util.Optional;

@Repository
public interface IBookingRepository extends JpaRepository<BookingModel, Long> {

    Optional<BookingModel> findByBookingCode(String bookingCode);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT b FROM BookingModel b WHERE b.id = :id")
    Optional<BookingModel> findByIdForUpdate(@Param("id") Long id);

    Page<BookingModel> findByCustomerId(Long customerId, Pageable pageable);

    @Query(value = """
            SELECT b FROM BookingModel b
            LEFT JOIN FETCH b.workspace
            LEFT JOIN FETCH b.resource
            WHERE b.customer.id = :customerId
              AND (:status IS NULL OR b.status = :status)
            """,
            countQuery = """
            SELECT COUNT(b) FROM BookingModel b
            WHERE b.customer.id = :customerId
              AND (:status IS NULL OR b.status = :status)
            """)
    Page<BookingModel> findCustomerBookingsWithDetails(
            @Param("customerId") Long customerId,
            @Param("status") BookingStatus status,
            Pageable pageable
    );

    List<BookingModel> findByCustomerIdAndStatus(Long customerId, BookingStatus status);

    @Query(value = """
            SELECT b FROM BookingModel b
            LEFT JOIN FETCH b.customer
            LEFT JOIN FETCH b.workspace
            LEFT JOIN FETCH b.resource
            WHERE (:status IS NULL OR b.status = :status)
              AND (:search IS NULL OR LOWER(b.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.workspace.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            countQuery = """
            SELECT COUNT(b) FROM BookingModel b
            WHERE (:status IS NULL OR b.status = :status)
              AND (:search IS NULL OR LOWER(b.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.workspace.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<BookingModel> findAdminBookings(
            @Param("status") BookingStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    @Query(value = """
            SELECT b FROM BookingModel b
            LEFT JOIN FETCH b.customer
            LEFT JOIN FETCH b.workspace
            LEFT JOIN FETCH b.resource
            WHERE b.workspace.organizer.id = :organizerId
              AND (:status IS NULL OR b.status = :status)
              AND (:search IS NULL OR LOWER(b.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.resource.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """,
            countQuery = """
            SELECT COUNT(b) FROM BookingModel b
            WHERE b.workspace.organizer.id = :organizerId
              AND (:status IS NULL OR b.status = :status)
              AND (:search IS NULL OR LOWER(b.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.resource.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<BookingModel> findOrganizerBookings(
            @Param("organizerId") Long organizerId,
            @Param("status") BookingStatus status,
            @Param("search") String search,
            Pageable pageable
    );

    long countByStatus(BookingStatus status);

    long countByWorkspaceOrganizerIdAndStatus(Long organizerId, BookingStatus status);

    long countByWorkspaceOrganizerId(Long organizerId);

    Page<BookingModel> findByWorkspaceId(Long workspaceId, Pageable pageable);

    long countByWorkspaceId(Long workspaceId);

    @Query("""
            SELECT b.workspace.id, COUNT(b.id)
            FROM BookingModel b
            WHERE b.workspace.id IN :workspaceIds
            GROUP BY b.workspace.id
            """)
    List<Object[]> countBookingsByWorkspaceIds(@Param("workspaceIds") Collection<Long> workspaceIds);

    @Query("""
            SELECT b FROM BookingModel b
            WHERE b.resource.id = :resourceId
              AND b.status IN :activeStatuses
              AND b.startTime < :endTime
              AND b.endTime > :startTime
            """)
    List<BookingModel> findConflictingBookings(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("activeStatuses") List<BookingStatus> activeStatuses);

    @Query("SELECT b FROM BookingModel b WHERE b.status = :status AND b.holdExpiresAt < :now")
    List<BookingModel> findExpiredHoldBookings(
            @Param("status") BookingStatus status,
            @Param("now") LocalDateTime now
    );
}
