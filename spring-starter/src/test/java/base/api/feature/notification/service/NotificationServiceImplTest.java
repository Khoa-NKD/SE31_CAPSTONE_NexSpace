package base.api.feature.notification.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.notification.dto.response.UserNotificationResponseDto;
import base.api.feature.notification.repository.IUserNotificationRepository;
import base.api.feature.notification.service.impl.NotificationServiceImpl;
import base.api.shared.config.EmailService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.review.UserNotificationModel;
import base.api.shared.enums.NotificationType;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class NotificationServiceImplTest {

    @Mock
    private IUserNotificationRepository notificationRepository;

    @Mock
    private EmailService emailService;

    @Mock
    private IUserRepository userRepository;

    @Mock
    private IBookingRepository bookingRepository;

    @InjectMocks
    private NotificationServiceImpl notificationService;

    private UserModel customer;
    private BookingModel booking;
    private PaymentTransactionModel transaction;

    @BeforeEach
    void setUp() {
        customer = new UserModel();
        customer.setId(23L);
        customer.setFirstName("Khoa");
        customer.setLastName("Dang");
        customer.setEmail("khoashyofme24092004@gmail.com");

        booking = new BookingModel();
        booking.setId(1001L);
        booking.setBookingCode("NX-1001-TEST");
        booking.setCustomer(customer);
        booking.setFinalPrice(BigDecimal.valueOf(150000));
        booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(10));

        transaction = new PaymentTransactionModel();
        transaction.setId(2001L);
        transaction.setOrderCode(888123456L);
        transaction.setBooking(booking);
        transaction.setAmount(BigDecimal.valueOf(150000));
    }

    @Test
    @DisplayName("getUserNotifications returns mapped page of notifications")
    void getUserNotifications_success() {
        UserNotificationModel model = new UserNotificationModel();
        model.setId(1L);
        model.setUser(customer);
        model.setType(NotificationType.BOOKING);
        model.setTitle("Đặt chỗ thành công");
        model.setContent("Đơn đặt chỗ NX-1001-TEST đã được xác nhận");
        model.setRelatedEntityType("Booking");
        model.setRelatedEntityId(1001L);
        model.setRead(false);

        Pageable pageable = PageRequest.of(0, 10);
        when(notificationRepository.findByUserId(eq(23L), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(model)));

        Page<UserNotificationResponseDto> result = notificationService.getUserNotifications(23L, false, pageable);

        assertThat(result).isNotNull();
        assertThat(result.getContent()).hasSize(1);
        assertThat(result.getContent().get(0).getTitle()).isEqualTo("Đặt chỗ thành công");
        assertThat(result.getContent().get(0).isRead()).isFalse();
    }

    @Test
    @DisplayName("getUnreadCount returns correct unread count")
    void getUnreadCount_success() {
        when(notificationRepository.countByUserIdAndReadFalse(23L)).thenReturn(5L);

        long count = notificationService.getUnreadCount(23L);

        assertThat(count).isEqualTo(5L);
        verify(notificationRepository).countByUserIdAndReadFalse(23L);
    }

    @Test
    @DisplayName("markAsRead updates isRead to true")
    void markAsRead_success() {
        UserNotificationModel model = new UserNotificationModel();
        model.setId(1L);
        model.setUser(customer);
        model.setRead(false);

        when(notificationRepository.findById(1L)).thenReturn(Optional.of(model));

        notificationService.markAsRead(23L, 1L);

        assertThat(model.isRead()).isTrue();
        verify(notificationRepository).save(model);
    }

    @Test
    @DisplayName("markAllAsRead calls repository batch update")
    void markAllAsRead_success() {
        notificationService.markAllAsRead(23L);

        verify(notificationRepository).markAllAsReadForUser(23L);
    }

    @Test
    @DisplayName("markBatchAsRead calls repository batch update with IDs")
    void markBatchAsRead_success() {
        notificationService.markBatchAsRead(23L, List.of(10L, 11L));

        verify(notificationRepository).markBatchAsReadForUser(23L, List.of(10L, 11L));
    }

    @Test
    @DisplayName("sendBookingConfirmedNotification creates in-app record and sends HTML email")
    void sendBookingConfirmedNotification_success() {
        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendBookingConfirmedNotification(booking);

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(23L);
        assertThat(saved.getType()).isEqualTo(NotificationType.BOOKING);
        assertThat(saved.getTitle()).contains("Xác nhận đặt chỗ");

        verify(emailService).sendHtmlEmail(eq("khoashyofme24092004@gmail.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendPaymentSuccessNotification creates in-app record and sends HTML email")
    void sendPaymentSuccessNotification_success() {
        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendPaymentSuccessNotification(transaction, booking);

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(23L);
        assertThat(saved.getType()).isEqualTo(NotificationType.PAYMENT);
        assertThat(saved.getTitle()).contains("Thanh toán PayOS");

        verify(emailService).sendHtmlEmail(eq("khoashyofme24092004@gmail.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendPaymentFailedNotification creates in-app record and sends HTML email")
    void sendPaymentFailedNotification_success() {
        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendPaymentFailedNotification(transaction, booking, "Hết thời gian giữ chỗ");

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(23L);
        assertThat(saved.getType()).isEqualTo(NotificationType.PAYMENT);
        assertThat(saved.getTitle()).contains("Thanh toán không thành công");

        verify(emailService).sendHtmlEmail(eq("khoashyofme24092004@gmail.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendBookingCancelledNotification creates in-app record and sends HTML email")
    void sendBookingCancelledNotification_success() {
        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendBookingCancelledNotification(booking, BigDecimal.valueOf(50000), "Khách hàng đổi lịch");

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(23L);
        assertThat(saved.getType()).isEqualTo(NotificationType.BOOKING);
        assertThat(saved.getTitle()).contains("Hủy đặt chỗ thành công");
        assertThat(saved.getContent()).contains("50.000");

        verify(emailService).sendHtmlEmail(eq("khoashyofme24092004@gmail.com"), anyString(), anyString());
    }

    @org.junit.jupiter.params.ParameterizedTest
    @org.junit.jupiter.params.provider.ValueSource(strings = {"en-US", "fr-FR", "vi-VN"})
    @org.junit.jupiter.api.parallel.ResourceLock(org.junit.jupiter.api.parallel.Resources.LOCALE)
    void cancellationRefundUsesVietnameseMoneyInNotificationsAndEmailOnEveryHost(String languageTag) {
        var original = java.util.Locale.getDefault();
        var originalFormat = java.util.Locale.getDefault(java.util.Locale.Category.FORMAT);
        try {
            java.util.Locale.setDefault(java.util.Locale.forLanguageTag(languageTag));
            when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));
            notificationService.sendBookingCancelledNotification(booking, new BigDecimal("50000"), "Đổi lịch");

            var notification = ArgumentCaptor.forClass(UserNotificationModel.class);
            verify(notificationRepository).save(notification.capture());
            assertThat(notification.getValue().getContent()).contains("50.000").doesNotContain("50,000");
            var html = ArgumentCaptor.forClass(String.class);
            verify(emailService).sendHtmlEmail(anyString(), anyString(), html.capture());
            assertThat(html.getValue()).contains("50.000").doesNotContain("50,000");
        } finally {
            java.util.Locale.setDefault(original);
            java.util.Locale.setDefault(java.util.Locale.Category.FORMAT, originalFormat);
        }
    }

    @Test
    @DisplayName("sendBookingCancelledToOrganizerNotification creates in-app notification and email for organizer")
    void sendBookingCancelledToOrganizerNotification_success() {
        UserModel organizer = new UserModel();
        organizer.setId(99L);
        organizer.setEmail("organizer@nexspace.vn");

        base.api.shared.entity.workspace.WorkspaceModel workspace = new base.api.shared.entity.workspace.WorkspaceModel();
        workspace.setName("Enouvo Space");
        workspace.setOrganizer(organizer);
        booking.setWorkspace(workspace);

        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendBookingCancelledToOrganizerNotification(booking, "Khách hàng đổi lịch");

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(99L);
        assertThat(saved.getTitle()).contains("Đơn đặt chỗ đã bị hủy");
        verify(emailService).sendHtmlEmail(eq("organizer@nexspace.vn"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendRefundRequestedNotification notifies organizer and admin")
    void sendRefundRequestedNotification_success() {
        UserModel organizer = new UserModel();
        organizer.setId(99L);
        organizer.setEmail("organizer@nexspace.vn");

        base.api.shared.entity.workspace.WorkspaceModel workspace = new base.api.shared.entity.workspace.WorkspaceModel();
        workspace.setName("Enouvo Space");
        workspace.setOrganizer(organizer);
        booking.setWorkspace(workspace);

        base.api.shared.entity.payment.RefundRequestModel refund = new base.api.shared.entity.payment.RefundRequestModel();
        refund.setId(501L);
        refund.setBooking(booking);
        refund.setRequestedAmount(BigDecimal.valueOf(100000));
        refund.setReason("Chính sách linh hoạt");

        UserModel admin = new UserModel();
        admin.setId(1L);
        when(userRepository.findActiveUsersByRoleName("ADMIN")).thenReturn(List.of(admin));
        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendRefundRequestedNotification(refund);

        verify(notificationRepository, atLeast(2)).save(any(UserNotificationModel.class));
        verify(emailService).sendHtmlEmail(eq("organizer@nexspace.vn"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendRefundCompletedNotification notifies customer")
    void sendRefundCompletedNotification_success() {
        base.api.shared.entity.workspace.WorkspaceModel workspace = new base.api.shared.entity.workspace.WorkspaceModel();
        workspace.setName("Enouvo Space");
        booking.setWorkspace(workspace);

        base.api.shared.entity.payment.RefundRequestModel refund = new base.api.shared.entity.payment.RefundRequestModel();
        refund.setId(501L);
        refund.setBooking(booking);
        refund.setRequestedAmount(BigDecimal.valueOf(100000));
        refund.setApprovedAmount(BigDecimal.valueOf(100000));

        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendRefundCompletedNotification(refund);

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(23L);
        assertThat(saved.getType()).isEqualTo(NotificationType.REFUND);
        assertThat(saved.getTitle()).contains("Hoàn tiền hoàn tất");
        verify(emailService).sendHtmlEmail(eq("khoashyofme24092004@gmail.com"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendNewBookingToOrganizerNotification notifies organizer")
    void sendNewBookingToOrganizerNotification_success() {
        UserModel organizer = new UserModel();
        organizer.setId(99L);
        organizer.setEmail("organizer@nexspace.vn");

        base.api.shared.entity.workspace.WorkspaceModel workspace = new base.api.shared.entity.workspace.WorkspaceModel();
        workspace.setName("Enouvo Space");
        workspace.setOrganizer(organizer);
        booking.setWorkspace(workspace);

        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendNewBookingToOrganizerNotification(booking);

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(99L);
        assertThat(saved.getTitle()).contains("Đặt chỗ mới tại không gian của bạn");
        verify(emailService).sendHtmlEmail(eq("organizer@nexspace.vn"), anyString(), anyString());
    }

    @Test
    @DisplayName("sendBookingReminderNotification dispatches in-app notification and email with smart PIN")
    void sendBookingReminderNotification_success() {
        booking.setStartTime(LocalDateTime.now().plusMinutes(45));
        booking.setEndTime(LocalDateTime.now().plusHours(3));

        base.api.shared.entity.workspace.WorkspaceModel workspace = new base.api.shared.entity.workspace.WorkspaceModel();
        workspace.setName("Enouvo Space 1");
        workspace.setAddress("15 An Nhon 3, Da Nang");
        booking.setWorkspace(workspace);

        base.api.shared.entity.resource.BookableResourceModel resource = new base.api.shared.entity.resource.BookableResourceModel();
        resource.setName("Ban Hot Desk 01");
        booking.setResource(resource);

        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.sendBookingReminderNotification(booking);

        ArgumentCaptor<UserNotificationModel> notifCaptor = ArgumentCaptor.forClass(UserNotificationModel.class);
        verify(notificationRepository).save(notifCaptor.capture());
        UserNotificationModel saved = notifCaptor.getValue();

        assertThat(saved.getUser().getId()).isEqualTo(customer.getId());
        assertThat(saved.getType()).isEqualTo(NotificationType.BOOKING);
        assertThat(saved.getTitle()).contains("Nhắc lịch: Phiên làm việc sắp bắt đầu");
        assertThat(saved.getRelatedEntityType()).isEqualTo("BOOKING_REMINDER");
        assertThat(saved.getRelatedEntityId()).isEqualTo(booking.getId());

        ArgumentCaptor<String> emailContentCaptor = ArgumentCaptor.forClass(String.class);
        verify(emailService).sendHtmlEmail(eq(customer.getEmail()), contains("Nhắc lịch"), emailContentCaptor.capture());
        String emailHtml = emailContentCaptor.getValue();
        assertThat(emailHtml).contains("SẮP BẮT ĐẦU (TRONG 1 GIỜ TỚI)");
        assertThat(emailHtml).contains("Mã Smart PIN mở cửa điện tử");
        assertThat(emailHtml).contains("Enouvo Space 1");
    }

    @Test
    @DisplayName("triggerBookingReminder fetches booking and dispatches reminder")
    void triggerBookingReminder_success() {
        booking.setStartTime(LocalDateTime.now().plusMinutes(30));
        booking.setEndTime(LocalDateTime.now().plusHours(2));

        when(bookingRepository.findById(1001L)).thenReturn(Optional.of(booking));
        when(notificationRepository.save(any(UserNotificationModel.class))).thenAnswer(i -> i.getArgument(0));

        notificationService.triggerBookingReminder(1001L);

        verify(bookingRepository).findById(1001L);
        verify(notificationRepository).save(any(UserNotificationModel.class));
        verify(emailService).sendHtmlEmail(eq(customer.getEmail()), anyString(), anyString());
    }
}
