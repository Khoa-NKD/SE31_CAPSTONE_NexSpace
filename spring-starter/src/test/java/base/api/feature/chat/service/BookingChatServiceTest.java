package base.api.feature.chat.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.chat.dto.request.SendChatMessageRequestDTO;
import base.api.feature.chat.dto.response.BookingChatMessageResponseDTO;
import base.api.feature.chat.dto.response.BookingConversationResponseDTO;
import base.api.feature.chat.repository.IBookingChatMessageRepository;
import base.api.feature.chat.repository.IBookingConversationRepository;
import base.api.feature.chat.service.impl.BookingChatServiceImpl;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.chat.BookingChatMessageModel;
import base.api.shared.entity.chat.BookingConversationModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.messaging.simp.SimpMessagingTemplate;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class BookingChatServiceTest {

    @Mock
    private IBookingConversationRepository conversationRepository;
    @Mock
    private IBookingChatMessageRepository chatMessageRepository;
    @Mock
    private IBookingRepository bookingRepository;
    @Mock
    private IUserRepository userRepository;
    @Mock
    private SimpMessagingTemplate messagingTemplate;
    @Mock
    private IChatProfanityFilterService profanityFilterService;

    @InjectMocks
    private BookingChatServiceImpl chatService;

    private UserModel customer;
    private UserModel organizer;
    private UserModel stranger;
    private WorkspaceModel workspace;
    private BookingModel booking;
    private BookingConversationModel conversation;

    @BeforeEach
    void setUp() {
        RoleModel custRole = new RoleModel();
        custRole.setId(1L);
        custRole.setName("ROLE_USER");

        RoleModel orgRole = new RoleModel();
        orgRole.setId(2L);
        orgRole.setName("ROLE_ORGANIZER");

        customer = new UserModel();
        customer.setId(10L);
        customer.setUserName("customer_huy");
        customer.setFirstName("Huy");
        customer.setLastName("Mai");
        customer.setRoleEntity(custRole);

        organizer = new UserModel();
        organizer.setId(20L);
        organizer.setUserName("organizer_space");
        organizer.setFirstName("Toan");
        organizer.setLastName("Le");
        organizer.setRoleEntity(orgRole);

        stranger = new UserModel();
        stranger.setId(99L);
        stranger.setUserName("stranger_user");
        stranger.setRoleEntity(custRole);

        workspace = new WorkspaceModel();
        workspace.setId(100L);
        workspace.setName("NexSpace Coworking");
        workspace.setOrganizer(organizer);

        booking = new BookingModel();
        booking.setId(500L);
        booking.setBookingCode("NX-5001");
        booking.setCustomer(customer);
        booking.setWorkspace(workspace);
        booking.setStatus(BookingStatus.CONFIRMED);

        conversation = new BookingConversationModel();
        conversation.setId(1L);
        conversation.setBooking(booking);
        conversation.setCustomer(customer);
        conversation.setOrganizer(organizer);
        conversation.setWorkspace(workspace);
        conversation.setLastMessageAt(LocalDateTime.now());
        conversation.setLastMessagePreview("Xin chào");
    }

    @Test
    @DisplayName("getOrCreateConversation - Ném NotFoundException khi booking không tồn tại")
    void getOrCreateConversation_whenBookingNotFound_throwsNotFoundException() {
        when(bookingRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> chatService.getOrCreateConversation(999L, 10L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Đơn đặt chỗ không tồn tại");
    }

    @Test
    @DisplayName("getOrCreateConversation - Ném NotFoundException khi caller không phải Customer hoặc Organizer (Strict Ownership Defense)")
    void getOrCreateConversation_whenCallerNotParticipant_throwsNotFoundException() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> chatService.getOrCreateConversation(500L, stranger.getId()))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Đơn đặt chỗ không tồn tại");
    }

    @Test
    @DisplayName("getOrCreateConversation - Ném ConflictException khi booking chưa hoàn tất (PENDING_PAYMENT)")
    void getOrCreateConversation_whenBookingPendingPayment_throwsConflictException() {
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> chatService.getOrCreateConversation(500L, customer.getId()))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("Chỉ có thể nhắn tin hỗ trợ khi đơn đặt chỗ đã được xác nhận");
    }

    @Test
    @DisplayName("getOrCreateConversation - Thành công tạo mới conversation khi booking CONFIRMED")
    void getOrCreateConversation_whenBookingConfirmed_successCreatesConversation() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));
        when(conversationRepository.findByBookingIdWithDetails(500L)).thenReturn(Optional.empty());
        when(conversationRepository.save(any(BookingConversationModel.class))).thenAnswer(inv -> {
            BookingConversationModel m = inv.getArgument(0);
            m.setId(1L);
            return m;
        });

        BookingConversationResponseDTO dto = chatService.getOrCreateConversation(500L, customer.getId());

        assertThat(dto).isNotNull();
        assertThat(dto.getBookingId()).isEqualTo(500L);
        assertThat(dto.getBookingCode()).isEqualTo("NX-5001");
        assertThat(dto.getCustomerId()).isEqualTo(10L);
        assertThat(dto.getOrganizerId()).isEqualTo(20L);
        verify(conversationRepository).save(any(BookingConversationModel.class));
    }

    @Test
    @DisplayName("getOrCreateConversation - Trả về conversation đã tồn tại")
    void getOrCreateConversation_whenAlreadyExists_returnsExisting() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));
        when(conversationRepository.findByBookingIdWithDetails(500L)).thenReturn(Optional.of(conversation));

        BookingConversationResponseDTO dto = chatService.getOrCreateConversation(500L, organizer.getId());

        assertThat(dto).isNotNull();
        assertThat(dto.getId()).isEqualTo(1L);
        assertThat(dto.getBookingCode()).isEqualTo("NX-5001");
    }

    @Test
    @DisplayName("sendMessage - Thành công gửi tin nhắn và phát WebSocket STOMP")
    void sendMessage_success() {
        when(conversationRepository.findByIdWithDetailsForUpdate(1L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(10L)).thenReturn(Optional.of(customer));
        when(profanityFilterService.filterAndMask(any())).thenAnswer(inv -> inv.getArgument(0));
        when(chatMessageRepository.save(any(BookingChatMessageModel.class))).thenAnswer(inv -> {
            BookingChatMessageModel m = inv.getArgument(0);
            m.setId(101L);
            return m;
        });

        SendChatMessageRequestDTO request = new SendChatMessageRequestDTO();
        request.setContent("Chào bạn, mình muốn hỏi về ổ cắm điện ở bàn làm việc.");

        BookingChatMessageResponseDTO result = chatService.sendMessage(1L, 10L, request);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(101L);
        assertThat(result.getContent()).isEqualTo("Chào bạn, mình muốn hỏi về ổ cắm điện ở bàn làm việc.");
        assertThat(conversation.getOrganizerUnreadCount()).isEqualTo(1);
        verify(conversationRepository).save(conversation);
        verify(messagingTemplate).convertAndSend(eq("/topic/conversations/1"), any(BookingChatMessageResponseDTO.class));
    }

    @Test
    @DisplayName("sendMessage - Khi tin nhắn chứa từ cấm thì tự động che dấu thành ***")
    void sendMessage_whenContainsBannedWord_masksContent() {
        when(conversationRepository.findByIdWithDetailsForUpdate(1L)).thenReturn(Optional.of(conversation));
        when(userRepository.findById(10L)).thenReturn(Optional.of(customer));
        when(profanityFilterService.filterAndMask("Mẹ kiếp, phục vụ tệ vcl"))
                .thenReturn("***, phục vụ tệ ***");
        when(chatMessageRepository.save(any(BookingChatMessageModel.class))).thenAnswer(inv -> {
            BookingChatMessageModel m = inv.getArgument(0);
            m.setId(102L);
            return m;
        });

        SendChatMessageRequestDTO request = new SendChatMessageRequestDTO();
        request.setContent("Mẹ kiếp, phục vụ tệ vcl");

        BookingChatMessageResponseDTO result = chatService.sendMessage(1L, 10L, request);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).isEqualTo("***, phục vụ tệ ***");
        assertThat(conversation.getLastMessagePreview()).isEqualTo("***, phục vụ tệ ***");
    }

    @Test
    @DisplayName("markAsRead - Đặt lại số tin nhắn chưa đọc về 0")
    void markAsRead_resetsUnread() {
        conversation.setOrganizerUnreadCount(5);
        when(conversationRepository.findByIdWithDetails(1L)).thenReturn(Optional.of(conversation));

        chatService.markAsRead(1L, 20L);

        assertThat(conversation.getOrganizerUnreadCount()).isEqualTo(0);
        verify(chatMessageRepository).markMessagesAsRead(1L, 20L);
        verify(conversationRepository).save(conversation);
    }
}
