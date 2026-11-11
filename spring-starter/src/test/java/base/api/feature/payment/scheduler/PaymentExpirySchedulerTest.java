package base.api.feature.payment.scheduler;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import vn.payos.PayOS;
import vn.payos.service.blocking.v2.paymentRequests.PaymentRequestsService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class PaymentExpirySchedulerTest {

    private IBookingRepository bookingRepository;
    private IPaymentTransactionRepository paymentTransactionRepository;
    private IAuditService auditService;
    private PayOS payOS;
    private PaymentRequestsService paymentRequestsService;
    private PaymentExpiryScheduler scheduler;

    @BeforeEach
    void setUp() {
        bookingRepository = mock(IBookingRepository.class);
        paymentTransactionRepository = mock(IPaymentTransactionRepository.class);
        auditService = mock(IAuditService.class);
        payOS = mock(PayOS.class);
        paymentRequestsService = mock(PaymentRequestsService.class);

        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);

        scheduler = new PaymentExpiryScheduler(
                bookingRepository,
                paymentTransactionRepository,
                auditService,
                payOS
        );
    }

    @Test
    @DisplayName("expirePendingPaymentsAndBookings: marks expired transactions and bookings as EXPIRED and releases hold")
    void expirePendingPaymentsAndBookings_success() {
        UserModel customer = new UserModel();
        customer.setId(10L);
        customer.setEmail("customer@nexspace.vn");

        BookingModel booking = new BookingModel();
        booking.setId(500L);
        booking.setBookingCode("NX-500-EXPIRE");
        booking.setCustomer(customer);
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setHoldExpiresAt(LocalDateTime.now().minusMinutes(1));

        PaymentTransactionModel tx = new PaymentTransactionModel();
        tx.setId(1001L);
        tx.setOrderCode(8821009L);
        tx.setBooking(booking);
        tx.setStatus(PaymentStatus.PENDING);
        tx.setAmount(BigDecimal.valueOf(255000));
        tx.setExpiresAt(LocalDateTime.now().minusMinutes(1));

        when(paymentTransactionRepository.findExpiredTransactions(eq(PaymentStatus.PENDING), any()))
                .thenReturn(List.of(tx));
        when(bookingRepository.findExpiredHoldBookings(eq(BookingStatus.PENDING_PAYMENT), any()))
                .thenReturn(List.of(booking));

        scheduler.expirePendingPaymentsAndBookings();

        // Verify transaction expired
        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.EXPIRED);
        assertThat(tx.getFailureReason()).contains("hết hạn thanh toán");
        verify(paymentTransactionRepository).save(tx);
        verify(paymentRequestsService).cancel(eq(8821009L), anyString());

        // Verify booking expired
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.EXPIRED);
        assertThat(booking.getHoldExpiresAt()).isNull();
        verify(bookingRepository).save(booking);

        // Verify audit log
        verify(auditService).log(
                eq(customer),
                eq(AuditActorType.SYSTEM),
                eq("BOOKING"),
                eq("BOOKING_EXPIRED"),
                eq("Booking"),
                eq(500L),
                eq("PENDING_PAYMENT"),
                eq("EXPIRED"),
                contains("Hết thời gian giữ chỗ 10 phút"),
                isNull()
        );
    }
}

