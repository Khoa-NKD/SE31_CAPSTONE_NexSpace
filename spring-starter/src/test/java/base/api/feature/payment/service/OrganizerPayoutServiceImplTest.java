package base.api.feature.payment.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.notification.repository.IUserNotificationRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.organizer.service.OrganizerBankAccountCipher;
import base.api.feature.payment.dto.payout.ManualWithdrawalRequestDto;
import base.api.feature.payment.dto.payout.OrganizerPayoutBalanceDto;
import base.api.feature.payment.dto.payout.OrganizerPayoutSettingDto;
import base.api.feature.payment.dto.payout.OrganizerWithdrawalBatchDto;
import base.api.feature.payment.dto.payout.RequestAutoPayoutDto;
import base.api.feature.payment.repository.IOrganizerPayoutRepository;
import base.api.feature.payment.repository.IOrganizerPayoutSettingRepository;
import base.api.feature.payment.repository.IOrganizerWithdrawalBatchRepository;
import base.api.feature.payment.service.impl.OrganizerPayoutServiceImpl;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.entity.payment.OrganizerPayoutModel;
import base.api.shared.entity.payment.OrganizerPayoutSettingModel;
import base.api.shared.entity.payment.OrganizerWithdrawalBatchModel;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.PayoutApprovalStatus;
import base.api.shared.enums.PayoutMode;
import base.api.shared.enums.PayoutStatus;
import base.api.shared.enums.WithdrawalBatchStatus;
import base.api.shared.enums.WithdrawalType;
import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import vn.payos.PayOS;
import vn.payos.model.v1.payouts.Payout;
import vn.payos.model.v1.payouts.PayoutRequests;
import vn.payos.service.blocking.v1.payouts.PayoutsService;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;

class OrganizerPayoutServiceImplTest {

    private IOrganizerPayoutRepository payoutRepository;
    private IOrganizerPayoutSettingRepository payoutSettingRepository;
    private IOrganizerWithdrawalBatchRepository withdrawalBatchRepository;
    private IOrganizerProfileRepository organizerProfileRepository;
    private IUserRepository userRepository;
    private IBookingRepository bookingRepository;
    private OrganizerBankAccountCipher bankCipher;
    private PayOS payOS;
    private PayoutsService payoutsService;
    private IAuditService auditService;
    private IUserNotificationRepository userNotificationRepository;

    private OrganizerPayoutServiceImpl service;

    private UserModel organizer;
    private OrganizerProfileModel profile;

    @BeforeEach
    void setUp() {
        payoutRepository = mock(IOrganizerPayoutRepository.class);
        payoutSettingRepository = mock(IOrganizerPayoutSettingRepository.class);
        withdrawalBatchRepository = mock(IOrganizerWithdrawalBatchRepository.class);
        organizerProfileRepository = mock(IOrganizerProfileRepository.class);
        userRepository = mock(IUserRepository.class);
        bookingRepository = mock(IBookingRepository.class);
        bankCipher = mock(OrganizerBankAccountCipher.class);
        payOS = mock(PayOS.class);
        payoutsService = mock(PayoutsService.class);
        auditService = mock(IAuditService.class);
        userNotificationRepository = mock(IUserNotificationRepository.class);

        when(payOS.payouts()).thenReturn(payoutsService);

        service = new OrganizerPayoutServiceImpl(
                payoutRepository,
                payoutSettingRepository,
                withdrawalBatchRepository,
                organizerProfileRepository,
                userRepository,
                bookingRepository,
                bankCipher,
                payOS,
                auditService,
                userNotificationRepository
        );

        organizer = new UserModel();
        organizer.setId(10L);
        organizer.setEmail("organizer@nexspace.vn");

        profile = new OrganizerProfileModel();
        profile.setId(100L);
        profile.setOrganizer(organizer);
        profile.setStatus(OrganizerProfileStatus.APPROVED);
        profile.setBankName("MBBank");
        profile.setBankBin("970422");
        profile.setBankAccountNumber("bank:v1:encryptedAccount");
        profile.setBankAccountHolder("NGUYEN VAN A");
    }

