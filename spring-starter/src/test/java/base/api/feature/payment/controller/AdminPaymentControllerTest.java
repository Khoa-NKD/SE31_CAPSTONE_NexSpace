package base.api.feature.payment.controller;

import base.api.feature.payment.dto.response.BatchReconciliationResponseDTO;
import base.api.feature.payment.dto.response.PaymentTransactionResponseDTO;
import base.api.feature.payment.dto.response.ReconciliationResultDTO;
import base.api.feature.payment.dto.response.ReconciliationSummaryDTO;
import base.api.feature.payment.service.IPaymentReconciliationService;
import base.api.feature.payment.service.IPaymentService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminPaymentControllerTest {

    private MockMvc mockMvc;
    private IPaymentService paymentService;
    private IPaymentReconciliationService reconciliationService;
    private CurrentUserProvider currentUserProvider;

    @BeforeEach
    void setUp() {
        paymentService = mock(IPaymentService.class);
        reconciliationService = mock(IPaymentReconciliationService.class);
        currentUserProvider = mock(CurrentUserProvider.class);

        AdminPaymentController controller = new AdminPaymentController(paymentService, reconciliationService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    @Test
    @DisplayName("GET /api/admin/payments returns paginated transactions with filters")
    void getTransactions_success() throws Exception {
        PaymentTransactionResponseDTO tx = PaymentTransactionResponseDTO.builder()
                .orderCode(111222333L)
                .bookingId(99L)
                .bookingCode("NX-99-ADM")
                .amount(BigDecimal.valueOf(1200000))
                .status(PaymentStatus.SUCCESS)
                .reconciliationStatus(ReconciliationStatus.MATCHED)
                .build();

        when(paymentService.getAdminPaymentHistory(any(), any(), any(PageRequestDTO.class)))
                .thenReturn(new PageImpl<>(List.of(tx), PageRequest.of(0, 10), 1));

        mockMvc.perform(get("/api/admin/payments")
                        .param("status", "SUCCESS")
                        .param("reconciliationStatus", "MATCHED")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.content[0].orderCode").value(111222333))
                .andExpect(jsonPath("$.data.content[0].reconciliationStatus").value("MATCHED"))
                .andExpect(jsonPath("$.data.totalElements").value(1));

        verify(paymentService).getAdminPaymentHistory(any(), any(), any(PageRequestDTO.class));
    }

    @Test
    @DisplayName("GET /api/admin/payments/{orderCode} returns single transaction detail")
    void getTransactionDetail_success() throws Exception {
        PaymentTransactionResponseDTO tx = PaymentTransactionResponseDTO.builder()
                .orderCode(111222333L)
                .bookingId(99L)
                .bookingCode("NX-99-ADM")
                .amount(BigDecimal.valueOf(1200000))
                .status(PaymentStatus.SUCCESS)
                .build();

        when(paymentService.getTransactionDetail(111222333L)).thenReturn(tx);

        mockMvc.perform(get("/api/admin/payments/111222333"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.orderCode").value(111222333));

        verify(paymentService).getTransactionDetail(111222333L);
    }

    @Test
    @DisplayName("POST /api/admin/payments/{orderCode}/reconcile executes single transaction reconciliation")
    void reconcileTransaction_success() throws Exception {
        ReconciliationResultDTO result = ReconciliationResultDTO.builder()
                .orderCode(111222333L)
                .localStatus(PaymentStatus.SUCCESS)
                .gatewayStatus("PAID")
                .localAmount(BigDecimal.valueOf(1200000))
                .gatewayAmount(BigDecimal.valueOf(1200000))
                .reconciliationStatus(ReconciliationStatus.MATCHED)
                .note("Dữ liệu hoàn toàn khớp giữa NexSpace và PayOS.")
                .reconciledAt(LocalDateTime.now())
                .build();

        when(reconciliationService.reconcileTransaction(111222333L)).thenReturn(result);

        mockMvc.perform(post("/api/admin/payments/111222333/reconcile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.localStatus").value("SUCCESS"))
                .andExpect(jsonPath("$.data.gatewayStatus").value("PAID"))
                .andExpect(jsonPath("$.data.reconciliationStatus").value("MATCHED"));

        verify(reconciliationService).reconcileTransaction(111222333L);
    }

    @Test
    @DisplayName("POST /api/admin/payments/batch-reconcile triggers batch reconciliation")
    void batchReconcile_success() throws Exception {
        BatchReconciliationResponseDTO batch = BatchReconciliationResponseDTO.builder()
                .totalProcessed(10)
                .matchedCount(9)
                .mismatchCount(1)
                .autoHealedCount(1)
                .errorCount(0)
                .completedAt(LocalDateTime.now())
                .build();

        when(reconciliationService.batchReconcile()).thenReturn(batch);

        mockMvc.perform(post("/api/admin/payments/batch-reconcile"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalProcessed").value(10))
                .andExpect(jsonPath("$.data.matchedCount").value(9));

        verify(reconciliationService).batchReconcile();
    }

    @Test
    @DisplayName("GET /api/admin/payments/reconciliation-summary returns KPI metrics")
    void getReconciliationSummary_success() throws Exception {
        ReconciliationSummaryDTO summary = ReconciliationSummaryDTO.builder()
                .totalTransactions(100L)
                .matchedCount(95L)
                .mismatchCount(2L)
                .unreconciledCount(3L)
                .resolvedCount(0L)
                .build();

        when(reconciliationService.getReconciliationSummary()).thenReturn(summary);

        mockMvc.perform(get("/api/admin/payments/reconciliation-summary"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.totalTransactions").value(100))
                .andExpect(jsonPath("$.data.matchedCount").value(95))
                .andExpect(jsonPath("$.data.mismatchCount").value(2));

        verify(reconciliationService).getReconciliationSummary();
    }
}
