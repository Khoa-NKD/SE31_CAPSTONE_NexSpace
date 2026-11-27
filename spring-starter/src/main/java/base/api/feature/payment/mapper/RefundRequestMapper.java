package base.api.feature.payment.mapper;

import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.RefundSource;
import base.api.shared.enums.RefundStatus;
import org.springframework.util.StringUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;

public final class RefundRequestMapper {

    /**
     * Danh sách mã BIN ngân hàng được hệ thống PayOS Payout hỗ trợ hoàn tiền tự động:
     * - 970422: MB Bank (Ngân hàng Quân Đội)
     * - 970416: ACB (Ngân hàng Á Châu)
     * - 970452: KienlongBank (Ngân hàng Kiên Long)
     */
    public static final Set<String> PAYOS_AUTO_REFUND_SUPPORTED_BINS = Set.of(
            "970422",
            "970416",
            "970452"
    );

    private RefundRequestMapper() {
    }

    public static boolean isPayOSAutoRefundSupportedBank(String bankBin, String bankName) {
        if (StringUtils.hasText(bankBin)) {
            String cleanBin = bankBin.trim();
            if (PAYOS_AUTO_REFUND_SUPPORTED_BINS.contains(cleanBin)) {
                return true;
            }
            String upperBin = cleanBin.toUpperCase(Locale.ROOT);
            if ("MB".equals(upperBin) || "MBBANK".equals(upperBin)
                    || "ACB".equals(upperBin)
                    || "KLB".equals(upperBin) || "KIENLONGBANK".equals(upperBin) || "KIENLONG".equals(upperBin)) {
                return true;
            }
        }
        if (StringUtils.hasText(bankName)) {
            String upper = bankName.trim().toUpperCase(Locale.ROOT);
            return upper.contains("MBBANK") || upper.contains("MB BANK") || upper.equals("MB") || upper.contains("QUÂN ĐỘI") || upper.contains("QUAN DOI")
                    || upper.contains("ACB") || upper.contains("Á CHÂU") || upper.contains("A CHAU")
                    || upper.contains("KIENLONG") || upper.contains("KIÊN LONG") || upper.contains("KIEN LONG") || upper.equals("KLB");
        }
        return false;
    }

    public static String resolveSupportedBankBin(String bankIdOrBin, String bankName) {
        String combined = ((bankIdOrBin != null ? bankIdOrBin : "") + " " + (bankName != null ? bankName : ""))
                .trim().toUpperCase(Locale.ROOT);
        if (combined.contains("970422") || combined.contains("MBBANK") || combined.contains("MB BANK")
                || combined.equals("MB") || combined.contains("QUAN DOI") || combined.contains("QUÂN ĐỘI")) {
            return "970422";
        }
        if (combined.contains("970416") || combined.contains("ACB") || combined.contains("A CHAU") || combined.contains("Á CHÂU")) {
            return "970416";
        }
        if (combined.contains("970452") || combined.contains("KIENLONG") || combined.contains("KIEN LONG")
                || combined.contains("KIÊN LONG") || combined.contains("KLB")) {
            return "970452";
        }
        if (StringUtils.hasText(bankIdOrBin) && bankIdOrBin.trim().matches("\\d{6}")) {
            return bankIdOrBin.trim();
        }
        return null;
    }

    public static String resolveBankDisplayName(String bankBin, String rawBankName) {
        if ("970422".equals(bankBin)) {
            return "MB Bank (Ngân hàng Quân Đội)";
        }
        if ("970416".equals(bankBin)) {
            return "ACB (Ngân hàng Á Châu)";
        }
        if ("970452".equals(bankBin)) {
            return "KienlongBank (Ngân hàng Kiên Long)";
        }
        if (StringUtils.hasText(rawBankName)) {
            return rawBankName.trim();
        }
        if (StringUtils.hasText(bankBin)) {
            return switch (bankBin.trim()) {
                case "970436" -> "Vietcombank";
                case "970415" -> "VietinBank";
                case "970407" -> "Techcombank";
                case "970418" -> "BIDV";
                case "970423" -> "TPBank";
                case "970432" -> "VPBank";
                case "970405" -> "Agribank";
                case "970403" -> "Sacombank";
                default -> "Ngân hàng (BIN " + bankBin.trim() + ")";
            };
        }
        return null;
    }

