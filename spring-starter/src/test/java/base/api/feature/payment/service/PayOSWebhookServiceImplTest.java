package base.api.feature.payment.service;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.dto.response.WebhookProcessResultDTO;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.service.impl.PayOSWebhookServiceImpl;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.CancelSource;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.payos.PayOS;
import vn.payos.exception.WebhookException;
import vn.payos.model.webhooks.Webhook;
import vn.payos.model.webhooks.WebhookData;
import vn.payos.service.blocking.webhooks.WebhooksService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PayOSWebhookServiceImplTest {

    private IPaymentTransactionRepository paymentTransactionRepository;
    private IBookingRepository bookingRepository;
    private IAuditService auditService;
    private PayOS payOS;
    private WebhooksService webhooksService;
    private PayOSWebhookServiceImpl webhookService;

    @BeforeEach
    void setUp() {
        paymentTransactionRepository = mock(IPaymentTransactionRepository.class);
        bookingRepository = mock(IBookingRepository.class);
        auditService = mock(IAuditService.class);
        payOS = mock(PayOS.class);
        webhooksService = mock(WebhooksService.class);

        when(payOS.webhooks()).thenReturn(webhooksService);

        webhookService = new PayOSWebhookServiceImpl(
                paymentTransactionRepository,
                bookingRepository,
                auditService,
                payOS
        );
    }

    private UserModel createCustomer() {
        UserModel user = new UserModel();
        user.setId(10L);
        user.setEmail("customer@nexspace.vn");
        user.setFirstName("Huy");
        user.setLastName("Minh");
        user.setUserName("huymd");
        return user;
    }

    private BookingModel createBooking(UserModel customer) {
        BookingModel booking = new BookingModel();
        booking.setId(500L);
        booking.setBookingCode("NX-500-PAYOS");
        booking.setCustomer(customer);
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(10));
        booking.setFinalPrice(BigDecimal.valueOf(255000));
        return booking;
    }

    private PaymentTransactionModel createTransaction(BookingModel booking, Long orderCode, BigDecimal amount) {
        PaymentTransactionModel tx = new PaymentTransactionModel();
        tx.setId(1001L);
        tx.setBooking(booking);
        tx.setOrderCode(orderCode);
        tx.setAmount(amount);
        tx.setStatus(PaymentStatus.PENDING);
        tx.setReconciliationStatus(ReconciliationStatus.UNRECONCILED);
        return tx;
    }

    @Test
    @DisplayName("processWebhook: successful payment transitions transaction to SUCCESS and booking to CONFIRMED")
    void processWebhook_success() {
        UserModel customer = createCustomer();
        BookingModel booking = createBooking(customer);
        Long orderCode = 8821001L;
        PaymentTransactionModel tx = createTransaction(booking, orderCode, BigDecimal.valueOf(255000));

        WebhookData webhookData = new WebhookData();
        webhookData.setOrderCode(orderCode);
        webhookData.setAmount(255000L);
        webhookData.setCode("00");
        webhookData.setDesc("success");
        webhookData.setReference("FT2611-TEST");

        Webhook webhook = new Webhook();
        webhook.setCode("00");
        webhook.setDesc("success");
        webhook.setSuccess(true);
        webhook.setData(webhookData);
        webhook.setSignature("valid_sig");

        when(webhooksService.verify(webhook)).thenReturn(webhookData);
        when(paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)).thenReturn(Optional.of(tx));
        when(bookingRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WebhookProcessResultDTO result = webhookService.processWebhook(webhook, "{\"raw\":\"payload\"}");

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(result.getOrderCode()).isEqualTo(orderCode);

        // Verify transaction updates
        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(tx.getReceivedAmount()).isEqualByComparingTo(BigDecimal.valueOf(255000));
        assertThat(tx.getReconciliationStatus()).isEqualTo(ReconciliationStatus.MATCHED);
        assertThat(tx.getGatewayTransactionId()).isEqualTo("FT2611-TEST");
        assertThat(tx.getPaidAt()).isNotNull();
        assertThat(tx.getWebhookPayload()).isEqualTo("{\"raw\":\"payload\"}");

        // Verify booking updates
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(booking.getHoldExpiresAt()).isNull();
        assertThat(booking.getQrTokenHash()).startsWith("NXQR-NX-500-PAYOS-");

        // Verify audit log
        verify(auditService).log(
                eq(customer),
                eq(AuditActorType.PAYMENT_WEBHOOK),
                eq("PAYMENT"),
                eq("BOOKING_CONFIRMED"),
                eq("Booking"),
                eq(500L),
                eq("PENDING_PAYMENT"),
                eq("CONFIRMED"),
                contains("orderCode=" + orderCode),
                isNull()
        );
    }

    @Test
    @DisplayName("processWebhook: idempotency - duplicate delivery returns ALREADY_PROCESSED and does not modify booking")
    void processWebhook_idempotent() {
        UserModel customer = createCustomer();
        BookingModel booking = createBooking(customer);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setQrTokenHash("EXISTING_HASH");

        Long orderCode = 8821002L;
        PaymentTransactionModel tx = createTransaction(booking, orderCode, BigDecimal.valueOf(255000));
        tx.setStatus(PaymentStatus.SUCCESS);

        WebhookData webhookData = new WebhookData();
        webhookData.setOrderCode(orderCode);
        webhookData.setAmount(255000L);

        Webhook webhook = new Webhook();
        webhook.setCode("00");
        webhook.setData(webhookData);
        webhook.setSignature("valid_sig");

        when(webhooksService.verify(webhook)).thenReturn(webhookData);
        when(paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)).thenReturn(Optional.of(tx));

        WebhookProcessResultDTO result = webhookService.processWebhook(webhook, "{}");

        assertThat(result.getStatus()).isEqualTo("ALREADY_PROCESSED");
        verify(bookingRepository, never()).save(any());
        verify(paymentTransactionRepository, never()).save(any());
    }

    @Test
    @DisplayName("processWebhook: invalid HMAC signature throws BadRequestException and writes security audit")
    void processWebhook_invalidSignature() {
        Long orderCode = 8821003L;
        WebhookData data = new WebhookData();
        data.setOrderCode(orderCode);

        Webhook webhook = new Webhook();
        webhook.setData(data);
        webhook.setSignature("invalid");

        when(webhooksService.verify(webhook)).thenThrow(new WebhookException("Data not integrity"));

        assertThatThrownBy(() -> webhookService.processWebhook(webhook, "{}"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chữ ký số webhook không hợp lệ");

        verify(auditService).log(
                isNull(),
                eq(AuditActorType.PAYMENT_WEBHOOK),
                eq("PAYMENT"),
                eq("PAYMENT_WEBHOOK_INVALID_SIGNATURE"),
                eq("PaymentTransaction"),
                eq(orderCode),
                isNull(),
                isNull(),
                contains("Data not integrity"),
                isNull()
        );
    }

    @Test
    @DisplayName("processWebhook: unknown orderCode (e.g. test ping) returns IGNORED without throwing")
    void processWebhook_unknownOrderCode_ignored() {
        Long unknownOrderCode = 9999999L;
        WebhookData data = new WebhookData();
        data.setOrderCode(unknownOrderCode);

        Webhook webhook = new Webhook();
        webhook.setCode("00");
        webhook.setData(data);
        webhook.setSignature("valid_sig");

        when(webhooksService.verify(webhook)).thenReturn(data);
        when(paymentTransactionRepository.findByOrderCodeForUpdate(unknownOrderCode)).thenReturn(Optional.empty());

        WebhookProcessResultDTO result = webhookService.processWebhook(webhook, "{}");

        assertThat(result.getStatus()).isEqualTo("IGNORED");
        assertThat(result.getMessage()).contains("Không tìm thấy giao dịch");
    }

    @Test
    @DisplayName("processWebhook: underpayment marks transaction FAILED and logs audit without confirming booking")
    void processWebhook_underpayment_failed() {
        UserModel customer = createCustomer();
        BookingModel booking = createBooking(customer);
        Long orderCode = 8821004L;
        PaymentTransactionModel tx = createTransaction(booking, orderCode, BigDecimal.valueOf(255000));

        WebhookData webhookData = new WebhookData();
        webhookData.setOrderCode(orderCode);
        webhookData.setAmount(100000L); // Underpaid: only 100k out of 255k
        webhookData.setCode("00");

        Webhook webhook = new Webhook();
        webhook.setCode("00");
        webhook.setData(webhookData);
        webhook.setSignature("valid_sig");

        when(webhooksService.verify(webhook)).thenReturn(webhookData);
        when(paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)).thenReturn(Optional.of(tx));
        when(bookingRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WebhookProcessResultDTO result = webhookService.processWebhook(webhook, "{}");

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(tx.getReconciliationStatus()).isEqualTo(ReconciliationStatus.MISMATCH);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.PENDING_PAYMENT); // NOT confirmed

        verify(auditService).log(
                eq(customer),
                eq(AuditActorType.PAYMENT_WEBHOOK),
                eq("PAYMENT"),
                eq("PAYMENT_UNDERPAID"),
                eq("PaymentTransaction"),
                eq(tx.getId()),
                any(), any(), any(), any()
        );
    }

    @Test
    @DisplayName("processWebhook: payment failed status cancels booking and marks transaction FAILED")
    void processWebhook_paymentFailedCode() {
        UserModel customer = createCustomer();
        BookingModel booking = createBooking(customer);
        Long orderCode = 8821005L;
        PaymentTransactionModel tx = createTransaction(booking, orderCode, BigDecimal.valueOf(255000));

        WebhookData webhookData = new WebhookData();
        webhookData.setOrderCode(orderCode);
        webhookData.setCode("01");
        webhookData.setDesc("Giao dịch bị hủy bởi người dùng");

        Webhook webhook = new Webhook();
        webhook.setCode("01");
        webhook.setDesc("Giao dịch bị hủy bởi người dùng");
        webhook.setData(webhookData);
        webhook.setSignature("valid_sig");

        when(webhooksService.verify(webhook)).thenReturn(webhookData);
        when(paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)).thenReturn(Optional.of(tx));
        when(bookingRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WebhookProcessResultDTO result = webhookService.processWebhook(webhook, "{}");

        assertThat(result.getStatus()).isEqualTo("FAILED");
        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.FAILED);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        assertThat(booking.getCancelSource()).isEqualTo(CancelSource.SYSTEM);

        verify(auditService).log(
                eq(customer),
                eq(AuditActorType.PAYMENT_WEBHOOK),
                eq("PAYMENT"),
                eq("PAYMENT_FAILED"),
                eq("Booking"),
                eq(500L),
                eq("PENDING_PAYMENT"),
                eq("CANCELLED"),
                any(), isNull()
        );
    }

    @Test
    @DisplayName("simulateWebhook: successfully confirms transaction and booking without external PayOS call")
    void simulateWebhook_success() {
        UserModel customer = createCustomer();
        BookingModel booking = createBooking(customer);
        Long orderCode = 8821006L;
        PaymentTransactionModel tx = createTransaction(booking, orderCode, BigDecimal.valueOf(255000));

        when(paymentTransactionRepository.findByOrderCodeForUpdate(orderCode)).thenReturn(Optional.of(tx));
        when(bookingRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));
        when(bookingRepository.save(any())).thenAnswer(inv -> inv.getArgument(0));

        WebhookProcessResultDTO result = webhookService.simulateWebhook(orderCode, 255000L, true);

        assertThat(result.getStatus()).isEqualTo("SUCCESS");
        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(booking.getQrTokenHash()).isNotNull();
    }

    @Test
    @DisplayName("confirmWebhook: calls payOS.webhooks().confirm with URL")
    void confirmWebhook_success() {
        String url = "https://gateway.ngrok-free.app/api/webhooks/payos";
        webhookService.confirmWebhook(url);
        verify(webhooksService).confirm(url);
    }
}

