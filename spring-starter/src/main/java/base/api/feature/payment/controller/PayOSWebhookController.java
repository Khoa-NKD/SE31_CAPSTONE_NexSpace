package base.api.feature.payment.controller;

import base.api.feature.payment.dto.request.ConfirmWebhookRequestDTO;
import base.api.feature.payment.dto.request.SimulateWebhookRequestDTO;
import base.api.feature.payment.dto.response.WebhookProcessResultDTO;
import base.api.feature.payment.service.IPayOSWebhookService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.exception.BadRequestException;
import com.fasterxml.jackson.databind.ObjectMapper;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import vn.payos.model.webhooks.Webhook;

@Slf4j
@RestController
@RequestMapping({"/api/webhooks/payos", "/api/v1/webhooks/payos"})
@RequiredArgsConstructor
@Tag(name = "Payment Webhook", description = "Endpoints xử lý Webhook từ cổng thanh toán PayOS")
public class PayOSWebhookController extends BaseAPIController {

    private final IPayOSWebhookService webhookService;
    private final ObjectMapper objectMapper;

    @GetMapping
    @Operation(summary = "Health-check endpoint cho PayOS Webhook")
    public ResponseEntity<ApiResponse<String>> healthCheck() {
        return success("PayOS Webhook is active and reachable", "OK");
    }

    @PostMapping
    @Operation(summary = "Nhận và xử lý webhook từ PayOS (công khai, xác thực bằng HMAC-SHA256)")
    public ResponseEntity<ApiResponse<WebhookProcessResultDTO>> handlePayosWebhook(
            @RequestBody String rawPayload) {
        log.info("Received PayOS webhook request: {}", rawPayload);
        try {
            Webhook webhook = objectMapper.readValue(rawPayload, Webhook.class);
            WebhookProcessResultDTO result = webhookService.processWebhook(webhook, rawPayload);
            return success(result, "Xử lý webhook PayOS thành công");
        } catch (BadRequestException e) {
            throw e;
        } catch (Exception e) {
            log.error("Failed to parse or process webhook payload: {}", e.getMessage(), e);
            throw new BadRequestException("Payload webhook không hợp lệ: " + e.getMessage());
        }
    }

    @PostMapping("/confirm")
    @Operation(summary = "Đăng ký hoặc xác nhận Webhook URL với PayOS (hỗ trợ kiểm thử qua ngrok)")
    public ResponseEntity<ApiResponse<Void>> confirmWebhook(
            @Valid @RequestBody ConfirmWebhookRequestDTO request) {
        webhookService.confirmWebhook(request.getWebhookUrl());
        return success(null, "Xác nhận Webhook URL với PayOS thành công");
    }

    @PostMapping("/simulate")
    @Operation(summary = "Giả lập webhook thanh toán trong môi trường dev/test")
    public ResponseEntity<ApiResponse<WebhookProcessResultDTO>> simulateWebhook(
            @Valid @RequestBody SimulateWebhookRequestDTO request) {
        WebhookProcessResultDTO result = webhookService.simulateWebhook(
                request.getOrderCode(),
                request.getAmount(),
                Boolean.TRUE.equals(request.getSuccess())
        );
        return success(result, "Mô phỏng thanh toán thành công");
    }
}

