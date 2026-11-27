package base.api.feature.notification.service;

import base.api.feature.notification.dto.response.UserNotificationResponseDto;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

public interface INotificationService {
    Page<UserNotificationResponseDto> getUserNotifications(Long userId, Boolean unreadOnly, Pageable pageable);

    long getUnreadCount(Long userId);

    void markAsRead(Long userId, Long notificationId);

    void markBatchAsRead(Long userId, java.util.List<Long> notificationIds);

    void markAllAsRead(Long userId);

    void sendBookingConfirmedNotification(BookingModel booking);

    void sendPaymentSuccessNotification(PaymentTransactionModel tx, BookingModel booking);

    void sendPaymentFailedNotification(PaymentTransactionModel tx, BookingModel booking, String reason);

    void sendBookingCancelledNotification(BookingModel booking, java.math.BigDecimal refundAmount, String reason);

    void sendBookingCancelledToOrganizerNotification(BookingModel booking, String reason);

    void sendRefundRequestedNotification(RefundRequestModel refund);

    void sendRefundCompletedNotification(RefundRequestModel refund);

    default void sendAutoRefundBankInfoRequiredNotification(RefundRequestModel refund, String detectedBank) {
        sendRefundRequestedNotification(refund);
    }

    default void sendRefundBankInfoUpdatedNotification(RefundRequestModel refund) {
    }

    void sendWorkspaceReviewToOrganizerNotification(Long organizerId, String workspaceName, String customerName, int rating, String comment, Long reviewId);

    void sendComplaintToOrganizerNotification(Long organizerId, String workspaceName, String customerName, String complaintTitle, String complaintDetail, Long caseId);

    void sendNewBookingToOrganizerNotification(BookingModel booking);

    void sendBookingPendingApprovalToOrganizerNotification(BookingModel booking);

    void sendBookingReminderNotification(BookingModel booking);

    void triggerBookingReminder(Long bookingId);

    void seedDemoNotifications(Long userId);
}
