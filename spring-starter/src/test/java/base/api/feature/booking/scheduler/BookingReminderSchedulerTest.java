package base.api.feature.booking.scheduler;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.notification.repository.IUserNotificationRepository;
import base.api.feature.notification.service.INotificationService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingReminderSchedulerTest {

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private IUserNotificationRepository notificationRepository;

    @Mock
    private INotificationService notificationService;

    @InjectMocks
    private BookingReminderScheduler scheduler;

    private UserModel customer;
    private BookingModel booking;

    @BeforeEach
    void setUp() {
        customer = new UserModel();
        customer.setId(23L);
        customer.setEmail("khoashyofme24092004@gmail.com");

        booking = new BookingModel();
        booking.setId(888L);
        booking.setBookingCode("BK-REMIND-01");
        booking.setCustomer(customer);
        booking.setStartTime(LocalDateTime.now().plusMinutes(40));
    }

    @Test
    @DisplayName("scanAndSendBookingReminders skips when no upcoming bookings found")
    void scanAndSendBookingReminders_emptyList() {
        when(bookingRepository.findUpcomingConfirmedBookings(any(), any())).thenReturn(Collections.emptyList());

        scheduler.scanAndSendBookingReminders();

        verify(notificationService, never()).sendBookingReminderNotification(any());
    }

    @Test
    @DisplayName("scanAndSendBookingReminders sends reminder if not already sent")
    void scanAndSendBookingReminders_dispatchesWhenNotSent() {
        when(bookingRepository.findUpcomingConfirmedBookings(any(), any())).thenReturn(List.of(booking));
        when(notificationRepository.existsByUserIdAndRelatedEntityTypeAndRelatedEntityId(23L, "BOOKING_REMINDER", 888L))
                .thenReturn(false);

        scheduler.scanAndSendBookingReminders();

        verify(notificationService).sendBookingReminderNotification(booking);
    }

    @Test
    @DisplayName("scanAndSendBookingReminders skips idempotent already sent bookings")
    void scanAndSendBookingReminders_skipsWhenAlreadySent() {
        when(bookingRepository.findUpcomingConfirmedBookings(any(), any())).thenReturn(List.of(booking));
        when(notificationRepository.existsByUserIdAndRelatedEntityTypeAndRelatedEntityId(23L, "BOOKING_REMINDER", 888L))
                .thenReturn(true);

        scheduler.scanAndSendBookingReminders();

        verify(notificationService, never()).sendBookingReminderNotification(any());
    }
}
