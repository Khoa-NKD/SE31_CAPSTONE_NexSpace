package base.api.feature.booking.scheduler;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.notification.repository.IUserNotificationRepository;
import base.api.feature.notification.service.INotificationService;
import base.api.shared.entity.booking.BookingModel;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.LocalDateTime;
import java.util.List;

/**
 * Scheduled job to scan upcoming confirmed bookings and dispatch reminders via Gmail & In-App notification
 * before the scheduled workspace start time (within 1 hour / 60 minutes window).
 * Idempotency is strictly guarded via IUserNotificationRepository to prevent duplicate reminders.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "booking.scheduler.reminder.enabled", havingValue = "true", matchIfMissing = true)
public class BookingReminderScheduler {

    private final IBookingRepository bookingRepository;
    private final IUserNotificationRepository notificationRepository;
    private final INotificationService notificationService;

    @Scheduled(fixedRateString = "${booking.scheduler.reminder.rate-ms:60000}", initialDelay = 20000)
    public void scanAndSendBookingReminders() {
        try {
            LocalDateTime now = LocalDateTime.now();
            LocalDateTime windowStart = now.minusMinutes(5);
            LocalDateTime windowEnd = now.plusMinutes(65);

            List<BookingModel> upcoming = bookingRepository.findUpcomingConfirmedBookings(windowStart, windowEnd);
            if (upcoming.isEmpty()) {
                return;
            }

            int dispatchedCount = 0;
            for (BookingModel booking : upcoming) {
                if (booking.getCustomer() == null || booking.getId() == null) {
                    continue;
                }

                Long customerId = booking.getCustomer().getId();
                boolean alreadySent = notificationRepository.existsByUserIdAndRelatedEntityTypeAndRelatedEntityId(
                        customerId, "BOOKING_REMINDER", booking.getId()
                );

                if (!alreadySent) {
                    log.info("BookingReminderScheduler: Dispatching reminder for booking id={}, code={} to customer={}",
                            booking.getId(), booking.getBookingCode(), customerId);
                    notificationService.sendBookingReminderNotification(booking);
                    dispatchedCount++;
                }
            }

            if (dispatchedCount > 0) {
                log.info("BookingReminderScheduler: Successfully sent {} upcoming booking reminders", dispatchedCount);
            }
        } catch (Exception ex) {
            log.error("BookingReminderScheduler encountered error while processing booking reminders", ex);
        }
    }
}
