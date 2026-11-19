package base.api.feature.payment.service;

import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.payment.dto.refund.ApproveRefundRequestDto;
import base.api.feature.payment.dto.refund.RefundKpisDto;
import base.api.feature.payment.dto.refund.RefundRequestResponseDto;
import base.api.feature.payment.dto.refund.RejectRefundRequestDto;
import base.api.feature.payment.dto.refund.UpdateRefundBankInfoDto;
import base.api.feature.payment.repository.IRefundRequestRepository;
import base.api.feature.payment.service.impl.RefundServiceImpl;
import base.api.feature.auth.repository.IUserRepository;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.payment.PaymentTransactionModel;
import base.api.shared.entity.payment.RefundRequestModel;
import base.api.shared.entity.resource.BookableResourceModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.RefundSource;
import base.api.shared.enums.RefundStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.test.util.ReflectionTestUtils;
import vn.payos.PayOS;
import vn.payos.model.v1.payouts.Payout;
import vn.payos.model.v1.payouts.PayoutRequests;
import vn.payos.service.blocking.v1.payouts.PayoutsService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RefundServiceTest {

    @Mock
    private IRefundRequestRepository refundRequestRepository;

    @Mock
    private IUserRepository userRepository;

    @Mock
    private IBookingRepository bookingRepository;

    @Mock
    private PayOS payOS;

    @Mock
    private PayoutsService payoutsService;

    @Mock
    private IAuditService auditService;

    @InjectMocks
    private RefundServiceImpl refundService;

    private UserModel mockAdmin;
    private UserModel mockCustomer;
    private WorkspaceModel mockWorkspace;
    private BookableResourceModel mockResource;
    private BookingModel mockBooking;
    private PaymentTransactionModel mockTx;
    private RefundRequestModel mockRefund;

    @BeforeEach
    void setUp() {
        mockAdmin = new UserModel();
        mockAdmin.setId(1L);
        mockAdmin.setFirstName("Admin");
        mockAdmin.setLastName("User");
        mockAdmin.setEmail("admin@nexspace.vn");

        mockCustomer = new UserModel();
        mockCustomer.setId(10L);
        mockCustomer.setFirstName("Nguyen Van");
        mockCustomer.setLastName("A");
        mockCustomer.setEmail("nguyenvana@gmail.com");

        mockWorkspace = new WorkspaceModel();
        mockWorkspace.setId(100L);
        mockWorkspace.setName("Enouvo Space");

        mockResource = new BookableResourceModel();
        mockResource.setId(200L);
        mockResource.setName("Bàn làm việc số 1");

        mockBooking = new BookingModel();
        mockBooking.setId(500L);
        mockBooking.setBookingCode("BK-20261119-01");
        mockBooking.setCustomer(mockCustomer);
        mockBooking.setWorkspace(mockWorkspace);
        mockBooking.setResource(mockResource);

        mockTx = new PaymentTransactionModel();
        mockTx.setId(600L);
        mockTx.setAmount(BigDecimal.valueOf(100000));
        mockTx.setReceivedAmount(BigDecimal.valueOf(100000));

        mockRefund = new RefundRequestModel();
        mockRefund.setId(800L);
        mockRefund.setBooking(mockBooking);
        mockRefund.setPaymentTransaction(mockTx);
        mockRefund.setRequestedBy(mockCustomer);
        mockRefund.setSource(RefundSource.CUSTOMER_CANCEL);
        mockRefund.setReason("Khách hủy đặt chỗ theo chính sách");
        mockRefund.setRequestedAmount(BigDecimal.valueOf(100000));
        mockRefund.setStatus(RefundStatus.PENDING);
        mockRefund.setBankName("MBBank");
        mockRefund.setBankBin("970422");
        mockRefund.setBankAccountNumber("0123456789");
        mockRefund.setBankAccountName("NGUYEN VAN A");
        mockRefund.setCreatedAt(LocalDateTime.now());
    }

    @Test
    @DisplayName("getAdminRefunds - Trả về danh sách yêu cầu hoàn tiền phân trang thành công")
    void getAdminRefunds_Success() {
        Page<RefundRequestModel> page = new PageImpl<>(List.of(mockRefund));
        when(refundRequestRepository.searchAdminRefunds(eq(RefundStatus.PENDING), isNull(), any(), any(Pageable.class)))
                .thenReturn(page);

        PageRequestDTO request = new PageRequestDTO();
        request.setPage(1);
        request.setSize(10);

        PageResponseDTO<RefundRequestResponseDto> response = refundService.getAdminRefunds(RefundStatus.PENDING, null, null, request);

        assertThat(response).isNotNull();
        assertThat(response.getContent()).hasSize(1);
        assertThat(response.getContent().get(0).getId()).isEqualTo(800L);
        assertThat(response.getContent().get(0).getCustomerName()).isEqualTo("Nguyen Van A");
        assertThat(response.getContent().get(0).getBankName()).isEqualTo("MBBank");
        assertThat(response.getContent().get(0).getBankAccountNumber()).isEqualTo("0123456789");
    }

    @Test
    @DisplayName("getAdminRefundKpis - Tính toán chính xác KPI số lượng và số tiền các trạng thái")
    void getAdminRefundKpis_Success() {
        when(refundRequestRepository.countByStatus(RefundStatus.PENDING)).thenReturn(5L);
        when(refundRequestRepository.sumRequestedAmountByStatus(RefundStatus.PENDING)).thenReturn(BigDecimal.valueOf(500000));
        when(refundRequestRepository.countByStatus(RefundStatus.PROCESSED)).thenReturn(10L);
        when(refundRequestRepository.sumApprovedAmountByStatus(RefundStatus.PROCESSED)).thenReturn(BigDecimal.valueOf(1200000));
        when(refundRequestRepository.countByStatus(RefundStatus.REJECTED)).thenReturn(2L);
        when(refundRequestRepository.sumRequestedAmountByStatus(RefundStatus.REJECTED)).thenReturn(BigDecimal.valueOf(200000));

        RefundKpisDto kpis = refundService.getAdminRefundKpis();

        assertThat(kpis.getPendingCount()).isEqualTo(5L);
        assertThat(kpis.getPendingVolume()).isEqualByComparingTo(BigDecimal.valueOf(500000));
        assertThat(kpis.getProcessedCount()).isEqualTo(10L);
        assertThat(kpis.getProcessedVolume()).isEqualByComparingTo(BigDecimal.valueOf(1200000));
        assertThat(kpis.getRejectedCount()).isEqualTo(2L);
        assertThat(kpis.getRejectedVolume()).isEqualByComparingTo(BigDecimal.valueOf(200000));
    }

    @Test
    @DisplayName("approveRefund - Phê duyệt và gọi PayOS Payouts thành công")
    void approveRefund_SuccessWithPayOS() {
        ReflectionTestUtils.setField(refundService, "clientId", "live-client-id");
        when(refundRequestRepository.findByIdForUpdate(800L)).thenReturn(Optional.of(mockRefund));
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockAdmin));
        when(payOS.payouts()).thenReturn(payoutsService);

        Payout mockPayout = new Payout();
        mockPayout.setId("PAYOUT_123456");
        mockPayout.setReferenceId("RF800_REF");
        when(payoutsService.create(any(PayoutRequests.class))).thenReturn(mockPayout);
        when(refundRequestRepository.save(any(RefundRequestModel.class))).thenAnswer(i -> i.getArgument(0));

        ApproveRefundRequestDto dto = ApproveRefundRequestDto.builder()
                .approvedAmount(BigDecimal.valueOf(100000))
                .adminNote("Duyệt hoàn toàn bộ tiền cho khách")
                .build();

        RefundRequestResponseDto response = refundService.approveRefund(1L, 800L, dto);

        assertThat(response.getStatus()).isEqualTo(RefundStatus.PROCESSED);
        assertThat(response.getRefundReference()).isEqualTo("PAYOUT_123456");
        assertThat(response.getApprovedAmount()).isEqualByComparingTo(BigDecimal.valueOf(100000));
        assertThat(response.getAdminNote()).isEqualTo("Duyệt hoàn toàn bộ tiền cho khách");
        verify(auditService).log(eq(mockAdmin), eq("REFUND"), eq("APPROVE"), eq("RefundRequest"), eq(800L), any());
    }

    @Test
    @DisplayName("approveRefund - Báo lỗi ConflictException nếu yêu cầu không ở trạng thái PENDING")
    void approveRefund_ThrowsConflict_WhenNotPending() {
        mockRefund.setStatus(RefundStatus.PROCESSED);
        when(refundRequestRepository.findByIdForUpdate(800L)).thenReturn(Optional.of(mockRefund));

        ApproveRefundRequestDto dto = ApproveRefundRequestDto.builder().build();

        assertThatThrownBy(() -> refundService.approveRefund(1L, 800L, dto))
                .isInstanceOf(ConflictException.class)
                .hasMessageContaining("đã được xử lý");
    }

    @Test
    @DisplayName("approveRefund - Báo lỗi BadRequestException nếu thiếu thông tin số tài khoản hoặc mã BIN ngân hàng")
    void approveRefund_ThrowsBadRequest_WhenMissingBankInfo() {
        mockRefund.setBankAccountNumber(null);
        when(refundRequestRepository.findByIdForUpdate(800L)).thenReturn(Optional.of(mockRefund));

        ApproveRefundRequestDto dto = ApproveRefundRequestDto.builder().build();

        assertThatThrownBy(() -> refundService.approveRefund(1L, 800L, dto))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Chưa có thông tin số tài khoản và mã BIN");
    }

    @Test
    @DisplayName("rejectRefund - Từ chối yêu cầu hoàn tiền thành công")
    void rejectRefund_Success() {
        when(refundRequestRepository.findByIdForUpdate(800L)).thenReturn(Optional.of(mockRefund));
        when(userRepository.findById(1L)).thenReturn(Optional.of(mockAdmin));
        when(refundRequestRepository.save(any(RefundRequestModel.class))).thenAnswer(i -> i.getArgument(0));

        RejectRefundRequestDto dto = RejectRefundRequestDto.builder()
                .reason("Không đủ điều kiện hoàn tiền do đơn đã check-in")
                .build();

        RefundRequestResponseDto response = refundService.rejectRefund(1L, 800L, dto);

        assertThat(response.getStatus()).isEqualTo(RefundStatus.REJECTED);
        assertThat(response.getAdminNote()).isEqualTo("Không đủ điều kiện hoàn tiền do đơn đã check-in");
        verify(auditService).log(eq(mockAdmin), eq("REFUND"), eq("REJECT"), eq("RefundRequest"), eq(800L), eq("Không đủ điều kiện hoàn tiền do đơn đã check-in"));
    }

    @Test
    @DisplayName("updateBookingRefundBankInfo - Cập nhật thông tin ngân hàng thành công khi còn PENDING")
    void updateBookingRefundBankInfo_Success() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(mockBooking));
        when(refundRequestRepository.findByBookingId(500L)).thenReturn(List.of(mockRefund));
        when(refundRequestRepository.save(any(RefundRequestModel.class))).thenAnswer(i -> i.getArgument(0));

        UpdateRefundBankInfoDto dto = UpdateRefundBankInfoDto.builder()
                .bankName("Vietcombank")
                .bankBin("970436")
                .bankAccountNumber("0071001234567")
                .bankAccountName("nguyen van a")
                .build();

        RefundRequestResponseDto response = refundService.updateBookingRefundBankInfo(10L, 500L, dto);

        assertThat(response.getBankName()).isEqualTo("Vietcombank");
        assertThat(response.getBankBin()).isEqualTo("970436");
        assertThat(response.getBankAccountNumber()).isEqualTo("0071001234567");
        assertThat(response.getBankAccountName()).isEqualTo("NGUYEN VAN A");
    }

    @Test
    @DisplayName("updateBookingRefundBankInfo - Báo lỗi NotFoundException nếu không phải chính chủ đơn đặt chỗ")
    void updateBookingRefundBankInfo_ThrowsNotFound_WhenNotOwner() {
        when(bookingRepository.findById(500L)).thenReturn(Optional.of(mockBooking));

        UpdateRefundBankInfoDto dto = UpdateRefundBankInfoDto.builder()
                .bankName("Vietcombank")
                .bankBin("970436")
                .bankAccountNumber("0071001234567")
                .bankAccountName("NGUYEN VAN A")
                .build();

        assertThatThrownBy(() -> refundService.updateBookingRefundBankInfo(999L, 500L, dto))
                .isInstanceOf(NotFoundException.class)
                .hasMessageContaining("Không tìm thấy đơn đặt chỗ");
    }
}
