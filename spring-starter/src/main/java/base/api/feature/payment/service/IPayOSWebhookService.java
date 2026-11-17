package base.api.feature.payment.service;

import base.api.feature.payment.dto.response.WebhookProcessResultDTO;
import vn.payos.model.webhooks.Webhook;

public interface IPayOSWebhookService {

    /**
     * Xử lý webhook từ PayOS (xác minh chữ ký, tra soát giao dịch, cập nhật booking và log audit).
     *
     * @param webhook Webhook payload đã deserialized từ Jackson
     * @param rawPayload Chuỗi JSON nguyên bản để lưu log webhook
     * @return Kết quả xử lý webhook
     */
    WebhookProcessResultDTO processWebhook(Webhook webhook, String rawPayload);

    /**
     * Xác nhận và đăng ký Webhook URL với cổng PayOS (hỗ trợ kiểm thử qua ngrok hoặc production).
     *
     * @param webhookUrl Địa chỉ công khai nhận webhook (ví dụ https://xxx.ngrok-free.app/api/webhooks/payos)
     */
    void confirmWebhook(String webhookUrl);

    /**
     * Giả lập webhook trong môi trường dev/kiểm thử để test luồng confirm booking mà không cần chuyển khoản thật.
     *
     * @param orderCode Mã đơn hàng
     * @param amount Số tiền thanh toán (null = lấy theo transaction)
     * @param success Trạng thái giao dịch thành công hay thất bại
     * @return Kết quả xử lý
     */
    WebhookProcessResultDTO simulateWebhook(Long orderCode, Long amount, boolean success);
}

