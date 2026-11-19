package base.api.feature.notification.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.notification.dto.response.UserNotificationResponseDto;
import base.api.feature.notification.repository.IUserNotificationRepository;
import base.api.feature.notification.service.INotificationService;
import base.api.shared.config.EmailService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.entity.review.UserNotificationModel;
import base.api.shared.enums.DeliveryStatus;
import base.api.shared.enums.NotificationType;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.text.DecimalFormat;
import java.time.format.DateTimeFormatter;
import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class NotificationServiceImpl implements INotificationService {

    private final IUserNotificationRepository notificationRepository;
    private final EmailService emailService;
    private final IUserRepository userRepository;
    private final IBookingRepository bookingRepository;

    @Value("${app.client-url:http://localhost:3000}")
    private String clientUrl;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DecimalFormat CURRENCY_FORMATTER = new DecimalFormat("#,###");

    @Override
    @Transactional(readOnly = true)
    public Page<UserNotificationResponseDto> getUserNotifications(Long userId, Boolean unreadOnly, Pageable pageable) {
        Page<UserNotificationModel> page = Boolean.TRUE.equals(unreadOnly)
                ? notificationRepository.findByUserIdAndReadFalse(userId, pageable)
                : notificationRepository.findByUserId(userId, pageable);

        return page.map(this::toResponseDto);
    }

    @Override
    @Transactional(readOnly = true)
    public long getUnreadCount(Long userId) {
        return notificationRepository.countByUserIdAndReadFalse(userId);
    }

    @Override
    @Transactional
    public void markAsRead(Long userId, Long notificationId) {
        UserNotificationModel notification = notificationRepository.findById(notificationId)
                .orElseThrow(() -> new NotFoundException("Thông báo không tồn tại: " + notificationId));

        if (!notification.getUser().getId().equals(userId)) {
            throw new NotFoundException("Thông báo không thuộc về người dùng này");
        }

        if (!notification.isRead()) {
            notification.setRead(true);
            notificationRepository.save(notification);
        }
    }

    @Override
    @Transactional
    public void markBatchAsRead(Long userId, List<Long> notificationIds) {
        if (notificationIds == null || notificationIds.isEmpty()) {
            return;
        }
        notificationRepository.markBatchAsReadForUser(userId, notificationIds);
    }

    @Override
    @Transactional
    public void markAllAsRead(Long userId) {
        notificationRepository.markAllAsReadForUser(userId);
    }

    @Override
    @Transactional
    public void sendBookingConfirmedNotification(BookingModel booking) {
        if (booking == null || booking.getCustomer() == null) {
            log.warn("Cannot send booking confirmed notification: booking or customer is null");
            return;
        }

        UserModel customer = booking.getCustomer();
        String workspaceName = (booking.getWorkspace() != null && booking.getWorkspace().getName() != null)
                ? booking.getWorkspace().getName()
                : "NexSpace";
        String spaceName = (booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : "Không gian làm việc";
        String bookingCode = booking.getBookingCode();
        String startTimeStr = booking.getStartTime() != null ? booking.getStartTime().format(DATE_FORMATTER) : "N/A";
        String endTimeStr = booking.getEndTime() != null ? booking.getEndTime().format(DATE_FORMATTER) : "N/A";

        String title = "Xác nhận đặt chỗ thành công - #" + bookingCode;
        String content = String.format(
                "Đơn đặt chỗ #%s của bạn tại %s (%s) đã được xác nhận thành công. Thời gian: %s - %s. Vui lòng kiểm tra vé điện tử và mã QR ra vào không gian.",
                bookingCode, workspaceName, spaceName, startTimeStr, endTimeStr
        );

        // 1. Lưu thông báo In-app
        saveInAppNotification(customer, NotificationType.BOOKING, title, content, "BOOKING", booking.getId());

        // 2. Gửi Email thông báo xác nhận đặt chỗ
        if (StringUtils.hasText(customer.getEmail())) {
            String customerName = getCustomerFullName(customer);
            String manageBookingUrl = clientUrl + "/workspaces/my-bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #ecfdf5; color: #059669; border-radius: 9999px; font-size: 12px; font-weight: 700;">ĐẶT CHỖ THÀNH CÔNG</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Xác nhận đặt không gian làm việc số hóa</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Đơn đặt chỗ của bạn tại <strong>%s</strong> đã được xác nhận thành công. Dưới đây là thông tin chi tiết phiên làm việc của bạn:
                        </p>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Không gian:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Vị trí chỗ ngồi:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #4f46e5; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Bắt đầu:</td>
                                <td style="padding: 10px 0; font-weight: 500; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Kết thúc:</td>
                                <td style="padding: 10px 0; font-weight: 500; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Trạng thái:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">ĐÃ XÁC NHẬN</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Xem vé điện tử & Mã QR Check-in
                        </a>
                    </div>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0 0 4px 0;">NexSpace — Nền tảng chia sẻ không gian làm việc số hóa hàng đầu</p>
                        <p style="margin: 0;">Mọi thắc mắc vui lòng liên hệ hotline hỗ trợ 0905 123 456 hoặc gửi tin nhắn tại trang hỗ trợ.</p>
                    </div>
                </div>
                """, customerName, workspaceName, bookingCode, workspaceName, spaceName, startTimeStr, endTimeStr, manageBookingUrl);

            try {
                emailService.sendHtmlEmail(customer.getEmail(), "[NexSpace] " + title, html);
            } catch (Exception e) {
                log.error("Failed to send booking confirmed email to {}: {}", customer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void sendBookingCancelledNotification(BookingModel booking, BigDecimal refundAmount, String reason) {
        if (booking == null || booking.getCustomer() == null) {
            log.warn("Cannot send booking cancelled notification: booking or customer is null");
            return;
        }

        UserModel customer = booking.getCustomer();
        String workspaceName = (booking.getWorkspace() != null && booking.getWorkspace().getName() != null)
                ? booking.getWorkspace().getName()
                : "NexSpace";
        String spaceName = (booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : "Không gian làm việc";
        String bookingCode = booking.getBookingCode();
        String refundText = (refundAmount != null && refundAmount.compareTo(BigDecimal.ZERO) > 0)
                ? " Số tiền hoàn lại dự kiến: " + formatCurrency(refundAmount) + " đ."
                : "";
        String reasonText = StringUtils.hasText(reason) ? " (Lý do: " + reason + ")" : "";

        String title = "Hủy đặt chỗ thành công - #" + bookingCode;
        String content = String.format(
                "Đơn đặt chỗ #%s của bạn tại %s (%s) đã được hủy thành công.%s%s Chỗ ngồi đã được giải phóng.",
                bookingCode, workspaceName, spaceName, refundText, reasonText
        );

        // 1. Lưu thông báo In-app
        saveInAppNotification(customer, NotificationType.BOOKING, title, content, "BOOKING", booking.getId());

        // 2. Gửi Email thông báo xác nhận hủy đặt chỗ
        if (StringUtils.hasText(customer.getEmail())) {
            String customerName = getCustomerFullName(customer);
            String manageBookingUrl = clientUrl + "/workspaces/my-bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #e11d48; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #ffe4e6; color: #e11d48; border-radius: 9999px; font-size: 12px; font-weight: 700;">HỦY ĐẶT CHỖ THÀNH CÔNG</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Xác nhận hủy phiên làm việc</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Đơn đặt chỗ <strong>#%s</strong> tại <strong>%s</strong> của bạn đã được hủy thành công. Chỗ ngồi đã được giải phóng trên hệ thống.
                        </p>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Không gian:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Vị trí chỗ ngồi:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #64748b; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Lý do hủy:</td>
                                <td style="padding: 10px 0; font-weight: 500; color: #e11d48; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Số tiền hoàn lại:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">%s VND</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Trạng thái:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #e11d48; text-align: right;">ĐÃ HỦY</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Xem lịch sử đặt chỗ & Khám phá không gian khác
                        </a>
                    </div>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0 0 4px 0;">NexSpace — Nền tảng chia sẻ không gian làm việc số hóa hàng đầu</p>
                        <p style="margin: 0;">Mọi thắc mắc vui lòng liên hệ hotline hỗ trợ 0905 123 456 hoặc gửi tin nhắn tại trang hỗ trợ.</p>
                    </div>
                </div>
                """, customerName, bookingCode, workspaceName, bookingCode, workspaceName, spaceName,
                StringUtils.hasText(reason) ? reason : "Người dùng chủ động hủy",
                formatCurrency(refundAmount),
                manageBookingUrl);

            try {
                emailService.sendHtmlEmail(
                        customer.getEmail(),
                        "[NexSpace] Xác nhận hủy đơn đặt chỗ #" + bookingCode,
                        html
                );
            } catch (Exception e) {
                log.error("Failed to send booking cancellation email to {}: {}", customer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void sendPaymentSuccessNotification(PaymentTransactionModel tx, BookingModel booking) {
        UserModel customer = (booking != null && booking.getCustomer() != null)
                ? booking.getCustomer()
                : (tx != null && tx.getBooking() != null ? tx.getBooking().getCustomer() : null);

        if (customer == null) {
            log.warn("Cannot send payment success notification: customer is null");
            return;
        }

        String bookingCode = (booking != null && booking.getBookingCode() != null)
                ? booking.getBookingCode()
                : (tx != null ? String.valueOf(tx.getOrderCode()) : "NEXSPACE");

        String amountStr = (tx != null && tx.getAmount() != null)
                ? formatCurrency(tx.getAmount())
                : "0";

        String title = "Thanh toán PayOS thành công - #" + bookingCode;
        String content = String.format(
                "Giao dịch thanh toán PayOS thành công số tiền %s VND cho đơn đặt chỗ #%s. Hóa đơn điện tử VAT đã được gửi đến email của bạn.",
                amountStr, bookingCode
        );

        // 1. Lưu thông báo In-app
        saveInAppNotification(customer, NotificationType.PAYMENT, title, content, "PAYMENT", tx != null ? tx.getId() : null);

        // 2. Gửi Email thông báo thanh toán thành công
        if (StringUtils.hasText(customer.getEmail())) {
            String customerName = getCustomerFullName(customer);
            String manageBookingUrl = clientUrl + "/workspaces/my-bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #e0e7ff; color: #4338ca; border-radius: 9999px; font-size: 12px; font-weight: 700;">THANH TOÁN THÀNH CÔNG</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Cổng thanh toán trực tuyến PayOS</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Cổng thanh toán PayOS đã xác nhận giao dịch thanh toán thành công cho đơn đặt chỗ <strong>#%s</strong> của bạn.
                        </p>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn đặt chỗ:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã giao dịch PayOS:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #0f172a; text-align: right; font-family: monospace;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Số tiền thanh toán:</td>
                                <td style="padding: 10px 0; font-weight: 800; color: #059669; text-align: right; font-size: 15px;">%s VND</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Phương thức:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #0f172a; text-align: right;">VietQR / PayOS</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Trạng thái thanh toán:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">THÀNH CÔNG</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Xem hóa đơn & Quản lý đơn đặt chỗ
                        </a>
                    </div>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0 0 4px 0;">NexSpace — Nền tảng chia sẻ không gian làm việc số hóa hàng đầu</p>
                        <p style="margin: 0;">Email này được gửi tự động khi cổng thanh toán PayOS khớp nối thành công.</p>
                    </div>
                </div>
                """, customerName, bookingCode, bookingCode,
                tx != null ? String.valueOf(tx.getOrderCode()) : "N/A",
                amountStr, manageBookingUrl);

            try {
                emailService.sendHtmlEmail(customer.getEmail(), "[NexSpace] " + title, html);
            } catch (Exception e) {
                log.error("Failed to send payment success email to {}: {}", customer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void sendPaymentFailedNotification(PaymentTransactionModel tx, BookingModel booking, String reason) {
        UserModel customer = (booking != null && booking.getCustomer() != null)
                ? booking.getCustomer()
                : (tx != null && tx.getBooking() != null ? tx.getBooking().getCustomer() : null);

        if (customer == null) {
            log.warn("Cannot send payment failed notification: customer is null");
            return;
        }

        String bookingCode = (booking != null && booking.getBookingCode() != null)
                ? booking.getBookingCode()
                : (tx != null ? String.valueOf(tx.getOrderCode()) : "NEXSPACE");

        String amountStr = (tx != null && tx.getAmount() != null)
                ? formatCurrency(tx.getAmount())
                : "0";

        String reasonStr = StringUtils.hasText(reason) ? reason : "Giao dịch bị hủy hoặc quá thời gian giữ chỗ";

        String title = "Thanh toán không thành công - #" + bookingCode;
        String content = String.format(
                "Giao dịch thanh toán PayOS số tiền %s VND cho đơn đặt chỗ #%s không thành công. Lý do: %s. Chỗ ngồi đã được giải phóng.",
                amountStr, bookingCode, reasonStr
        );

        // 1. Lưu thông báo In-app
        saveInAppNotification(customer, NotificationType.PAYMENT, title, content, "PAYMENT", tx != null ? tx.getId() : (booking != null ? booking.getId() : null));

        // 2. Gửi Email thông báo thanh toán thất bại
        if (StringUtils.hasText(customer.getEmail())) {
            String customerName = getCustomerFullName(customer);
            String retryUrl = clientUrl + "/workspaces";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #e11d48; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #ffe4e6; color: #e11d48; border-radius: 9999px; font-size: 12px; font-weight: 700;">THANH TOÁN THẤT BẠI</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Cổng thanh toán trực tuyến PayOS</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Giao dịch thanh toán PayOS cho đơn đặt chỗ <strong>#%s</strong> chưa hoàn tất hoặc đã bị hủy.
                        </p>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn đặt chỗ:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Số tiền:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right;">%s VND</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Lý do thất bại:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #e11d48; text-align: right;">%s</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Trạng thái đơn:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #e11d48; text-align: right;">ĐÃ HỦY / HẾT HẠN</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Chọn lại không gian làm việc
                        </a>
                    </div>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0 0 4px 0;">NexSpace — Nền tảng chia sẻ không gian làm việc số hóa hàng đầu</p>
                        <p style="margin: 0;">Nếu tài khoản ngân hàng của bạn đã bị trừ tiền, hệ thống đối soát tự động sẽ hoàn lại hoặc kích hoạt đơn theo quy định.</p>
                    </div>
                </div>
                """, customerName, bookingCode, bookingCode, amountStr, reasonStr, retryUrl);

            try {
                emailService.sendHtmlEmail(customer.getEmail(), "[NexSpace] " + title, html);
            } catch (Exception e) {
                log.error("Failed to send payment failed email to {}: {}", customer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void sendBookingCancelledToOrganizerNotification(BookingModel booking, String reason) {
        if (booking == null || booking.getWorkspace() == null || booking.getWorkspace().getOrganizer() == null) {
            log.warn("Cannot send cancellation to organizer: booking or workspace organizer is null");
            return;
        }

        UserModel organizer = booking.getWorkspace().getOrganizer();
        UserModel customer = booking.getCustomer();
        String customerName = customer != null ? getCustomerFullName(customer) : "Khách hàng";
        String workspaceName = (booking.getWorkspace().getName() != null) ? booking.getWorkspace().getName() : "Không gian của bạn";
        String spaceName = (booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : "Chỗ ngồi";
        String bookingCode = booking.getBookingCode();
        String reasonStr = StringUtils.hasText(reason) ? reason : "Không nêu lý do";

        String title = "Đơn đặt chỗ đã bị hủy - #" + bookingCode;
        String content = String.format(
                "Khách hàng %s đã hủy đơn đặt chỗ #%s tại %s (%s). Lý do: %s. Chỗ ngồi đã được mở lại cho khách khác.",
                customerName, bookingCode, workspaceName, spaceName, reasonStr
        );

        // 1. In-app notification for Organizer
        saveInAppNotification(organizer, NotificationType.BOOKING, title, content, "Booking", booking.getId());

        // 2. Email notification for Organizer
        if (StringUtils.hasText(organizer.getEmail())) {
            String organizerName = getCustomerFullName(organizer);
            String manageUrl = clientUrl + "/dashboard/organizer/bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #ffe4e6; color: #e11d48; border-radius: 9999px; font-size: 12px; font-weight: 700;">ĐƠN ĐẶT CHỖ BỊ HỦY</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Cập nhật lịch đặt chỗ không gian đối tác</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi Đối tác <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Khách hàng <strong>%s</strong> đã thực hiện hủy đơn đặt chỗ <strong>#%s</strong> tại <strong>%s</strong> (%s).
                        </p>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Vị trí chỗ ngồi:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Lý do hủy:</td>
                                <td style="padding: 10px 0; font-weight: 500; color: #e11d48; text-align: right;">%s</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Tình trạng tài nguyên:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">ĐÃ GIẢI PHÓNG / MỞ LẠI</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Xem quản lý đặt chỗ của đối tác
                        </a>
                    </div>
                </div>
                """, organizerName, customerName, bookingCode, workspaceName, spaceName, bookingCode, spaceName, reasonStr, manageUrl);

            try {
                emailService.sendHtmlEmail(organizer.getEmail(), "[NexSpace] " + title, html);
            } catch (Exception e) {
                log.error("Failed to send cancellation email to organizer {}: {}", organizer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void sendRefundRequestedNotification(RefundRequestModel refund) {
        if (refund == null || refund.getBooking() == null) {
            log.warn("Cannot send refund requested notification: refund or booking is null");
            return;
        }

        BookingModel booking = refund.getBooking();
        String bookingCode = booking.getBookingCode();
        String workspaceName = (booking.getWorkspace() != null && booking.getWorkspace().getName() != null)
                ? booking.getWorkspace().getName()
                : "NexSpace";
        String amountStr = formatCurrency(refund.getRequestedAmount());
        String reasonStr = StringUtils.hasText(refund.getReason()) ? refund.getReason() : "Khách hàng hủy theo chính sách hoàn tiền";

        String title = "Yêu cầu hoàn tiền mới - #" + bookingCode;
        String content = String.format(
                "Đơn đặt chỗ #%s tại %s có yêu cầu hoàn lại %s đ (Lý do: %s). Vui lòng kiểm tra và xử lý hoàn tiền.",
                bookingCode, workspaceName, amountStr, reasonStr
        );

        // 1. Gửi thông báo In-app cho Organizer của workspace
        if (booking.getWorkspace() != null && booking.getWorkspace().getOrganizer() != null) {
            UserModel organizer = booking.getWorkspace().getOrganizer();
            saveInAppNotification(organizer, NotificationType.REFUND, title, content, "RefundRequest", refund.getId());

            if (StringUtils.hasText(organizer.getEmail())) {
                String organizerName = getCustomerFullName(organizer);
                String manageUrl = clientUrl + "/dashboard/organizer/bookings";
                String html = String.format("""
                    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                        <h2 style="color: #f59e0b; margin: 0 0 12px 0;">Yêu cầu hoàn tiền mới</h2>
                        <p>Kính gửi Đối tác <strong>%s</strong>,</p>
                        <p>Đơn đặt chỗ <strong>#%s</strong> tại <strong>%s</strong> vừa phát sinh yêu cầu hoàn lại số tiền <strong>%s đ</strong>.</p>
                        <p><strong>Lý do:</strong> %s</p>
                        <p><a href="%s" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">Xem chi tiết đơn</a></p>
                    </div>
                    """, organizerName, bookingCode, workspaceName, amountStr, reasonStr, manageUrl);
                try {
                    emailService.sendHtmlEmail(organizer.getEmail(), "[NexSpace] " + title, html);
                } catch (Exception e) {
                    log.error("Failed to send refund email to organizer {}: {}", organizer.getEmail(), e.getMessage());
                }
            }
        }

        // 2. Gửi thông báo In-app cho toàn bộ Quản trị viên (Admin)
        try {
            List<UserModel> admins = userRepository.findActiveUsersByRoleName("ADMIN");
            for (UserModel admin : admins) {
                saveInAppNotification(
                        admin,
                        NotificationType.REFUND,
                        "Yêu cầu hoàn tiền mới trên hệ thống - #" + bookingCode,
                        String.format("Đơn đặt chỗ #%s tại %s phát sinh yêu cầu hoàn tiền %s đ (Lý do: %s).", bookingCode, workspaceName, amountStr, reasonStr),
                        "RefundRequest",
                        refund.getId()
                );
            }
        } catch (Exception e) {
            log.warn("Failed to notify admins of refund request: {}", e.getMessage());
        }
    }

    @Override
    @Transactional
    public void sendRefundCompletedNotification(RefundRequestModel refund) {
        if (refund == null || refund.getBooking() == null || refund.getBooking().getCustomer() == null) {
            log.warn("Cannot send refund completed notification: refund, booking, or customer is null");
            return;
        }

        BookingModel booking = refund.getBooking();
        UserModel customer = booking.getCustomer();
        String bookingCode = booking.getBookingCode();
        String workspaceName = (booking.getWorkspace() != null && booking.getWorkspace().getName() != null)
                ? booking.getWorkspace().getName()
                : "NexSpace";

        BigDecimal approvedAmount = refund.getApprovedAmount() != null ? refund.getApprovedAmount() : refund.getRequestedAmount();
        String amountStr = formatCurrency(approvedAmount);

        String title = "Hoàn tiền hoàn tất - #" + bookingCode;
        String content = String.format(
                "Yêu cầu hoàn tiền số tiền %s đ cho đơn đặt chỗ #%s tại %s đã được xử lý hoàn tất thành công. Số tiền sẽ được chuyển về tài khoản của bạn.",
                amountStr, bookingCode, workspaceName
        );

        // 1. In-app notification for Customer
        saveInAppNotification(customer, NotificationType.REFUND, title, content, "Booking", booking.getId());

        // 2. Email notification for Customer
        if (StringUtils.hasText(customer.getEmail())) {
            String customerName = getCustomerFullName(customer);
            String manageBookingUrl = clientUrl + "/workspaces/my-bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #059669; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #ecfdf5; color: #059669; border-radius: 9999px; font-size: 12px; font-weight: 700;">HOÀN TIỀN HOÀN TẤT</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Xác nhận xử lý hoàn tiền từ NexSpace</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Yêu cầu hoàn tiền cho đơn đặt chỗ <strong>#%s</strong> tại <strong>%s</strong> đã được duyệt và xử lý thành công.
                        </p>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn đặt chỗ:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Số tiền hoàn lại:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">%s đ</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Trạng thái xử lý:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">HOÀN TẤT</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Xem lịch sử đặt chỗ của bạn
                        </a>
                    </div>
                </div>
                """, customerName, bookingCode, workspaceName, bookingCode, amountStr, manageBookingUrl);

            try {
                emailService.sendHtmlEmail(customer.getEmail(), "[NexSpace] " + title, html);
            } catch (Exception e) {
                log.error("Failed to send refund completed email to {}: {}", customer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void sendNewBookingToOrganizerNotification(BookingModel booking) {
        if (booking == null || booking.getWorkspace() == null || booking.getWorkspace().getOrganizer() == null) {
            log.warn("Cannot send new booking to organizer: booking or organizer is null");
            return;
        }

        UserModel organizer = booking.getWorkspace().getOrganizer();
        UserModel customer = booking.getCustomer();
        String customerName = customer != null ? getCustomerFullName(customer) : "Khách hàng";
        String workspaceName = (booking.getWorkspace().getName() != null) ? booking.getWorkspace().getName() : "Không gian của bạn";
        String spaceName = (booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : "Chỗ ngồi";
        String bookingCode = booking.getBookingCode();
        String startTimeStr = booking.getStartTime() != null ? booking.getStartTime().format(DATE_FORMATTER) : "N/A";
        String endTimeStr = booking.getEndTime() != null ? booking.getEndTime().format(DATE_FORMATTER) : "N/A";
        String revenueStr = formatCurrency(booking.getFinalPrice());

        String title = "Đặt chỗ mới tại không gian của bạn - #" + bookingCode;
        String content = String.format(
                "Khách hàng %s đã đặt thành công vị trí %s tại %s. Thời gian: %s - %s. Doanh thu: %s đ.",
                customerName, spaceName, workspaceName, startTimeStr, endTimeStr, revenueStr
        );

        // 1. In-app notification for Organizer
        saveInAppNotification(organizer, NotificationType.BOOKING, title, content, "Booking", booking.getId());

        // 2. Email notification for Organizer
        if (StringUtils.hasText(organizer.getEmail())) {
            String organizerName = getCustomerFullName(organizer);
            String manageUrl = clientUrl + "/dashboard/organizer/bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #ecfdf5; color: #059669; border-radius: 9999px; font-size: 12px; font-weight: 700;">ĐẶT CHỖ MỚI THÀNH CÔNG</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Thông báo đặt chỗ từ khách hàng</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi Đối tác <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Không gian làm việc <strong>%s</strong> vừa ghi nhận một đơn đặt chỗ mới đã thanh toán và xác nhận thành công.
                        </p>
                    </div>

                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Khách hàng:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Vị trí chỗ ngồi:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #4f46e5; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Thời gian:</td>
                                <td style="padding: 10px 0; font-weight: 500; color: #0f172a; text-align: right;">%s - %s</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Doanh thu:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">%s đ</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Xem chi tiết trên Hub Quản lý
                        </a>
                    </div>
                </div>
                """, organizerName, workspaceName, bookingCode, customerName, spaceName, startTimeStr, endTimeStr, revenueStr, manageUrl);

            try {
                emailService.sendHtmlEmail(organizer.getEmail(), "[NexSpace] " + title, html);
            } catch (Exception e) {
                log.error("Failed to send new booking email to organizer {}: {}", organizer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void sendBookingPendingApprovalToOrganizerNotification(BookingModel booking) {
        if (booking == null || booking.getWorkspace() == null || booking.getWorkspace().getOrganizer() == null) {
            log.warn("Cannot send pending approval notification: booking or organizer is null");
            return;
        }

        UserModel organizer = booking.getWorkspace().getOrganizer();
        UserModel customer = booking.getCustomer();
        String customerName = customer != null ? getCustomerFullName(customer) : "Khách hàng";
        String workspaceName = (booking.getWorkspace().getName() != null) ? booking.getWorkspace().getName() : "Không gian của bạn";
        String spaceName = (booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : "Chỗ ngồi";
        String bookingCode = booking.getBookingCode();
        String startTimeStr = booking.getStartTime() != null ? booking.getStartTime().format(DATE_FORMATTER) : "N/A";
        String endTimeStr = booking.getEndTime() != null ? booking.getEndTime().format(DATE_FORMATTER) : "N/A";

        String title = "Yêu cầu đặt chỗ mới cần duyệt - #" + bookingCode;
        String content = String.format(
                "Khách hàng %s đã gửi yêu cầu đặt chỗ %s tại %s. Thời gian: %s - %s. Vui lòng phê duyệt đơn đặt chỗ.",
                customerName, spaceName, workspaceName, startTimeStr, endTimeStr
        );

        saveInAppNotification(organizer, NotificationType.BOOKING, title, content, "Booking", booking.getId());

        if (StringUtils.hasText(organizer.getEmail())) {
            String organizerName = getCustomerFullName(organizer);
            String manageUrl = clientUrl + "/dashboard/organizer/bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <h2 style="color: #4f46e5; margin: 0 0 12px 0;">Yêu cầu đặt chỗ mới cần duyệt</h2>
                    <p>Kính gửi Đối tác <strong>%s</strong>,</p>
                    <p>Khách hàng <strong>%s</strong> đã gửi yêu cầu đặt chỗ <strong>%s</strong> tại <strong>%s</strong> (%s - %s).</p>
                    <p><a href="%s" style="display:inline-block;padding:10px 20px;background:#4f46e5;color:#fff;border-radius:8px;text-decoration:none;">Phê duyệt đơn ngay</a></p>
                </div>
                """, organizerName, customerName, spaceName, workspaceName, startTimeStr, endTimeStr, manageUrl);
            try {
                emailService.sendHtmlEmail(organizer.getEmail(), "[NexSpace] " + title, html);
            } catch (Exception e) {
                log.error("Failed to send pending approval email to organizer {}: {}", organizer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void seedDemoNotifications(Long userId) {
        UserModel user = userRepository.findById(userId).orElse(null);
        if (user == null) {
            log.warn("Cannot seed demo notifications: user {} not found", userId);
            return;
        }

        saveInAppNotification(
                user,
                NotificationType.BOOKING,
                "Xác nhận đặt chỗ thành công - #BK-20261119-7A5006",
                "Đơn đặt chỗ #BK-20261119-7A5006 tại Enouvo Space 1 - Dragon Bridge Hub đã được xác nhận thành công. Mã Smart PIN cửa ra vào: 4892.",
                "Booking",
                1001L
        );

        saveInAppNotification(
                user,
                NotificationType.PAYMENT,
                "Thanh toán PayOS thành công - #BK-20261119-7A5006",
                "Giao dịch thanh toán PayOS thành công số tiền 151.200 đ. Hóa đơn điện tử VAT đã được gửi tới email của bạn.",
                "Booking",
                1001L
        );

        saveInAppNotification(
                user,
                NotificationType.BOOKING,
                "Hủy đặt chỗ thành công - #BK-20261119-719BD7",
                "Đơn đặt chỗ #BK-20261119-719BD7 tại Enouvo Tech Campus - FPT City Hub (Bàn Kỹ Sư Công Nghệ 01) đã được hủy thành công. Chỗ ngồi đã được giải phóng trên hệ thống.",
                "Booking",
                64L
        );

        saveInAppNotification(
                user,
                NotificationType.PAYMENT,
                "Thanh toán không thành công - #BK-20261119-65CF1F",
                "Giao dịch đơn đặt chỗ #BK-20261119-65CF1F bị hủy hoặc hết hạn thời gian giữ chỗ (Hold Expiry). Vui lòng thực hiện đặt lại khi có nhu cầu.",
                "Booking",
                1002L
        );

        saveInAppNotification(
                user,
                NotificationType.REFUND,
                "Yêu cầu hoàn tiền mới - #BK-20261119-719BD7",
                "Đơn đặt chỗ #BK-20261119-719BD7 tại Enouvo Tech Campus có yêu cầu hoàn lại số tiền 132.600 đ (Chính sách linh hoạt). Vui lòng kiểm tra trên hệ thống.",
                "RefundRequest",
                201L
        );

        saveInAppNotification(
                user,
                NotificationType.REFUND,
                "Hoàn tiền hoàn tất - #BK-20261119-719BD7",
                "Yêu cầu hoàn tiền số tiền 132.600 đ cho đơn đặt chỗ #BK-20261119-719BD7 đã được xử lý hoàn tất thành công. Tiền sẽ được chuyển về tài khoản của bạn.",
                "Booking",
                64L
        );

        saveInAppNotification(
                user,
                NotificationType.BOOKING,
                "Đặt chỗ mới tại không gian của bạn - #BK-20261119-89AB12",
                "Khách hàng Nguyễn Văn Khoa đã đặt thành công Bàn Hot Desk 01 tại Enouvo Space 1. Thời gian: 20/11/2026 09:00 - 12:00. Doanh thu: 105.000 đ.",
                "Booking",
                1003L
        );
    }

    @Override
    @Transactional
    public void sendBookingReminderNotification(BookingModel booking) {
        if (booking == null || booking.getCustomer() == null) {
            log.warn("Cannot send booking reminder notification: booking or customer is null");
            return;
        }

        UserModel customer = booking.getCustomer();
        String workspaceName = (booking.getWorkspace() != null && booking.getWorkspace().getName() != null)
                ? booking.getWorkspace().getName()
                : "NexSpace";
        String workspaceAddress = (booking.getWorkspace() != null && booking.getWorkspace().getAddress() != null)
                ? booking.getWorkspace().getAddress()
                : "Vui lòng xem chi tiết trên vé điện tử";
        String spaceName = (booking.getResource() != null && booking.getResource().getName() != null)
                ? booking.getResource().getName()
                : "Không gian làm việc";
        String bookingCode = booking.getBookingCode();
        String startTimeStr = booking.getStartTime() != null ? booking.getStartTime().format(DATE_FORMATTER) : "N/A";
        String endTimeStr = booking.getEndTime() != null ? booking.getEndTime().format(DATE_FORMATTER) : "N/A";

        // Generate 4-digit Smart PIN for access
        String pinCode = "----";
        if (StringUtils.hasText(bookingCode)) {
            int hash = Math.abs(bookingCode.hashCode());
            pinCode = String.format("%04d", hash % 10000);
        }

        String title = "Nhắc lịch: Phiên làm việc sắp bắt đầu - #" + bookingCode;
        String content = String.format(
                "Đơn đặt chỗ #%s tại %s (%s) sẽ bắt đầu trong vòng 1 giờ tới (%s). Mã PIN vào cửa của bạn là: %s. Chúc bạn có một ngày làm việc hiệu quả!",
                bookingCode, workspaceName, spaceName, startTimeStr, pinCode
        );

        // 1. Lưu thông báo In-app
        saveInAppNotification(customer, NotificationType.BOOKING, title, content, "BOOKING_REMINDER", booking.getId());

        // 2. Gửi Email nhắc lịch qua Gmail
        if (StringUtils.hasText(customer.getEmail())) {
            String customerName = getCustomerFullName(customer);
            String manageBookingUrl = clientUrl + "/workspaces/my-bookings";

            String html = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 14px; background-color: #fef3c7; color: #d97706; border-radius: 9999px; font-size: 12px; font-weight: 700; border: 1px solid #fde68a;">
                            ⏰ SẮP BẮT ĐẦU (TRONG 1 GIỜ TỚI)
                        </span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Nhắc lịch làm việc & Hướng dẫn check-in</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px; border-left: 4px solid #f59e0b;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Xin chào <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Phiên làm việc của bạn tại <strong>%s</strong> sắp bắt đầu trong vòng <strong>1 giờ tới</strong>. Hãy chuẩn bị và đến sớm 5-10 phút để nhận bàn làm việc và các tiện ích trọn vẹn nhất.
                        </p>
                    </div>

                    <!-- Smart PIN Highlight Card -->
                    <div style="background: linear-gradient(135deg, #1e1b4b 0%%, #312e81 100%%); border-radius: 14px; padding: 20px; text-align: center; margin-bottom: 24px; color: #ffffff; box-shadow: 0 4px 12px rgba(49, 46, 129, 0.25);">
                        <p style="margin: 0 0 6px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; color: #a5b4fc; font-weight: 600;">Mã Smart PIN mở cửa điện tử</p>
                        <div style="font-size: 32px; font-weight: 800; letter-spacing: 8px; font-family: monospace; color: #38bdf8; margin: 4px 0;">%s</div>
                        <p style="margin: 6px 0 0 0; font-size: 12px; color: #cbd5e1;">Sử dụng mã PIN này hoặc quét mã QR tại cổng ra vào không gian</p>
                    </div>

                    <!-- Booking Details Table -->
                    <div style="border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px 20px; margin-bottom: 24px;">
                        <table style="width: 100%%; border-collapse: collapse; font-size: 13px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Mã đơn đặt:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #0f172a; text-align: right; font-family: monospace;">#%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Không gian:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Địa chỉ:</td>
                                <td style="padding: 10px 0; font-weight: 500; color: #334155; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Vị trí chỗ ngồi:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #4f46e5; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Thời gian bắt đầu:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #d97706; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Thời gian kết thúc:</td>
                                <td style="padding: 10px 0; font-weight: 500; color: #0f172a; text-align: right;">%s</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Trạng thái:</td>
                                <td style="padding: 10px 0; font-weight: 700; color: #059669; text-align: right;">SẴN SÀNG CHECK-IN</td>
                            </tr>
                        </table>
                    </div>

                    <div style="text-align: center; margin-bottom: 24px;">
                        <a href="%s" style="display: inline-block; padding: 12px 28px; background-color: #4f46e5; color: #ffffff; text-decoration: none; border-radius: 10px; font-size: 14px; font-weight: 700; box-shadow: 0 2px 4px rgba(79, 70, 229, 0.2);">
                            Xem vé điện tử & Mã QR Check-in
                        </a>
                    </div>

                    <div style="background-color: #f1f5f9; border-radius: 10px; padding: 12px 16px; margin-bottom: 24px; font-size: 12px; color: #475569; line-height: 1.5;">
                        💡 <strong>Lưu ý:</strong> Bạn có thể xuất trình mã QR trên vé điện tử tại quầy lễ tân hoặc nhập Smart PIN tại khóa từ để mở cửa vào không gian làm việc.
                    </div>

                    <div style="border-top: 1px solid #f1f5f9; padding-top: 16px; font-size: 12px; color: #94a3b8; text-align: center;">
                        <p style="margin: 0 0 4px 0;">NexSpace — Nền tảng chia sẻ không gian làm việc số hóa hàng đầu</p>
                        <p style="margin: 0;">Chúc bạn có một buổi làm việc năng suất và hiệu quả!</p>
                    </div>
                </div>
                """, customerName, workspaceName, pinCode, bookingCode, workspaceName, workspaceAddress, spaceName, startTimeStr, endTimeStr, manageBookingUrl);

            try {
                emailService.sendHtmlEmail(customer.getEmail(), "[NexSpace] " + title, html);
                log.info("Sent booking reminder email to {} for booking {}", customer.getEmail(), bookingCode);
            } catch (Exception e) {
                log.error("Failed to send booking reminder email to {}: {}", customer.getEmail(), e.getMessage());
            }
        }
    }

    @Override
    @Transactional
    public void triggerBookingReminder(Long bookingId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Đơn đặt chỗ không tồn tại: " + bookingId));
        sendBookingReminderNotification(booking);
    }

    private void saveInAppNotification(
            UserModel user,
            NotificationType type,
            String title,
            String content,
            String relatedType,
            Long relatedId
    ) {
        try {
            UserNotificationModel model = new UserNotificationModel();
            model.setUser(user);
            model.setType(type);
            model.setTitle(title);
            model.setContent(content);
            model.setRelatedEntityType(relatedType);
            model.setRelatedEntityId(relatedId);
            model.setRead(false);
            model.setEmailStatus(DeliveryStatus.SENT);
            model.setPushStatus(null);
            model.setRetryCount(0);

            UserNotificationModel saved = notificationRepository.save(model);
            log.info("Saved in-app notification id={} for user={}", saved.getId(), user.getId());
        } catch (Exception e) {
            log.error("Failed to save in-app notification for user {}: {}", user.getId(), e.getMessage());
        }
    }

    private UserNotificationResponseDto toResponseDto(UserNotificationModel model) {
        return UserNotificationResponseDto.builder()
                .id(model.getId())
                .type(model.getType())
                .title(model.getTitle())
                .content(model.getContent())
                .relatedEntityType(model.getRelatedEntityType())
                .relatedEntityId(model.getRelatedEntityId())
                .read(model.isRead())
                .createdAt(model.getCreatedAt())
                .build();
    }

    private String getCustomerFullName(UserModel customer) {
        if (StringUtils.hasText(customer.getFirstName())) {
            String last = customer.getLastName() != null ? customer.getLastName() : "";
            return (customer.getFirstName() + " " + last).trim();
        }
        return customer.getUserName();
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0";
        return CURRENCY_FORMATTER.format(amount);
    }
}
