package base.api.feature.booking.scheduler;

import base.api.feature.booking.service.IResourceHoldService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduled job to automatically expire outdated booking holds (10-minute window).
 * Runs periodically to release unconfirmed bookings and free up seats.
 */
@Slf4j
@Component
@RequiredArgsConstructor
@ConditionalOnProperty(name = "booking.scheduler.hold-expiration.enabled", havingValue = "true", matchIfMissing = true)
public class BookingHoldExpirationScheduler {

    private final IResourceHoldService resourceHoldService;

    @Scheduled(fixedRateString = "${booking.scheduler.hold-expiration.rate-ms:30000}", initialDelay = 15000)
    public void processExpiredBookingHolds() {
        try {
            int expiredCount = resourceHoldService.expireOutdatedHolds();
            if (expiredCount > 0) {
                log.info("BookingHoldExpirationScheduler: Successfully released {} expired holds", expiredCount);
            }
        } catch (Exception ex) {
            log.error("BookingHoldExpirationScheduler encountered error while processing expired holds", ex);
        }
    }
}
