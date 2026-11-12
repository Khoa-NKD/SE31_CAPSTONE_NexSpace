package base.api.feature.booking.scheduler;

import base.api.feature.booking.service.IBookingService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to automatically expire outdated booking holds (15-minute window).
 * Runs every 60 seconds to release unconfirmed bookings and free up seats.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "booking.scheduler.hold-expiration.enabled", havingValue = "true", matchIfMissing = true)
public class BookingHoldExpirationScheduler {

    private final IBookingService bookingService;

    @Scheduled(fixedRateString = "${booking.scheduler.hold-expiration.rate-ms:60000}", initialDelay = 15000)
    public void processExpiredBookingHolds() {
        try {
            int expiredCount = bookingService.expireOutdatedHolds();
            if (expiredCount > 0) {
                log.info("BookingHoldExpirationScheduler: Successfully released {} expired holds", expiredCount);
            }
        } catch (Exception ex) {
            log.error("BookingHoldExpirationScheduler encountered error while processing expired holds", ex);
        }
    }
}
