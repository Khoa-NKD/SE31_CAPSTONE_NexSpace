package base.api.feature.booking.repository;

import base.api.shared.entity.booking.BookingModel;
import base.api.shared.enums.BookingStatus;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface IBookingRepository extends JpaRepository<BookingModel, Long> {

    Optional<BookingModel> findByBookingCode(String bookingCode);

    Optional<BookingModel> findByBookingCodeAndCustomerId(String bookingCode, Long customerId);

    Page<BookingModel> findByCustomerIdOrderByCreatedAtDesc(Long customerId, Pageable pageable);

    Page<BookingModel> findByCustomerIdAndStatusOrderByCreatedAtDesc(Long customerId, BookingStatus status, Pageable pageable);

    Page<BookingModel> findByWorkspaceId(Long workspaceId, Pageable pageable);

    @Query("""
            SELECT b FROM BookingModel b
            WHERE b.workspace.organizer.id = :organizerId
              AND (:workspaceId IS NULL OR b.workspace.id = :workspaceId)
              AND (:status IS NULL OR b.status = :status)
              AND (b.startTime >= COALESCE(:startTimeFrom, b.startTime))
              AND (b.startTime <= COALESCE(:startTimeTo, b.startTime))
              AND (:search IS NULL OR LOWER(b.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.resource.label) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.resource.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<BookingModel> findOrganizerBookings(
            @Param("organizerId") Long organizerId,
            @Param("workspaceId") Long workspaceId,
            @Param("status") BookingStatus status,
            @Param("startTimeFrom") LocalDateTime startTimeFrom,
            @Param("startTimeTo") LocalDateTime startTimeTo,
            @Param("search") String search,
            Pageable pageable);

    @Query("""
            SELECT b FROM BookingModel b
            WHERE (:workspaceId IS NULL OR b.workspace.id = :workspaceId)
              AND (:status IS NULL OR b.status = :status)
              AND (b.startTime >= COALESCE(:startTimeFrom, b.startTime))
              AND (b.startTime <= COALESCE(:startTimeTo, b.startTime))
              AND (:search IS NULL OR LOWER(b.bookingCode) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.email) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.firstName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.customer.lastName) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.resource.label) LIKE LOWER(CONCAT('%', :search, '%'))
                   OR LOWER(b.resource.name) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<BookingModel> findAllBookingsAdmin(
            @Param("workspaceId") Long workspaceId,
            @Param("status") BookingStatus status,
            @Param("startTimeFrom") LocalDateTime startTimeFrom,
            @Param("startTimeTo") LocalDateTime startTimeTo,
            @Param("search") String search,
            Pageable pageable);

    @Query("""
            SELECT b FROM BookingModel b
            JOIN FETCH b.workspace w
            JOIN FETCH b.customer c
            JOIN FETCH b.resource r
            WHERE w.organizer.id = :organizerId
              AND (:workspaceId IS NULL OR w.id = :workspaceId)
              AND (:status IS NULL OR b.status = :status)
              AND (b.startTime >= COALESCE(:startTimeFrom, b.startTime))
              AND (b.startTime <= COALESCE(:startTimeTo, b.startTime))
            ORDER BY b.startTime ASC
            """)
    List<BookingModel> findOrganizerCalendarBookings(
            @Param("organizerId") Long organizerId,
            @Param("workspaceId") Long workspaceId,
            @Param("status") BookingStatus status,
            @Param("startTimeFrom") LocalDateTime startTimeFrom,
            @Param("startTimeTo") LocalDateTime startTimeTo);

    @Query("""
            SELECT b FROM BookingModel b
            JOIN FETCH b.workspace w
            JOIN FETCH b.customer c
            JOIN FETCH b.resource r
            WHERE (:workspaceId IS NULL OR w.id = :workspaceId)
              AND (:status IS NULL OR b.status = :status)
              AND (b.startTime >= COALESCE(:startTimeFrom, b.startTime))
              AND (b.startTime <= COALESCE(:startTimeTo, b.startTime))
            ORDER BY b.startTime ASC
            """)
    List<BookingModel> findAllCalendarBookingsAdmin(
            @Param("workspaceId") Long workspaceId,
            @Param("status") BookingStatus status,
            @Param("startTimeFrom") LocalDateTime startTimeFrom,
            @Param("startTimeTo") LocalDateTime startTimeTo);

    List<BookingModel> findByStatusAndHoldExpiresAtBefore(BookingStatus status, LocalDateTime now);

    @Query("""
            SELECT b FROM BookingModel b
            WHERE b.resource.id = :resourceId
              AND b.status IN :activeStatuses
              AND (b.status != base.api.shared.enums.BookingStatus.PENDING_PAYMENT OR b.holdExpiresAt IS NULL OR b.holdExpiresAt > :now)
              AND b.startTime < :endTime
              AND b.endTime > :startTime
            """)
    List<BookingModel> findConflictingBookingsWithHold(
            @Param("resourceId") Long resourceId,
            @Param("startTime") LocalDateTime startTime,
            @Param("endTime") LocalDateTime endTime,
            @Param("activeStatuses") List<BookingStatus> activeStatuses,
            @Param("now") LocalDateTime now);

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

    boolean existsByBookingCode(String bookingCode);
}
