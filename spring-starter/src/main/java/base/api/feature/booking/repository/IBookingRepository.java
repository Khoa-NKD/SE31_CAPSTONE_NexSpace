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

    Page<BookingModel> findByCustomerId(Long customerId, Pageable pageable);

    Page<BookingModel> findByWorkspaceId(Long workspaceId, Pageable pageable);

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
}