    @Test
    @DisplayName("getBalance: Phân tách rõ ràng Tổng doanh thu, Đang tạm giữ HELD và Khả dụng có thể rút")
    void testGetBalance_SegregatesHeldAndWithdrawable() {
        when(organizerProfileRepository.findByOrganizerId(10L)).thenReturn(Optional.of(profile));
        when(bankCipher.lastFour(100L, profile.getBankAccountNumber())).thenReturn("6789");
        when(withdrawalBatchRepository.findByOrganizerIdAndStatus(eq(10L), eq(WithdrawalBatchStatus.PAID), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of()));

        // Setup payouts: 1 HELD (200,000), 1 RELEASED without batch (300,000), 1 PAID (500,000)
        OrganizerPayoutModel held = new OrganizerPayoutModel();
        held.setStatus(PayoutStatus.HELD);
        held.setPayoutAmount(new BigDecimal("200000.00"));

        OrganizerPayoutModel released = new OrganizerPayoutModel();
        released.setStatus(PayoutStatus.RELEASED);
        released.setPayoutAmount(new BigDecimal("300000.00"));

        OrganizerPayoutModel paid = new OrganizerPayoutModel();
        paid.setStatus(PayoutStatus.PAID);
        paid.setPayoutAmount(new BigDecimal("500000.00"));
        paid.setWithdrawalBatch(new OrganizerWithdrawalBatchModel());

        when(payoutRepository.findByOrganizerId(10L)).thenReturn(List.of(held, released, paid));
        when(payoutRepository.findByOrganizerIdAndStatus(10L, PayoutStatus.HELD)).thenReturn(List.of(held));
        when(bookingRepository.findConfirmedBookingsByOrganizerId(eq(10L), any())).thenReturn(List.of());

        OrganizerPayoutBalanceDto balance = service.getBalance(10L);

        assertThat(balance.getGrossRevenue()).isEqualByComparingTo("1000000.00");
        assertThat(balance.getHeldBalance()).isEqualByComparingTo("200000.00");
        assertThat(balance.getWithdrawableBalance()).isEqualByComparingTo("300000.00");
        assertThat(balance.isCanWithdraw()).isTrue();
        assertThat(balance.getBankAccountNumberMasked()).isEqualTo("•••• 6789");
        assertThat(balance.getBankName()).isEqualTo("MBBank");
    }

    @Test
    @DisplayName("withdrawManual: Ném lỗi nếu số tiền yêu cầu vượt quá số dư khả dụng")
    void testWithdrawManual_ExceedsAvailable_ThrowsBadRequest() {
        when(userRepository.findById(10L)).thenReturn(Optional.of(organizer));
        when(organizerProfileRepository.findByOrganizerId(10L)).thenReturn(Optional.of(profile));

        OrganizerPayoutModel released = new OrganizerPayoutModel();
        released.setStatus(PayoutStatus.RELEASED);
        released.setPayoutAmount(new BigDecimal("100000.00"));

        when(payoutRepository.findByOrganizerIdAndStatusAndWithdrawalBatchIsNull(10L, PayoutStatus.RELEASED))
                .thenReturn(List.of(released));

        ManualWithdrawalRequestDto req = new ManualWithdrawalRequestDto();
        req.setAmount(new BigDecimal("150000.00"));

        assertThatThrownBy(() -> service.withdrawManual(10L, req))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("vượt quá số dư khả dụng");
    }

