package base.api.feature.chat.service;

import base.api.feature.chat.dto.request.SendChatMessageRequestDTO;
import base.api.feature.chat.dto.response.BookingChatMessageResponseDTO;
import base.api.feature.chat.dto.response.BookingConversationResponseDTO;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface IBookingChatService {

    BookingConversationResponseDTO getOrCreateConversation(Long bookingId, Long callerId);

    BookingConversationResponseDTO getConversationById(Long conversationId, Long callerId);

    Page<BookingConversationResponseDTO> getConversations(Long callerId, String roleContext, Pageable pageable);

    Page<BookingChatMessageResponseDTO> getMessages(Long conversationId, Long callerId, Pageable pageable);

    BookingChatMessageResponseDTO sendMessage(Long conversationId, Long senderId, SendChatMessageRequestDTO request);

    void markAsRead(Long conversationId, Long readerId);
}
