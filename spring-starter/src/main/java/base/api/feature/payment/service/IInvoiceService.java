package base.api.feature.payment.service;

import base.api.feature.payment.dto.response.InvoiceResponseDTO;

public interface IInvoiceService {

    /**
     * Sinh file PDF hóa đơn/biên nhận thanh toán dưới dạng byte array để stream/download trực tiếp.
     *
     * @param bookingId ID đơn đặt chỗ
     * @param actorId ID người dùng yêu cầu (áp dụng Strict Ownership Defense)
     * @return Dữ liệu nhị phân PDF
     */
    byte[] generateInvoicePdf(Long bookingId, Long actorId);

    /**
     * Sinh hóa đơn PDF, tải lên Cloudinary theo đúng thư mục nexspace/invoices/{year}/{month}/ và trả về metadata URL.
     *
     * @param bookingId ID đơn đặt chỗ
     * @param actorId ID người dùng yêu cầu
     * @return Thông tin hóa đơn kèm URL Cloudinary
     */
    InvoiceResponseDTO getOrCreateInvoice(Long bookingId, Long actorId);
}
