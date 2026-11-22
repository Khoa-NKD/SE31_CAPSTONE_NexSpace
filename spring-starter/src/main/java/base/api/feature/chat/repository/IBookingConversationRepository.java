package base.api.feature.chat.repository;

import base.api.shared.entity.chat.BookingConversationModel;
import jakarta.persistence.LockModeType;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface IBookingConversationRepository extends JpaRepository<BookingConversationModel, Long> {

    @Query("""
            SELECT c FROM BookingConversationModel c
            JOIN FETCH c.booking b
            JOIN FETCH c.customer cust
            JOIN FETCH c.organizer org
            JOIN FETCH c.workspace ws
            WHERE c.booking.id = :bookingId
            """)
    Optional<BookingConversationModel> findByBookingIdWithDetails(@Param("bookingId") Long bookingId);

    @Query("""
            SELECT c FROM BookingConversationModel c
            JOIN FETCH c.booking b
            LEFT JOIN FETCH b.resource res
            LEFT JOIN FETCH res.resourceType rt
            JOIN FETCH c.customer cust
            JOIN FETCH c.organizer org
            JOIN FETCH c.workspace ws
            WHERE c.id = :id
            """)
    Optional<BookingConversationModel> findByIdWithDetails(@Param("id") Long id);

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("""
            SELECT c FROM BookingConversationModel c
            JOIN FETCH c.booking b
            JOIN FETCH c.customer cust
            JOIN FETCH c.organizer org
            JOIN FETCH c.workspace ws
            WHERE c.id = :id
            """)
    Optional<BookingConversationModel> findByIdWithDetailsForUpdate(@Param("id") Long id);

    @Query(value = """
            SELECT c FROM BookingConversationModel c
            JOIN FETCH c.booking b
            JOIN FETCH c.customer cust
            JOIN FETCH c.organizer org
            JOIN FETCH c.workspace ws
            WHERE c.customer.id = :customerId
            ORDER BY c.lastMessageAt DESC NULLS LAST, c.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(c) FROM BookingConversationModel c
            WHERE c.customer.id = :customerId
            """)
    Page<BookingConversationModel> findByCustomerId(@Param("customerId") Long customerId, Pageable pageable);

    @Query(value = """
            SELECT c FROM BookingConversationModel c
            JOIN FETCH c.booking b
            JOIN FETCH c.customer cust
            JOIN FETCH c.organizer org
            JOIN FETCH c.workspace ws
            WHERE c.organizer.id = :organizerId
            ORDER BY c.lastMessageAt DESC NULLS LAST, c.createdAt DESC
            """,
            countQuery = """
            SELECT COUNT(c) FROM BookingConversationModel c
            WHERE c.organizer.id = :organizerId
            """)
    Page<BookingConversationModel> findByOrganizerId(@Param("organizerId") Long organizerId, Pageable pageable);
}
