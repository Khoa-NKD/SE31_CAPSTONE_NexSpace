package base.api.feature.payment.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.payment.dto.response.InvoiceResponseDTO;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.service.IInvoiceService;
import base.api.shared.config.EmailService;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import com.lowagie.text.Document;
import com.lowagie.text.Element;
import com.lowagie.text.Font;
import com.lowagie.text.FontFactory;
import com.lowagie.text.PageSize;
import com.lowagie.text.Paragraph;
import com.lowagie.text.Phrase;
import com.lowagie.text.pdf.PdfPCell;
import com.lowagie.text.pdf.PdfPTable;
import com.lowagie.text.pdf.PdfWriter;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.Map;

@Slf4j
@Service
@RequiredArgsConstructor
public class InvoiceServiceImpl implements IInvoiceService {

    private final IBookingRepository bookingRepository;
    private final IPaymentTransactionRepository paymentTransactionRepository;
    private final EmailService emailService;

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.folder.nexspace.invoices:nexspace/invoices}")
    private String invoiceRootFolder;

    private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");

    @Override
    @Transactional(readOnly = true)
    public byte[] generateInvoicePdf(Long bookingId, Long actorId) {
        BookingModel booking = getValidatedBooking(bookingId, actorId);
        PaymentTransactionModel tx = paymentTransactionRepository.findTopByBookingIdOrderByCreatedAtDesc(bookingId)
                .orElse(null);

        return createPdfDocument(booking, tx);
    }

    @Override
    @Transactional
    public InvoiceResponseDTO getOrCreateInvoice(Long bookingId, Long actorId) {
        BookingModel booking = getValidatedBooking(bookingId, actorId);
        PaymentTransactionModel tx = paymentTransactionRepository.findTopByBookingIdOrderByCreatedAtDesc(bookingId)
                .orElse(null);

        byte[] pdfBytes = createPdfDocument(booking, tx);

        LocalDateTime now = LocalDateTime.now();
        String year = String.valueOf(now.getYear());
        String month = String.format("%02d", now.getMonthValue());
        String folder = invoiceRootFolder.replace("{year}", year).replace("{month}", month);
        if (!folder.contains(year)) {
            folder = folder + "/" + year + "/" + month;
        }

        String invoiceNumber = "INV-" + (tx != null ? tx.getOrderCode() : booking.getId());
        String secureUrl = null;

        if (isCloudinaryConfigured()) {
            try {
                Cloudinary cloudinary = new Cloudinary(ObjectUtils.asMap(
                        "cloud_name", cloudName.trim(),
                        "api_key", apiKey.trim(),
                        "api_secret", apiSecret.trim()
                ));

                log.info("Uploading invoice PDF to Cloudinary: folder={}, public_id=invoice_{}", folder, booking.getBookingCode());
                @SuppressWarnings("rawtypes")
                Map uploadResult = cloudinary.uploader().upload(pdfBytes, ObjectUtils.asMap(
                        "resource_type", "raw",
                        "folder", folder,
                        "public_id", "invoice_" + booking.getBookingCode(),
                        "overwrite", true
                ));

                secureUrl = (String) uploadResult.get("secure_url");
                log.info("Invoice uploaded successfully to Cloudinary: {}", secureUrl);
            } catch (Exception e) {
                log.error("Failed to upload invoice to Cloudinary: {}", e.getMessage(), e);
            }
        } else {
            log.warn("Cloudinary not configured; invoice PDF generated in-memory without remote upload");
        }

        if (!StringUtils.hasText(secureUrl)) {
            secureUrl = "/api/customer/bookings/" + booking.getId() + "/receipt/download";
        }

        BigDecimal amount = (tx != null && tx.getReceivedAmount() != null)
                ? tx.getReceivedAmount()
                : booking.getFinalPrice();

        return InvoiceResponseDTO.builder()
                .bookingId(booking.getId())
                .bookingCode(booking.getBookingCode())
                .orderCode(tx != null ? tx.getOrderCode() : null)
                .invoiceNumber(invoiceNumber)
                .invoiceUrl(secureUrl)
                .totalAmount(amount)
                .currency("VND")
                .status(booking.getStatus().name())
                .issuedAt(now)
                .build();
    }

    private BookingModel getValidatedBooking(Long bookingId, Long actorId) {
        BookingModel booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId));

        if (actorId != null && booking.getCustomer() != null && !booking.getCustomer().getId().equals(actorId)) {
            throw new NotFoundException("Đơn đặt chỗ không tồn tại với ID: " + bookingId);
        }

        if (booking.getStatus() == BookingStatus.PENDING_PAYMENT || booking.getStatus() == BookingStatus.EXPIRED) {
            throw new BadRequestException("Đơn đặt chỗ chưa được thanh toán thành công, không thể xuất hóa đơn");
        }

        return booking;
    }

    private byte[] createPdfDocument(BookingModel booking, PaymentTransactionModel tx) {
        try (ByteArrayOutputStream out = new ByteArrayOutputStream()) {
            Document document = new Document(PageSize.A4, 36, 36, 36, 36);
            PdfWriter.getInstance(document, out);
            document.open();

            Font fontBrand = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 22, new Color(30, 41, 59));
            Font fontHeader = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 14, new Color(30, 41, 59));
            Font fontSub = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(100, 116, 139));
            Font fontBold = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 10, new Color(30, 41, 59));
            Font fontNormal = FontFactory.getFont(FontFactory.HELVETICA, 10, new Color(51, 65, 85));
            Font fontPaid = FontFactory.getFont(FontFactory.HELVETICA_BOLD, 12, new Color(16, 185, 129));

            // Header Section
            PdfPTable headerTable = new PdfPTable(2);
            headerTable.setWidthPercentage(100);
            headerTable.setWidths(new float[]{60, 40});

            PdfPCell leftCell = new PdfPCell();
            leftCell.setBorder(PdfPCell.NO_BORDER);
            leftCell.addElement(new Paragraph("NEXSPACE", fontBrand));
            leftCell.addElement(new Paragraph("Nền tảng Đặt Không gian làm việc thông minh", fontSub));
            leftCell.addElement(new Paragraph("support@nexspace.vn • www.nexspace.vn", fontSub));
            headerTable.addCell(leftCell);

            String orderCodeStr = (tx != null && tx.getOrderCode() != null) ? String.valueOf(tx.getOrderCode()) : String.valueOf(booking.getId());
            PdfPCell rightCell = new PdfPCell();
            rightCell.setBorder(PdfPCell.NO_BORDER);
            rightCell.setHorizontalAlignment(Element.ALIGN_RIGHT);
            rightCell.addElement(new Paragraph("HÓA ĐƠN ĐIỆN TỬ / RECEIPT", fontHeader));
            rightCell.addElement(new Paragraph("Số hóa đơn: INV-" + orderCodeStr, fontBold));
            String dateStr = (tx != null && tx.getPaidAt() != null)
                    ? tx.getPaidAt().format(DATE_FORMATTER)
                    : LocalDateTime.now().format(DATE_FORMATTER);
            rightCell.addElement(new Paragraph("Ngày thanh toán: " + dateStr, fontSub));
            rightCell.addElement(new Paragraph("[ ĐÃ THANH TOÁN / PAID ]", fontPaid));
            headerTable.addCell(rightCell);

            document.add(headerTable);
            document.add(new Paragraph(" "));

            // Billed To & Workspace Info Table
            PdfPTable infoTable = new PdfPTable(2);
            infoTable.setWidthPercentage(100);
            infoTable.setWidths(new float[]{50, 50});

            PdfPCell customerCell = new PdfPCell();
            customerCell.setBackgroundColor(new Color(248, 250, 252));
            customerCell.setPadding(10);
            customerCell.addElement(new Paragraph("THÔNG TIN KHÁCH HÀNG (BILLED TO)", fontBold));
            String customerName = booking.getCustomer() != null ? booking.getCustomer().getFullName() : "N/A";
            String customerEmail = booking.getCustomer() != null ? booking.getCustomer().getEmail() : "N/A";
            customerCell.addElement(new Paragraph("Họ và tên: " + customerName, fontNormal));
            customerCell.addElement(new Paragraph("Email: " + customerEmail, fontNormal));
            infoTable.addCell(customerCell);

            PdfPCell workspaceCell = new PdfPCell();
            workspaceCell.setBackgroundColor(new Color(248, 250, 252));
            workspaceCell.setPadding(10);
            workspaceCell.addElement(new Paragraph("ĐỊA ĐIỂM SỬ DỤNG (WORKSPACE)", fontBold));
            String wsName = booking.getWorkspace() != null ? booking.getWorkspace().getName() : "NexSpace Workspace";
            String wsAddress = booking.getWorkspace() != null ? booking.getWorkspace().getAddress() : "Việt Nam";
            workspaceCell.addElement(new Paragraph("Không gian: " + wsName, fontNormal));
            workspaceCell.addElement(new Paragraph("Địa chỉ: " + wsAddress, fontNormal));
            infoTable.addCell(workspaceCell);

            document.add(infoTable);
            document.add(new Paragraph(" "));

            // Booking Details Table
            PdfPTable detailsTable = new PdfPTable(4);
            detailsTable.setWidthPercentage(100);
            detailsTable.setWidths(new float[]{40, 25, 15, 20});

            addTableHeader(detailsTable, "Mục Dịch Vụ", fontBold);
            addTableHeader(detailsTable, "Thời Gian Đặt", fontBold);
            addTableHeader(detailsTable, "Số Người", fontBold);
            addTableHeader(detailsTable, "Thành Tiền", fontBold);

            String resourceName = booking.getResource() != null ? booking.getResource().getName() : "Chỗ ngồi làm việc";
            String startStr = booking.getStartTime() != null ? booking.getStartTime().format(DATE_FORMATTER) : "";
            String endStr = booking.getEndTime() != null ? booking.getEndTime().format(DATE_FORMATTER) : "";
            String timeRange = startStr + " - " + endStr;

            BigDecimal amount = (tx != null && tx.getReceivedAmount() != null)
                    ? tx.getReceivedAmount()
                    : booking.getFinalPrice();

            addTableCell(detailsTable, "Đặt chỗ: " + resourceName + "\nMã đặt chỗ: #" + booking.getBookingCode(), fontNormal);
            addTableCell(detailsTable, timeRange, fontNormal);
            addTableCell(detailsTable, String.valueOf(booking.getPartySize()) + " người", fontNormal);
            addTableCell(detailsTable, formatCurrency(amount) + " VND", fontBold);

            document.add(detailsTable);
            document.add(new Paragraph(" "));

            // Payment Summary Box
            PdfPTable summaryTable = new PdfPTable(2);
            summaryTable.setWidthPercentage(100);
            summaryTable.setWidths(new float[]{60, 40});

            PdfPCell notesCell = new PdfPCell();
            notesCell.setBorder(PdfPCell.NO_BORDER);
            notesCell.addElement(new Paragraph("PHƯƠNG THỨC THANH TOÁN: PayOS (VietQR Napas 24/7)", fontBold));
            if (tx != null && StringUtils.hasText(tx.getGatewayTransactionId())) {
                notesCell.addElement(new Paragraph("Mã tham chiếu ngân hàng: " + tx.getGatewayTransactionId(), fontSub));
            }
            if (StringUtils.hasText(booking.getQrTokenHash())) {
                notesCell.addElement(new Paragraph("Mã check-in số hóa: " + booking.getQrTokenHash(), fontSub));
            }
            summaryTable.addCell(notesCell);

            PdfPCell totalCell = new PdfPCell();
            totalCell.setBackgroundColor(new Color(241, 245, 249));
            totalCell.setPadding(10);
            totalCell.addElement(new Paragraph("TỔNG THANH TOÁN (TOTAL):", fontSub));
            Paragraph totalPara = new Paragraph(formatCurrency(amount) + " VND", FontFactory.getFont(FontFactory.HELVETICA_BOLD, 16, new Color(79, 70, 229)));
            totalCell.addElement(totalPara);
            summaryTable.addCell(totalCell);

            document.add(summaryTable);
            document.add(new Paragraph(" "));

            // Footer
            Paragraph footer = new Paragraph("Cảm ơn bạn đã lựa chọn NexSpace! Hóa đơn điện tử này có giá trị xác nhận dịch vụ chính thức.", fontSub);
            footer.setAlignment(Element.ALIGN_CENTER);
            document.add(footer);

            document.close();
            return out.toByteArray();
        } catch (Exception e) {
            log.error("Failed to generate invoice PDF for booking {}: {}", booking.getId(), e.getMessage(), e);
            throw new RuntimeException("Lỗi sinh hóa đơn PDF: " + e.getMessage(), e);
        }
    }

    private void addTableHeader(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setBackgroundColor(new Color(226, 232, 240));
        cell.setPadding(6);
        table.addCell(cell);
    }

    private void addTableCell(PdfPTable table, String text, Font font) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setPadding(6);
        table.addCell(cell);
    }

    private String formatCurrency(BigDecimal amount) {
        if (amount == null) return "0";
        return String.format("%,d", amount.longValue()).replace(',', '.');
    }

    private boolean isCloudinaryConfigured() {
        return StringUtils.hasText(cloudName) && StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret);
    }

    @Override
    @Transactional(readOnly = true)
    public void sendInvoiceEmail(Long bookingId) {
        try {
            BookingModel booking = bookingRepository.findById(bookingId).orElse(null);
            if (booking == null) {
                log.warn("Không tìm thấy đơn đặt chỗ id={} để gửi hóa đơn email", bookingId);
                return;
            }
            if (booking.getCustomer() == null || !StringUtils.hasText(booking.getCustomer().getEmail())) {
                log.warn("Đơn đặt chỗ id={} không có email khách hàng để gửi hóa đơn", bookingId);
                return;
            }

            String customerEmail = booking.getCustomer().getEmail();
            String customerName = StringUtils.hasText(booking.getCustomer().getFirstName())
                    ? (booking.getCustomer().getFirstName() + " " + (booking.getCustomer().getLastName() != null ? booking.getCustomer().getLastName() : "")).trim()
                    : booking.getCustomer().getUserName();

            PaymentTransactionModel tx = paymentTransactionRepository.findTopByBookingIdOrderByCreatedAtDesc(bookingId).orElse(null);
            byte[] pdfBytes = createPdfDocument(booking, tx);

            String workspaceName = booking.getWorkspace() != null ? booking.getWorkspace().getName() : "NexSpace";
            String spaceName = booking.getResource() != null ? booking.getResource().getName() : "Không gian làm việc";
            String bookingCode = booking.getBookingCode();
            String amountStr = formatCurrency(booking.getFinalPrice()) + " VNĐ";

            String startTimeStr = booking.getStartTime() != null ? booking.getStartTime().format(DATE_FORMATTER) : "";
            String endTimeStr = booking.getEndTime() != null ? booking.getEndTime().format(DATE_FORMATTER) : "";

            String htmlBody = String.format("""
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 28px; border: 1px solid #e2e8f0; border-radius: 16px; background-color: #ffffff; color: #1e293b;">
                    <div style="text-align: center; margin-bottom: 24px; padding-bottom: 20px; border-bottom: 1px solid #f1f5f9;">
                        <h2 style="color: #4f46e5; margin: 0 0 6px 0; font-size: 24px; font-weight: 800; letter-spacing: -0.5px;">NexSpace</h2>
                        <span style="display: inline-block; padding: 4px 12px; background-color: #ecfdf5; color: #059669; border-radius: 9999px; font-size: 12px; font-weight: 700;">Thanh Toán Thành Công</span>
                        <p style="color: #64748b; font-size: 13px; margin: 10px 0 0 0;">Hóa đơn điện tử & Xác nhận đặt chỗ dịch vụ</p>
                    </div>

                    <div style="background-color: #f8fafc; border-radius: 12px; padding: 18px; margin-bottom: 24px;">
                        <p style="margin: 0 0 8px 0; font-size: 14px; color: #334155;">Kính gửi <strong>%s</strong>,</p>
                        <p style="margin: 0; font-size: 13px; color: #475569; line-height: 1.6;">
                            Hệ thống đã nhận thanh toán thành công qua PayOS cho đơn đặt chỗ <strong>#%s</strong> tại NexSpace. Chi tiết đơn đặt chỗ và biên lai giao dịch được cập nhật như sau:
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
                                <td style="padding: 10px 0; color: #64748b;">Vị trí / Chỗ ngồi:</td>
                                <td style="padding: 10px 0; font-weight: 600; color: #4f46e5; text-align: right;">%s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Khung giờ:</td>
                                <td style="padding: 10px 0; color: #0f172a; text-align: right;">%s – %s</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 10px 0; color: #64748b;">Tổng tiền đã trả:</td>
                                <td style="padding: 10px 0; font-size: 16px; font-weight: 800; color: #059669; text-align: right;">%s</td>
                            </tr>
                            <tr>
                                <td style="padding: 10px 0; color: #64748b;">Cổng thanh toán:</td>
                                <td style="padding: 10px 0; color: #0f172a; text-align: right;">VietQR Live (PayOS)</td>
                            </tr>
                        </table>
                    </div>

                    <div style="background-color: #f0fdf4; border: 1px dashed #86efac; border-radius: 10px; padding: 14px; margin-bottom: 24px; text-align: center;">
                        <span style="color: #166534; font-size: 13px; font-weight: 600;">📎 File hóa đơn PDF chính thức đã được đính kèm cùng email này.</span>
                    </div>

                    <div style="font-size: 11px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px; line-height: 1.5;">
                        Cần hỗ trợ? Quý khách vui lòng gửi email về <strong>nexspace305@gmail.com</strong>.<br/>
                        © 2026 NexSpace Technologies Inc. All rights reserved.
                    </div>
                </div>
            """,
                    customerName,
                    bookingCode,
                    bookingCode,
                    workspaceName,
                    spaceName,
                    startTimeStr,
                    endTimeStr,
                    amountStr
            );

            String subject = "[NexSpace] Hóa đơn điện tử & Xác nhận thanh toán #" + bookingCode;
            String pdfFilename = "Hoa_Don_NexSpace_" + bookingCode + ".pdf";

            emailService.sendHtmlEmailWithAttachment(customerEmail, subject, htmlBody, pdfFilename, pdfBytes, "application/pdf");
            log.info("Đã kích hoạt gửi hóa đơn PDF qua email cho bookingId={} tới {}", bookingId, customerEmail);
        } catch (Exception e) {
            log.error("Lỗi khi gửi email hóa đơn cho bookingId={}: {}", bookingId, e.getMessage(), e);
        }
    }
}
