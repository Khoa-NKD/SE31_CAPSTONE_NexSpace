package base.api.feature.payment.scheduler;

import base.api.feature.payment.service.IOrganizerPayoutService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

/**
 * Scheduler tự động kiểm tra và giải phóng số dư HELD thành WITHDRAWABLE
 * và thực thi rút tiền tự động hàng ngày (Auto Daily Payout) cho Organizer theo giờ đã chọn.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class OrganizerPayoutScheduler {

    private final IOrganizerPayoutService organizerPayoutService;

    /**
     * Chạy mỗi 10 phút: Kiểm tra các khoản Payout đang HELD đã quá 24h kể từ khi kết thúc booking
     * và không có khiếu nại (support case) để chuyển sang trạng thái RELEASED (Khả dụng có thể rút).
     */
    @Scheduled(cron = "0 */10 * * * *")
    public void scheduleReleaseEligibleHeldPayouts() {
        try {
            organizerPayoutService.releaseEligibleHeldPayouts();
        } catch (Exception e) {
            log.error("Error running scheduleReleaseEligibleHeldPayouts: {}", e.getMessage(), e);
        }
    }

    /**
     * Chạy vào đầu mỗi giờ (ví dụ: 09:00, 10:00, 11:00...):
     * Tìm tất cả các Organizer đã được Admin duyệt Auto Daily Payout trùng với giờ hiện tại
     * và tự động thực hiện gom số dư khả dụng chuyển khoản qua PayOS.
     */
    @Scheduled(cron = "0 0 * * * *")
    public void scheduleDailyAutoPayout() {
        try {
            organizerPayoutService.executeDailyAutoPayoutForCurrentHour();
        } catch (Exception e) {
            log.error("Error running scheduleDailyAutoPayout: {}", e.getMessage(), e);
        }
    }
}