    @Test
    @DisplayName("withdrawManual: Thành công gom các payout và gọi PayOS Payouts")
    void testWithdrawManual_Success() throws Exception {
        when(userRepository.findById(10L)).thenReturn(Optional.of(organizer));
        when(organizerProfileRepository.findByOrganizerId(10L)).thenReturn(Optional.of(profile));
        when(bankCipher.decrypt(100L, profile.getBankAccountNumber())).thenReturn("0987654321");

        OrganizerPayoutModel p1 = new OrganizerPayoutModel();
        p1.setId(1L);
        p1.setStatus(PayoutStatus.RELEASED);
        p1.setPayoutAmount(new BigDecimal("100000.00"));

        OrganizerPayoutModel p2 = new OrganizerPayoutModel();
        p2.setId(2L);
        p2.setStatus(PayoutStatus.RELEASED);
        p2.setPayoutAmount(new BigDecimal("200000.00"));

        when(payoutRepository.findByOrganizerIdAndStatusAndWithdrawalBatchIsNull(10L, PayoutStatus.RELEASED))
                .thenReturn(List.of(p1, p2));

        when(withdrawalBatchRepository.save(any())).thenAnswer(invocation -> {
            OrganizerWithdrawalBatchModel model = invocation.getArgument(0);
            if (model.getId() == null) model.setId(88L);
            return model;
        });

        org.springframework.test.util.ReflectionTestUtils.setField(service, "clientId", "live-client-id");

        Payout mockPayosResp = new Payout();
        mockPayosResp.setId("PAYOS_TX_999");
        mockPayosResp.setReferenceId("REF-88");
        when(payoutsService.create(any(PayoutRequests.class))).thenReturn(mockPayosResp);

        ManualWithdrawalRequestDto req = new ManualWithdrawalRequestDto();
        req.setAmount(new BigDecimal("150000.00"));

        OrganizerWithdrawalBatchDto batch = service.withdrawManual(10L, req);

        assertThat(batch).isNotNull();
        assertThat(batch.getStatus()).isEqualTo(WithdrawalBatchStatus.PAID);
        assertThat(batch.getPayoutType()).isEqualTo(WithdrawalType.MANUAL);

        verify(payoutsService, times(1)).create(any(PayoutRequests.class));
        verify(auditService, times(1)).log(eq(organizer), eq("PAYOUT"), eq("WITHDRAWAL_SUCCESS"), any(), any(), any());
    }

    @Test
    @DisplayName("requestAutoPayout: Gửi yêu cầu chuyển sang AUTO_DAILY thành công")
    void testRequestAutoPayout_Success() {
        when(organizerProfileRepository.findByOrganizerId(10L)).thenReturn(Optional.of(profile));

        OrganizerPayoutSettingModel setting = new OrganizerPayoutSettingModel();
        setting.setId(5L);
        setting.setOrganizer(organizer);
        setting.setPayoutMode(PayoutMode.MANUAL);
        setting.setApprovalStatus(PayoutApprovalStatus.NONE);

        when(payoutSettingRepository.findByOrganizerId(10L)).thenReturn(Optional.of(setting));
        when(payoutSettingRepository.save(any())).thenAnswer(invocation -> invocation.getArgument(0));

        RequestAutoPayoutDto req = new RequestAutoPayoutDto();
        req.setAutoPayoutHour(14);
        req.setRequestNote("Muốn nhận tiền tự động vào 14h mỗi ngày");

        OrganizerPayoutSettingDto result = service.requestAutoPayout(10L, req);

        assertThat(result.getApprovalStatus()).isEqualTo(PayoutApprovalStatus.PENDING_ENABLE);
        assertThat(result.getPendingAutoPayoutHour()).isEqualTo(14);
        assertThat(result.getRequestNote()).isEqualTo("Muốn nhận tiền tự động vào 14h mỗi ngày");
    }

    @Test
    @DisplayName("releaseEligibleHeldPayouts: Chuyển các khoản HELD quá hạn không khiếu nại sang RELEASED")
    void testReleaseEligibleHeldPayouts() {
        OrganizerPayoutModel p1 = new OrganizerPayoutModel();
        p1.setStatus(PayoutStatus.HELD);
        p1.setEligibleAt(LocalDateTime.now().minusHours(2));

        when(payoutRepository.findByStatusAndEligibleAtBefore(eq(PayoutStatus.HELD), any()))
                .thenReturn(List.of(p1));

        service.releaseEligibleHeldPayouts();

        assertThat(p1.getStatus()).isEqualTo(PayoutStatus.RELEASED);
        verify(payoutRepository, times(1)).saveAll(any());
    }
}
