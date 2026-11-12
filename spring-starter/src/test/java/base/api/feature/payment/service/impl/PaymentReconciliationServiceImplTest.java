package base.api.feature.payment.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.dto.response.BatchReconciliationResponseDTO;
import base.api.feature.payment.dto.response.ReconciliationResultDTO;
import base.api.feature.payment.dto.response.ReconciliationSummaryDTO;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.PaymentLink;
import vn.payos.model.v2.paymentRequests.PaymentLinkStatus;
import vn.payos.service.blocking.v2.paymentRequests.PaymentRequestsService;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.ArgumentMatchers.isNull;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentReconciliationServiceImplTest {

    @Mock
    private IPaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private IAuditService auditService;

    @Mock
    private PayOS payOS;

    @Mock
    private PaymentRequestsService paymentRequestsService;

    private PaymentReconciliationServiceImpl reconciliationService;

    private PaymentTransactionModel transaction;
    private BookingModel booking;

    @BeforeEach
    void setUp() {
        reconciliationService = new PaymentReconciliationServiceImpl(
                paymentTransactionRepository,
                bookingRepository,
                auditService,
                payOS
        );

        booking = new BookingModel();
        booking.setId(500L);
        booking.setBookingCode("NX-500-REC");
        booking.setStatus(BookingStatus.CONFIRMED);

        transaction = new PaymentTransactionModel();
        transaction.setId(1L);
        transaction.setOrderCode(123456789L);
        transaction.setBooking(booking);
        transaction.setAmount(BigDecimal.valueOf(250000));
        transaction.setReceivedAmount(BigDecimal.valueOf(250000));
        transaction.setStatus(PaymentStatus.SUCCESS);
        transaction.setReconciliationStatus(ReconciliationStatus.UNRECONCILED);
    }

    @Test
    @DisplayName("reconcileTransaction matches successfully when both local and gateway are PAID/SUCCESS")
    void reconcileTransaction_matched() {
        when(paymentTransactionRepository.findByOrderCodeForUpdate(123456789L)).thenReturn(Optional.of(transaction));
        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);

        PaymentLink link = new PaymentLink();
        link.setOrderCode(123456789L);
        link.setStatus(PaymentLinkStatus.PAID);
        link.setAmountPaid(250000L);
        link.setAmount(250000L);
        when(paymentRequestsService.get(123456789L)).thenReturn(link);

        ReconciliationResultDTO result = reconciliationService.reconcileTransaction(123456789L);

        assertThat(result.getReconciliationStatus()).isEqualTo(ReconciliationStatus.MATCHED);
        assertThat(transaction.getReconciliationStatus()).isEqualTo(ReconciliationStatus.MATCHED);

        verify(paymentTransactionRepository).save(transaction);
        verify(auditService).log(
                isNull(),
                eq(AuditActorType.SYSTEM),
                eq("PAYMENT"),
                eq("PAYMENT_RECONCILED"),
                eq("PaymentTransaction"),
                eq(1L),
                isNull(),
                eq("MATCHED"),
                any(),
                isNull()
        );
    }

    @Test
    @DisplayName("reconcileTransaction auto-heals when local is PENDING but gateway is PAID (missed webhook recovery)")
    void reconcileTransaction_autoHealMissedWebhook() {
        transaction.setStatus(PaymentStatus.PENDING);
        transaction.setReceivedAmount(BigDecimal.ZERO);
        booking.setStatus(BookingStatus.PENDING_PAYMENT);

        when(paymentTransactionRepository.findByOrderCodeForUpdate(123456789L)).thenReturn(Optional.of(transaction));
        when(bookingRepository.findByIdForUpdate(500L)).thenReturn(Optional.of(booking));
        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);

        PaymentLink link = new PaymentLink();
        link.setOrderCode(123456789L);
        link.setStatus(PaymentLinkStatus.PAID);
        link.setAmountPaid(250000L);
        link.setAmount(250000L);
        when(paymentRequestsService.get(123456789L)).thenReturn(link);

        ReconciliationResultDTO result = reconciliationService.reconcileTransaction(123456789L);

        assertThat(result.getReconciliationStatus()).isEqualTo(ReconciliationStatus.MATCHED);
        assertThat(transaction.getStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CONFIRMED);

        verify(bookingRepository).save(booking);
        verify(paymentTransactionRepository).save(transaction);
    }

    @Test
    @DisplayName("reconcileTransaction flags MISMATCH when local is SUCCESS but gateway is CANCELLED")
    void reconcileTransaction_mismatch() {
        when(paymentTransactionRepository.findByOrderCodeForUpdate(123456789L)).thenReturn(Optional.of(transaction));
        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);

        PaymentLink link = new PaymentLink();
        link.setOrderCode(123456789L);
        link.setStatus(PaymentLinkStatus.CANCELLED);
        link.setAmountPaid(0L);
        link.setAmount(250000L);
        when(paymentRequestsService.get(123456789L)).thenReturn(link);

        ReconciliationResultDTO result = reconciliationService.reconcileTransaction(123456789L);

        assertThat(result.getReconciliationStatus()).isEqualTo(ReconciliationStatus.MISMATCH);
        assertThat(transaction.getReconciliationStatus()).isEqualTo(ReconciliationStatus.MISMATCH);

        verify(paymentTransactionRepository).save(transaction);
    }

    @Test
    @DisplayName("batchReconcile scans unreconciled and mismatch records")
    void batchReconcile_success() {
        when(paymentTransactionRepository.findByReconciliationStatus(ReconciliationStatus.UNRECONCILED))
                .thenReturn(List.of(transaction));
        when(paymentTransactionRepository.findByReconciliationStatus(ReconciliationStatus.MISMATCH))
                .thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findByOrderCodeForUpdate(123456789L)).thenReturn(Optional.of(transaction));
        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);

        PaymentLink link = new PaymentLink();
        link.setOrderCode(123456789L);
        link.setStatus(PaymentLinkStatus.PAID);
        link.setAmountPaid(250000L);
        link.setAmount(250000L);
        when(paymentRequestsService.get(123456789L)).thenReturn(link);

        BatchReconciliationResponseDTO batch = reconciliationService.batchReconcile();

        assertThat(batch.getTotalProcessed()).isEqualTo(1);
        assertThat(batch.getMatchedCount()).isEqualTo(1);
        assertThat(batch.getMismatchCount()).isEqualTo(0);
    }

    @Test
    @DisplayName("getReconciliationSummary calculates counts and aggregates properly")
    void getReconciliationSummary_success() {
        when(paymentTransactionRepository.count()).thenReturn(100L);
        when(paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.MATCHED)).thenReturn(90L);
        when(paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.MISMATCH)).thenReturn(2L);
        when(paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.UNRECONCILED)).thenReturn(8L);
        when(paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.RESOLVED)).thenReturn(0L);

        ReconciliationSummaryDTO summary = reconciliationService.getReconciliationSummary();

        assertThat(summary.getTotalTransactions()).isEqualTo(100L);
        assertThat(summary.getMatchedCount()).isEqualTo(90L);
        assertThat(summary.getMismatchCount()).isEqualTo(2L);
        assertThat(summary.getUnreconciledCount()).isEqualTo(8L);
        assertThat(summary.getResolvedCount()).isEqualTo(0L);
    }
}
