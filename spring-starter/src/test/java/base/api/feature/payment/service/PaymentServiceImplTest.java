package base.api.feature.payment.service;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.payment.dto.response.ExchangeRateResponseDTO;
import base.api.feature.payment.dto.response.PaymentCheckoutResponseDTO;
import base.api.feature.payment.dto.response.PaymentStatusResponseDTO;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.payment.service.impl.PaymentServiceImpl;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import vn.payos.PayOS;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkRequest;
import vn.payos.model.v2.paymentRequests.CreatePaymentLinkResponse;
import vn.payos.service.blocking.v2.paymentRequests.PaymentRequestsService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class PaymentServiceImplTest {

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private IPaymentTransactionRepository paymentTransactionRepository;

    @Mock
    private PayOS payOS;

    @Mock
    private PaymentRequestsService paymentRequestsService;

    @InjectMocks
    private PaymentServiceImpl paymentService;

    private UserModel customer;
    private BookingModel booking;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(paymentService, "usdToVndRate", 25450L);
        ReflectionTestUtils.setField(paymentService, "holdMinutes", 10);
        ReflectionTestUtils.setField(paymentService, "returnUrl", "http://localhost:5173/workspaces/confirmation");
        ReflectionTestUtils.setField(paymentService, "cancelUrl", "http://localhost:5173/workspaces/review");

        customer = new UserModel();
        customer.setId(100L);
        customer.setFirstName("Van Test");
        customer.setLastName("Nguyen");
        customer.setUserName("customertest");
        customer.setEmail("customer@nexspace.vn");

        booking = new BookingModel();
        booking.setId(500L);
        booking.setBookingCode("NX-500-TEST");
        booking.setCustomer(customer);
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        booking.setFinalPrice(BigDecimal.valueOf(10.00)); // $10 USD
        booking.setHoldExpiresAt(LocalDateTime.now().plusMinutes(10));
    }

    @Test
    @DisplayName("getExchangeRate should return USD to VND configuration")
    void getExchangeRate_success() {
        ExchangeRateResponseDTO quote = paymentService.getExchangeRate();
        assertThat(quote.getBaseCurrency()).isEqualTo("USD");
        assertThat(quote.getTargetCurrency()).isEqualTo("VND");
        assertThat(quote.getExchangeRate()).isEqualByComparingTo(BigDecimal.valueOf(25450));
    }

    @Test
    @DisplayName("createPaymentForBooking converts USD to VND, calls PayOS, saves transaction and returns VietQR")
    void createPaymentForBooking_success() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));
        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);

        CreatePaymentLinkResponse mockPayosResponse = CreatePaymentLinkResponse.builder()
                .orderCode(123456789L)
                .bin("970422")
                .accountNumber("0987654321")
                .accountName("NEXSPACE TECHNOLOGIES")
                .amount(255000L)
                .description("NX500 1234")
                .currency("VND")
                .paymentLinkId("mock-link-id")
                .status(vn.payos.model.v2.paymentRequests.PaymentLinkStatus.PENDING)
                .qrCode("00020101021238540010A000000727012600069704220110098765432152046011530370454062550005802VN62140810NX500 12346304ABCD")
                .checkoutUrl("https://pay.payos.vn/web/mock-link")
                .build();

        when(paymentRequestsService.create(any(CreatePaymentLinkRequest.class))).thenReturn(mockPayosResponse);

        PaymentCheckoutResponseDTO result = paymentService.createPaymentForBooking(500L, 100L);

        assertThat(result).isNotNull();
        assertThat(result.getBookingId()).isEqualTo(500L);
        assertThat(result.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(255000));
        assertThat(result.getCurrency()).isEqualTo("VND");
        assertThat(result.getBankBin()).isEqualTo("970422");
        assertThat(result.getBankName()).contains("MBBank");
        assertThat(result.getAccountNumber()).isEqualTo("0987654321");
        assertThat(result.getAccountName()).isEqualTo("NEXSPACE TECHNOLOGIES");
        assertThat(result.getQrCode()).startsWith("000201010212");

        ArgumentCaptor<PaymentTransactionModel> txCaptor = ArgumentCaptor.forClass(PaymentTransactionModel.class);
        verify(paymentTransactionRepository).save(txCaptor.capture());
        PaymentTransactionModel savedTx = txCaptor.getValue();
        assertThat(savedTx.getBooking()).isEqualTo(booking);
        assertThat(savedTx.getStatus()).isEqualTo(PaymentStatus.PENDING);
        assertThat(savedTx.getAmount()).isEqualByComparingTo(BigDecimal.valueOf(255000));
    }

    @Test
    @DisplayName("createPaymentForBooking throws NotFoundException when booking does not exist")
    void createPaymentForBooking_notFound() {
        when(bookingRepository.findById(999L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> paymentService.createPaymentForBooking(999L, 100L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Đơn đặt chỗ không tồn tại");
    }

    @Test
    @DisplayName("createPaymentForBooking throws NotFoundException when actor does not own booking (Strict Ownership Defense)")
    void createPaymentForBooking_ownershipDefense() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        // Different actor (999L vs owner 100L)
        assertThatThrownBy(() -> paymentService.createPaymentForBooking(500L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Đơn đặt chỗ không tồn tại");
    }

    @Test
    @DisplayName("createPaymentForBooking throws ConflictException when booking is not in PENDING_PAYMENT")
    void createPaymentForBooking_invalidStatus() {
        booking.setStatus(BookingStatus.CONFIRMED);
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> paymentService.createPaymentForBooking(500L, 100L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("không thể tạo phiên thanh toán");
    }

    @Test
    @DisplayName("createPaymentForBooking throws ConflictException when hold expired")
    void createPaymentForBooking_holdExpired() {
        booking.setHoldExpiresAt(LocalDateTime.now().minusMinutes(5));
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> paymentService.createPaymentForBooking(500L, 100L))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã hết thời hạn giữ chỗ");
    }

    @Test
    @DisplayName("getPaymentStatus returns current status and check-in PIN when confirmed")
    void getPaymentStatus_success() {
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setQrTokenHash("hash-qr-12345");
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        PaymentTransactionModel tx = new PaymentTransactionModel();
        tx.setOrderCode(123456789L);
        tx.setStatus(PaymentStatus.SUCCESS);
        tx.setPaidAt(LocalDateTime.now());
        when(paymentTransactionRepository.findTopByBookingIdOrderByCreatedAtDesc(500L)).thenReturn(Optional.of(tx));

        PaymentStatusResponseDTO statusDto = paymentService.getPaymentStatus(500L, 100L);

        assertThat(statusDto.getBookingId()).isEqualTo(500L);
        assertThat(statusDto.getBookingStatus()).isEqualTo(BookingStatus.CONFIRMED);
        assertThat(statusDto.getPaymentStatus()).isEqualTo(PaymentStatus.SUCCESS);
        assertThat(statusDto.getQrTokenHash()).isEqualTo("hash-qr-12345");
        assertThat(statusDto.getPinCode()).isNotBlank();
    }

    @Test
    @DisplayName("cancelPayment marks transaction CANCELLED and cancels PayOS link")
    void cancelPayment_success() {
        PaymentTransactionModel tx = new PaymentTransactionModel();
        tx.setOrderCode(8888L);
        tx.setStatus(PaymentStatus.PENDING);
        tx.setBooking(booking);

        when(paymentTransactionRepository.findByOrderCodeForUpdate(8888L)).thenReturn(Optional.of(tx));
        when(payOS.paymentRequests()).thenReturn(paymentRequestsService);

        paymentService.cancelPayment(8888L, 100L, "User cancelled");

        assertThat(tx.getStatus()).isEqualTo(PaymentStatus.CANCELLED);
        assertThat(booking.getStatus()).isEqualTo(BookingStatus.CANCELLED);
        verify(paymentRequestsService).cancel(eq(8888L), anyString());
    }
}
