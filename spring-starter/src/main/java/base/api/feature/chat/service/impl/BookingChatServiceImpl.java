package base.api.feature.chat.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.chat.dto.request.SendChatMessageRequestDTO;
import base.api.feature.chat.dto.response.BookingChatMessageResponseDTO;
import base.api.feature.chat.dto.response.BookingConversationResponseDTO;
import base.api.feature.chat.mapper.BookingChatMapper;
import base.api.feature.chat.repository.IBookingChatMessageRepository;
import base.api.feature.chat.repository.IBookingConversationRepository;
import base.api.feature.chat.service.IBookingChatService;
import base.api.feature.chat.service.IChatProfanityFilterService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.chat.BookingChatMessageModel;
import base.api.shared.entity.chat.BookingConversationModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class BookingChatServiceImpl implements IBookingChatService {

    private static final Set<BookingStatus> ALLOWED_BOOKING_STATUSES = Set.of(
            BookingStatus.CONFIRMED,
            BookingStatus.CHECKED_IN,
            BookingStatus.COMPLETED
    );

    private final IBookingConversationRepository conversationRepository;
    private final IBookingChatMessageRepository chatMessageRepository;
    private final IBookingRepository bookingRepository;
    private final IUserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;
    private final IChatProfanityFilterService profanityFilterService;

    @Override
    @Transactional
    public BookingConversationResponseDTO getOrCreateConversation(Long bookingId, Long callerId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Đơn đặt chỗ không tồn tại"));

        Long customerId = booking.getCustomer().getId();
        Long organizerId = booking.getWorkspace().getOrganizer().getId();

        // Strict Ownership Defense: Chỉ cho phép Customer hoặc Workspace Organizer truy cập
        if (!callerId.equals(customerId) && !callerId.equals(organizerId)) {
            throw new NotFoundException("Đơn đặt chỗ không tồn tại");
        }

        // Quy tắc nghiệp vụ: Chỉ có thể nhắn tin khi đã booking thành công (CONFIRMED, CHECKED_IN, COMPLETED)
        if (!ALLOWED_BOOKING_STATUSES.contains(booking.getStatus())) {
            throw new ConflictException("Chỉ có thể nhắn tin hỗ trợ khi đơn đặt chỗ đã được xác nhận (CONFIRMED). Trạng thái hiện tại: "
                    + booking.getStatus());
        }

        BookingConversationModel conversation = conversationRepository.findByBookingIdWithDetails(bookingId)
                .orElseGet(() -> {
                    BookingConversationModel newConv = new BookingConversationModel();
                    newConv.setBooking(booking);
                    newConv.setCustomer(booking.getCustomer());
                    newConv.setOrganizer(booking.getWorkspace().getOrganizer());
                    newConv.setWorkspace(booking.getWorkspace());
                    newConv.setLastMessagePreview("Bắt đầu cuộc trò chuyện hỗ trợ đơn #" + booking.getBookingCode());
                    newConv.setLastMessageAt(LocalDateTime.now());
                    newConv.setCustomerUnreadCount(0);
                    newConv.setOrganizerUnreadCount(0);
                    return conversationRepository.save(newConv);
                });

        return BookingChatMapper.toDto(conversation, callerId);
    }

    @Override
    @Transactional(readOnly = true)
    public BookingConversationResponseDTO getConversationById(Long conversationId, Long callerId) {
        BookingConversationModel conversation = getAndValidateConversation(conversationId, callerId);
        return BookingChatMapper.toDto(conversation, callerId);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingConversationResponseDTO> getConversations(Long callerId, String roleContext, Pageable pageable) {
        Page<BookingConversationModel> page;
        if ("ORGANIZER".equalsIgnoreCase(roleContext)) {
            page = conversationRepository.findByOrganizerId(callerId, pageable);
        } else if ("CUSTOMER".equalsIgnoreCase(roleContext)) {
            page = conversationRepository.findByCustomerId(callerId, pageable);
        } else {
            // Mặc định thử lấy theo Organizer trước, nếu không có thì lấy Customer
            page = conversationRepository.findByOrganizerId(callerId, pageable);
            if (page.isEmpty()) {
                page = conversationRepository.findByCustomerId(callerId, pageable);
            }
        }

        return page.map(conv -> BookingChatMapper.toDto(conv, callerId));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingChatMessageResponseDTO> getMessages(Long conversationId, Long callerId, Pageable pageable) {
        getAndValidateConversation(conversationId, callerId);
        Page<BookingChatMessageModel> page = chatMessageRepository.findByConversationIdOrderByIdDesc(conversationId, pageable);
        return page.map(BookingChatMapper::toDto);
    }

    @Override
    @Transactional
    public BookingChatMessageResponseDTO sendMessage(Long conversationId, Long senderId, SendChatMessageRequestDTO request) {
        BookingConversationModel conversation = conversationRepository.findByIdWithDetailsForUpdate(conversationId)
                .orElseThrow(() -> new NotFoundException("Hội thoại không tồn tại"));

        Long customerId = conversation.getCustomer().getId();
        Long organizerId = conversation.getOrganizer().getId();

        if (!senderId.equals(customerId) && !senderId.equals(organizerId)) {
            throw new NotFoundException("Hội thoại không tồn tại");
        }

        UserModel sender = userRepository.findById(senderId)
                .orElseThrow(() -> new NotFoundException("Người dùng không tồn tại"));

        // Lọc từ cấm và che dấu bằng *** trước khi lưu và phát sóng
        String cleanContent = profanityFilterService.filterAndMask(request.getContent().trim());
        if (!cleanContent.equals(request.getContent().trim())) {
            log.warn("Nội dung tin nhắn từ người dùng ID {} chứa từ cấm và đã được che dấu: '{}' -> '{}'",
                    senderId, request.getContent().trim(), cleanContent);
        }

        BookingChatMessageModel message = new BookingChatMessageModel();
        message.setConversation(conversation);
        message.setSender(sender);
        message.setMessageType(request.getMessageType() != null ? request.getMessageType() : "TEXT");
        message.setContent(cleanContent);
        message.setAttachmentUrl(request.getAttachmentUrl());
        message.setAttachmentName(request.getAttachmentName());
        message.setRead(false);

        BookingChatMessageModel savedMessage = chatMessageRepository.save(message);

        // Cập nhật thông tin cuộc hội thoại
        String preview = cleanContent;
        if (preview.length() > 200) {
            preview = preview.substring(0, 197) + "...";
        }
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setLastMessagePreview(preview);

        Long recipientId;
        if (senderId.equals(conversation.getCustomer().getId())) {
            conversation.setOrganizerUnreadCount(conversation.getOrganizerUnreadCount() + 1);
            recipientId = conversation.getOrganizer().getId();
        } else {
            conversation.setCustomerUnreadCount(conversation.getCustomerUnreadCount() + 1);
            recipientId = conversation.getCustomer().getId();
        }
        conversationRepository.save(conversation);

        BookingChatMessageResponseDTO messageDto = BookingChatMapper.toDto(savedMessage);

        // Realtime broadcast qua WebSocket STOMP
        try {
            messagingTemplate.convertAndSend("/topic/conversations/" + conversationId, messageDto);
            // Bắn notification tới người nhận
            BookingConversationResponseDTO recipientConvDto = BookingChatMapper.toDto(conversation, recipientId);
            messagingTemplate.convertAndSend("/topic/users/" + recipientId + "/conversations", recipientConvDto);
        } catch (Exception e) {
            log.error("Lỗi khi gửi WebSocket broadcast: {}", e.getMessage());
        }

        return messageDto;
    }

    @Override
    @Transactional
    public void markAsRead(Long conversationId, Long readerId) {
        BookingConversationModel conversation = getAndValidateConversation(conversationId, readerId);
        chatMessageRepository.markMessagesAsRead(conversationId, readerId);

        if (readerId.equals(conversation.getCustomer().getId())) {
            conversation.setCustomerUnreadCount(0);
        } else if (readerId.equals(conversation.getOrganizer().getId())) {
            conversation.setOrganizerUnreadCount(0);
        }
        conversationRepository.save(conversation);

        try {
            messagingTemplate.convertAndSend(
                    "/topic/conversations/" + conversationId + "/read",
                    Map.of("conversationId", conversationId, "readerId", readerId)
            );
        } catch (Exception e) {
            log.error("Lỗi khi gửi WebSocket read receipt: {}", e.getMessage());
        }
    }

    private BookingConversationModel getAndValidateConversation(Long conversationId, Long callerId) {
        BookingConversationModel conversation = conversationRepository.findByIdWithDetails(conversationId)
                .orElseThrow(() -> new NotFoundException("Hội thoại không tồn tại"));

        Long customerId = conversation.getCustomer().getId();
        Long organizerId = conversation.getOrganizer().getId();

        if (!callerId.equals(customerId) && !callerId.equals(organizerId)) {
            throw new NotFoundException("Hội thoại không tồn tại");
        }

        return conversation;
    }
}
