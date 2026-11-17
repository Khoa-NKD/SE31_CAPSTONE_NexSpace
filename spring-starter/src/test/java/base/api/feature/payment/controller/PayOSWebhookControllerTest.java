package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.WebhookProcessResultDTO;
import base.api.feature.payment.service.IPayOSWebhookService;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.GlobalExceptionHandler;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PayOSWebhookControllerTest {

    private MockMvc mockMvc;
    private IPayOSWebhookService webhookService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        webhookService = mock(IPayOSWebhookService.class);
        objectMapper = new ObjectMapper();

        PayOSWebhookController controller = new PayOSWebhookController(webhookService, objectMapper);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/webhooks/payos with valid payload returns 200 OK")
    void handlePayosWebhook_success() throws Exception {
        String payload = """
                {
                  "code": "00",
                  "desc": "success",
                  "success": true,
                  "data": {
                    "orderCode": 123456,
                    "amount": 255000,
                    "description": "NX100",
                    "accountNumber": "0987654321",
                    "reference": "FT26118821",
                    "transactionDateTime": "2026-11-11 20:30:00",
                    "currency": "VND",
                    "paymentLinkId": "link_123"
                  },
                  "signature": "valid_hmac_signature"
                }
                """;

        when(webhookService.processWebhook(any(), anyString()))
                .thenReturn(WebhookProcessResultDTO.builder()
                        .orderCode(123456L)
                        .status("SUCCESS")
                        .message("Xử lý thanh toán thành công, đơn đặt chỗ đã được xác nhận")
                        .build());

        mockMvc.perform(post("/api/webhooks/payos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderCode").value(123456))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        verify(webhookService).processWebhook(any(), anyString());
    }

    @Test
    @DisplayName("POST /api/webhooks/payos with invalid signature returns 400 Bad Request")
    void handlePayosWebhook_invalidSignature() throws Exception {
        String payload = """
                {
                  "code": "00",
                  "desc": "success",
                  "success": true,
                  "data": {
                    "orderCode": 999999,
                    "amount": 255000
                  },
                  "signature": "forged_signature"
                }
                """;

        when(webhookService.processWebhook(any(), anyString()))
                .thenThrow(new BadRequestException("Chữ ký số webhook không hợp lệ"));

        mockMvc.perform(post("/api/webhooks/payos")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Chữ ký số webhook không hợp lệ"));
    }

    @Test
    @DisplayName("POST /api/webhooks/payos/confirm registers webhook URL successfully")
    void confirmWebhook_success() throws Exception {
        String requestBody = """
                {
                  "webhookUrl": "https://nexspace-gateway.ngrok-free.app/api/webhooks/payos"
                }
                """;

        doNothing().when(webhookService).confirmWebhook("https://nexspace-gateway.ngrok-free.app/api/webhooks/payos");

        mockMvc.perform(post("/api/webhooks/payos/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xác nhận Webhook URL với PayOS thành công"));

        verify(webhookService).confirmWebhook("https://nexspace-gateway.ngrok-free.app/api/webhooks/payos");
    }

    @Test
    @DisplayName("POST /api/webhooks/payos/confirm with blank URL returns 400 Bad Request")
    void confirmWebhook_blankUrl_badRequest() throws Exception {
        String requestBody = """
                {
                  "webhookUrl": "  "
                }
                """;

        mockMvc.perform(post("/api/webhooks/payos/confirm")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));

        verify(webhookService, never()).confirmWebhook(anyString());
    }

    @Test
    @DisplayName("POST /api/webhooks/payos/simulate returns 200 OK with simulated result")
    void simulateWebhook_success() throws Exception {
        String requestBody = """
                {
                  "orderCode": 882100,
                  "amount": 255000,
                  "success": true
                }
                """;

        when(webhookService.simulateWebhook(882100L, 255000L, true))
                .thenReturn(WebhookProcessResultDTO.builder()
                        .orderCode(882100L)
                        .status("SUCCESS")
                        .message("Mô phỏng thanh toán thành công")
                        .build());

        mockMvc.perform(post("/api/webhooks/payos/simulate")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(requestBody))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderCode").value(882100))
                .andExpect(jsonPath("$.data.status").value("SUCCESS"));

        verify(webhookService).simulateWebhook(882100L, 255000L, true);
    }
}

