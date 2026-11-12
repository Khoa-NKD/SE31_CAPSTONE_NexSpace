package base.api.feature.payment.service.impl;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.payment.dto.response.InvoiceResponseDTO;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceImplTest {

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private IPaymentTransactionRepository paymentTransactionRepository;

    private InvoiceServiceImpl invoiceService;

    private UserModel customer;
    private WorkspaceModel workspace;
    private BookableResourceModel resource;
    private BookingModel booking;
    private PaymentTransactionModel transaction;

    @BeforeEach
    void setUp() {
        invoiceService = new InvoiceServiceImpl(bookingRepository, paymentTransactionRepository);
        ReflectionTestUtils.setField(invoiceService, "invoiceRootFolder", "nexspace/invoices");

        customer = new UserModel();
        customer.setId(100L);
        customer.setFirstName("Van A");
        customer.setLastName("Nguyen");
        customer.setEmail("vana@nexspace.vn");
        customer.setPhone("0901234567");

        workspace = new WorkspaceModel();
        workspace.setId(10L);
        workspace.setName("NexSpace Central");
        workspace.setAddress("123 Le Loi, Q1, HCMC");

        resource = new BookableResourceModel();
        resource.setId(50L);
        resource.setName("Hot Desk Deluxe #5");

        booking = new BookingModel();
        booking.setId(500L);
        booking.setBookingCode("NX-500-ABC");
        booking.setCustomer(customer);
        booking.setWorkspace(workspace);
        booking.setResource(resource);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setPartySize(2);
        booking.setFinalPrice(BigDecimal.valueOf(250000));
        booking.setStartTime(LocalDateTime.of(2026, 11, 15, 9, 0));
        booking.setEndTime(LocalDateTime.of(2026, 11, 15, 17, 0));
        booking.setQrTokenHash("NXQR-HASH-500");
        booking.setCreatedAt(LocalDateTime.of(2026, 11, 11, 10, 0));

        transaction = new PaymentTransactionModel();
        transaction.setId(1L);
        transaction.setOrderCode(123456789L);
        transaction.setBooking(booking);
        transaction.setAmount(BigDecimal.valueOf(250000));
        transaction.setReceivedAmount(BigDecimal.valueOf(250000));
        transaction.setStatus(PaymentStatus.SUCCESS);
        transaction.setGatewayTransactionId("MB99887766");
        transaction.setCreatedAt(LocalDateTime.of(2026, 11, 11, 10, 5));
    }

    @Test
    @DisplayName("generateInvoicePdf produces valid PDF bytes for confirmed booking")
    void generateInvoicePdf_success() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findTopByBookingIdOrderByCreatedAtDesc(500L)).thenReturn(Optional.of(transaction));

        byte[] pdfBytes = invoiceService.generateInvoicePdf(500L, 100L);

        assertThat(pdfBytes).isNotNull();
        assertThat(pdfBytes.length).isGreaterThan(100);
        // PDF magic header %PDF
        String header = new String(pdfBytes, 0, 4);
        assertThat(header).isEqualTo("%PDF");
    }

    @Test
    @DisplayName("generateInvoicePdf throws NotFoundException when booking not found or ownership mismatch")
    void generateInvoicePdf_unauthorizedOrNotFound() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        // Actor 999 is neither customer nor admin
        assertThatThrownBy(() -> invoiceService.generateInvoicePdf(500L, 999L))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Đơn đặt chỗ không tồn tại với ID: 500");
    }

    @Test
    @DisplayName("generateInvoicePdf throws BadRequestException when booking is PENDING_PAYMENT")
    void generateInvoicePdf_pendingPayment() {
        booking.setStatus(BookingStatus.PENDING_PAYMENT);
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));

        assertThatThrownBy(() -> invoiceService.generateInvoicePdf(500L, 100L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Đơn đặt chỗ chưa được thanh toán thành công, không thể xuất hóa đơn");
    }

    @Test
    @DisplayName("getOrCreateInvoice returns invoice DTO with proper details")
    void getOrCreateInvoice_success() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(booking));
        when(paymentTransactionRepository.findTopByBookingIdOrderByCreatedAtDesc(500L)).thenReturn(Optional.of(transaction));

        InvoiceResponseDTO result = invoiceService.getOrCreateInvoice(500L, 100L);

        assertThat(result).isNotNull();
        assertThat(result.getBookingId()).isEqualTo(500L);
        assertThat(result.getBookingCode()).isEqualTo("NX-500-ABC");
        assertThat(result.getTotalAmount()).isEqualByComparingTo(BigDecimal.valueOf(250000));
        assertThat(result.getStatus()).isEqualTo("CONFIRMED");
        assertThat(result.getInvoiceUrl()).isNotBlank();
    }
}
