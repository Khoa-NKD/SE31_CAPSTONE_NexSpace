package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.InvoiceResponseDTO;
import base.api.feature.payment.dto.response.PaymentCheckoutResponseDTO;
import base.api.feature.payment.dto.response.PaymentStatusResponseDTO;
import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.feature.payment.service.IInvoiceService;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class CustomerPaymentControllerTest {

    private MockMvc mockMvc;
    private IPaymentService paymentService;
    private IInvoiceService invoiceService;
    private CurrentUserProvider currentUserProvider;

    @BeforeEach
    void setUp() {
        paymentService = mock(IPaymentService.class);
        invoiceService = mock(IInvoiceService.class);
        currentUserProvider = mock(CurrentUserProvider.class);

        CustomerPaymentController controller = new CustomerPaymentController(paymentService, invoiceService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("POST /api/customer/bookings/{bookingId}/payments returns 201 Created with VietQR payload")
    void createPayment_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        PaymentCheckoutResponseDTO checkoutDto = PaymentCheckoutResponseDTO.builder()
                .orderCode(123456789L)
                .bookingId(500L)
                .bookingCode("NX-500-TEST")
                .amount(BigDecimal.valueOf(255000))
                .currency("VND")
                .qrCode("00020101021238540010A000000727012600069704220110098765432152046011530370454062550005802VN62140810NX500 12346304ABCD")
                .bankBin("970422")
                .bankName("MBBank")
                .accountNumber("0987654321")
                .accountName("NEXSPACE")
                .description("NX500 1234")
                .expiresAt(LocalDateTime.now().plusMinutes(10))
                .checkoutUrl("https://pay.payos.vn/web/mock-link")
                .build();

        when(paymentService.createPaymentForBooking(500L, 100L)).thenReturn(checkoutDto);

        mockMvc.perform(post("/api/customer/bookings/500/payments"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderCode").value(123456789))
                .andExpect(jsonPath("$.data.bookingId").value(500))
                .andExpect(jsonPath("$.data.amount").value(255000))
                .andExpect(jsonPath("$.data.currency").value("VND"))
                .andExpect(jsonPath("$.data.bankBin").value("970422"))
                .andExpect(jsonPath("$.data.qrCode").value(checkoutDto.getQrCode()));

        verify(paymentService).createPaymentForBooking(500L, 100L);
    }

    @Test
    @DisplayName("GET /api/customer/bookings/{bookingId}/payment-status returns 200 OK")
    void getPaymentStatus_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        PaymentStatusResponseDTO statusDto = PaymentStatusResponseDTO.builder()
                .orderCode(123456789L)
                .bookingId(500L)
                .paymentStatus(PaymentStatus.SUCCESS)
                .bookingStatus(BookingStatus.CONFIRMED)
                .qrTokenHash("hash-qr-12345")
                .pinCode("8821")
                .build();

        when(paymentService.getPaymentStatus(500L, 100L)).thenReturn(statusDto);

        mockMvc.perform(get("/api/customer/bookings/500/payment-status"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.paymentStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.data.bookingStatus").value("CONFIRMED"))
                .andExpect(jsonPath("$.data.pinCode").value("8821"));

        verify(paymentService).getPaymentStatus(500L, 100L);
    }

    @Test
    @DisplayName("POST /api/customer/payments/{orderCode}/cancel cancels payment and returns 200 OK")
    void cancelPayment_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        mockMvc.perform(post("/api/customer/payments/123456789/cancel")
                        .param("reason", "Changed my mind"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));

        verify(paymentService).cancelPayment(123456789L, 100L, "Changed my mind");
    }

    @Test
    @DisplayName("GET /api/customer/payments returns paginated payment history")
    void getPaymentHistory_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        PaymentTransactionResponseDTO tx = PaymentTransactionResponseDTO.builder()
                .orderCode(123456789L)
                .bookingId(500L)
                .bookingCode("NX-500-TEST")
                .amount(BigDecimal.valueOf(255000))
                .status(PaymentStatus.SUCCESS)
                .build();

        when(paymentService.getCustomerPaymentHistory(eq(100L), any(), any(PageRequestDTO.class)))
                .thenReturn(new PageImpl<>(List.of(tx), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/customer/payments")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].orderCode").value(123456789))
                .andExpect(jsonPath("$.data.totalElements").value(1));

        verify(paymentService).getCustomerPaymentHistory(eq(100L), any(), any(PageRequestDTO.class));
    }

    @Test
    @DisplayName("GET /api/customer/bookings/{bookingId}/receipt returns invoice metadata")
    void getInvoice_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        InvoiceResponseDTO invoice = InvoiceResponseDTO.builder()
                .invoiceNumber("INV-202611-000500")
                .bookingId(500L)
                .bookingCode("NX-500-TEST")
                .invoiceUrl("https://res.cloudinary.com/nexspace/raw/upload/v1/nexspace/invoices/2026/11/invoice_NX-500-TEST.pdf")
                .totalAmount(BigDecimal.valueOf(255000))
                .currency("VND")
                .status("SUCCESS")
                .build();

        when(invoiceService.getOrCreateInvoice(500L, 100L)).thenReturn(invoice);

        mockMvc.perform(get("/api/customer/bookings/500/receipt"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.invoiceNumber").value("INV-202611-000500"))
                .andExpect(jsonPath("$.data.invoiceUrl").value(invoice.getInvoiceUrl()));

        verify(invoiceService).getOrCreateInvoice(500L, 100L);
    }

    @Test
    @DisplayName("GET /api/customer/bookings/{bookingId}/receipt/download returns PDF byte stream")
    void downloadInvoicePdf_success() throws Exception {
        when(currentUserProvider.getCurrentUserId()).thenReturn(100L);

        byte[] fakePdf = "%PDF-1.4 simulated pdf bytes".getBytes();
        when(invoiceService.generateInvoicePdf(500L, 100L)).thenReturn(fakePdf);

        mockMvc.perform(get("/api/customer/bookings/500/receipt/download"))
                .andExpect(status().isOk())
                .andExpect(header().string("Content-Type", MediaType.APPLICATION_PDF_VALUE))
                .andExpect(header().string("Content-Disposition", "attachment; filename=\"invoice_booking_500.pdf\""))
                .andExpect(content().bytes(fakePdf));

        verify(invoiceService).generateInvoicePdf(500L, 100L);
    }
}