    public static String resolveSourceLabel(RefundSource source) {
        if (source == null) {
            return "Yêu cầu hoàn tiền";
        }
        return switch (source) {
            case PAYMENT_DISCREPANCY -> "Tự động hoàn do chuyển khoản sau khi hết giữ chỗ";
            case CUSTOMER_CANCEL -> "Hủy đặt chỗ trước thời gian sử dụng";
            case ADMIN_DISPUTE -> "Khiếu nại & Yêu cầu hoàn tiền sau sử dụng";
            case ORGANIZER_CANCEL -> "Chủ không gian hủy đơn (Hoàn 100%)";
        };
    }

    public static RefundRequestResponseDto toDto(RefundRequestModel model) {
        if (model == null) {
            return null;
        }

        BookingModel booking = model.getBooking();
        Long bookingId = null;
        String bookingCode = null;
        BookingStatus bookingStatus = null;
        LocalDateTime bookingStartTime = null;
        LocalDateTime bookingEndTime = null;
        Long customerId = null;
        String customerName = null;
        String customerEmail = null;
        Long workspaceId = null;
        String workspaceName = null;
        String workspaceAddress = null;
        String seatCode = null;
        String resourceName = null;

        if (booking != null) {
            bookingId = booking.getId();
            bookingCode = booking.getBookingCode();
            bookingStatus = booking.getStatus();
            bookingStartTime = booking.getStartTime();
            bookingEndTime = booking.getEndTime();
            UserModel customer = booking.getCustomer();
            if (customer != null) {
                customerId = customer.getId();
                customerName = customer.getFullName();
                customerEmail = customer.getEmail();
            }
            WorkspaceModel workspace = booking.getWorkspace();
            if (workspace != null) {
                workspaceId = workspace.getId();
                workspaceName = workspace.getName();
                workspaceAddress = workspace.getAddress();
            }
            BookableResourceModel resource = booking.getResource();
            if (resource != null) {
                resourceName = resource.getName();
                seatCode = resource.getName();
            }
        }

        PaymentTransactionModel tx = model.getPaymentTransaction();
        BigDecimal originalPaid = null;
        Long paymentOrderCode = null;
        LocalDateTime paidAt = null;
        if (tx != null) {
            originalPaid = tx.getReceivedAmount() != null ? tx.getReceivedAmount() : tx.getAmount();
            paymentOrderCode = tx.getOrderCode();
            paidAt = tx.getPaidAt();
        }

        Long reviewedById = null;
        String reviewedByName = null;
        UserModel reviewedBy = model.getReviewedBy();
        if (reviewedBy != null) {
            reviewedById = reviewedBy.getId();
            reviewedByName = reviewedBy.getFullName();
        }

        boolean hasBankAccount = StringUtils.hasText(model.getBankBin()) && StringUtils.hasText(model.getBankAccountNumber());
        boolean supportedBank = isPayOSAutoRefundSupportedBank(model.getBankBin(), model.getBankName());
        boolean needsBankInfo = model.getStatus() == RefundStatus.PENDING
                && (!hasBankAccount || (model.getSource() == RefundSource.PAYMENT_DISCREPANCY && !supportedBank));

        return RefundRequestResponseDto.builder()
                .id(model.getId())
                .bookingId(bookingId)
                .bookingCode(bookingCode)
                .bookingStatus(bookingStatus)
                .bookingStartTime(bookingStartTime)
                .bookingEndTime(bookingEndTime)
                .customerId(customerId)
                .customerName(customerName)
                .customerEmail(customerEmail)
                .workspaceId(workspaceId)
                .workspaceName(workspaceName)
                .workspaceAddress(workspaceAddress)
                .seatCode(seatCode)
                .resourceName(resourceName)
                .paymentOrderCode(paymentOrderCode)
                .paidAt(paidAt)
                .originalPaidAmount(originalPaid)
                .requestedAmount(model.getRequestedAmount())
                .approvedAmount(model.getApprovedAmount())
                .status(model.getStatus())
                .source(model.getSource())
                .sourceLabel(resolveSourceLabel(model.getSource()))
                .reason(model.getReason())
                .bankName(model.getBankName())
                .bankBin(model.getBankBin())
                .bankAccountNumber(model.getBankAccountNumber())
                .bankAccountName(model.getBankAccountName())
                .needsBankInfo(needsBankInfo)
                .autoRefundSupportedBank(supportedBank)
                .adminNote(model.getAdminNote())
                .refundReference(model.getRefundReference())
                .reviewedById(reviewedById)
                .reviewedByName(reviewedByName)
                .reviewedAt(model.getReviewedAt())
                .processedAt(model.getProcessedAt())
                .createdAt(model.getCreatedAt())
                .build();
    }
}
