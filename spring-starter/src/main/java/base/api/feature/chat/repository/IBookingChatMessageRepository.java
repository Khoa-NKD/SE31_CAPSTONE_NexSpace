package base.api.feature.chat.repository;

import base.api.shared.entity.chat.BookingChatMessageModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface IBookingChatMessageRepository extends JpaRepository<BookingChatMessageModel, Long> {

    @Query(value = """
            SELECT m FROM BookingChatMessageModel m
            JOIN FETCH m.sender s
            WHERE m.conversation.id = :conversationId
            ORDER BY m.id DESC
            """,
            countQuery = """
            SELECT COUNT(m) FROM BookingChatMessageModel m
            WHERE m.conversation.id = :conversationId
            """)
    Page<BookingChatMessageModel> findByConversationIdOrderByIdDesc(
            @Param("conversationId") Long conversationId, Pageable pageable);

    @Query("""
            SELECT m FROM BookingChatMessageModel m
            JOIN FETCH m.sender s
            WHERE m.conversation.id = :conversationId
            ORDER BY m.id ASC
            """)
    List<BookingChatMessageModel> findTop50ByConversationIdOrderByIdAsc(@Param("conversationId") Long conversationId);

    @Modifying
    @Query("""
            UPDATE BookingChatMessageModel m
            SET m.isRead = true
            WHERE m.conversation.id = :conversationId
              AND m.sender.id != :readerId
              AND m.isRead = false
            """)
    int markMessagesAsRead(@Param("conversationId") Long conversationId, @Param("readerId") Long readerId);
}
