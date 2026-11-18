package base.api.feature.analytics.service.impl;

import base.api.feature.analytics.dto.response.AdminDashboardOverviewResponseDTO;
import base.api.feature.analytics.dto.response.AdminPlatformAnalyticsResponseDTO;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.booking.repository.IBookingRepository;
import base.api.feature.governance.repository.IAuditLogRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.payment.repository.IPaymentTransactionRepository;
import base.api.feature.resource.repository.IBookableResourceRepository;
import base.api.feature.review.repository.ICustomerReviewRepository;
import base.api.feature.workspace.repository.IMediaRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.governance.AuditLogModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.PaymentStatus;
import base.api.shared.enums.ReconciliationStatus;
import base.api.shared.enums.UserStatus;
import base.api.shared.enums.WorkspaceStatus;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AdminAnalyticsServiceImplTest {

    @Mock
    private IUserRepository userRepository;
    @Mock
    private IOrganizerProfileRepository organizerProfileRepository;
    @Mock
    private IWorkspaceRepository workspaceRepository;
    @Mock
    private IBookingRepository bookingRepository;
    @Mock
    private IPaymentTransactionRepository paymentTransactionRepository;
    @Mock
    private IAuditLogRepository auditLogRepository;
    @Mock
    private IMediaRepository mediaRepository;
    @Mock
    private ICustomerReviewRepository customerReviewRepository;
    @Mock
    private IBookableResourceRepository bookableResourceRepository;

    @InjectMocks
    private AdminAnalyticsServiceImpl adminAnalyticsService;

    @Test
    @DisplayName("getDashboardOverview should aggregate real counts, GMV and triage items correctly")
    void testGetDashboardOverview() {
        when(userRepository.count()).thenReturn(100L);
        when(userRepository.countByCreatedAtAfter(any())).thenReturn(12L);
        when(userRepository.countByRoleNameAndStatus(eq("ORGANIZER"), eq(UserStatus.ACTIVE))).thenReturn(15L);
        when(organizerProfileRepository.countByStatus(OrganizerProfileStatus.PENDING_REVIEW)).thenReturn(3L);
        when(workspaceRepository.count()).thenReturn(20L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.ACTIVE)).thenReturn(18L);
        when(workspaceRepository.countByStatus(WorkspaceStatus.PENDING)).thenReturn(2L);
        when(bookingRepository.countByCreatedAtAfter(any())).thenReturn(45L);
        when(bookingRepository.countByStatusInAndCreatedAtAfter(any(), any())).thenReturn(40L);
        when(paymentTransactionRepository.sumAmountByStatusAndCreatedAtAfter(eq(PaymentStatus.SUCCESS), any()))
                .thenReturn(BigDecimal.valueOf(15000000L));
        when(bookingRepository.sumPlatformFeeByStatusInAndCreatedAtAfter(any(), any()))
                .thenReturn(BigDecimal.valueOf(1500000L));
        when(paymentTransactionRepository.countByReconciliationStatus(ReconciliationStatus.UNRECONCILED)).thenReturn(5L);

        when(bookingRepository.findByCreatedAtAfterOrderByCreatedAtAsc(any())).thenReturn(Collections.emptyList());
        when(paymentTransactionRepository.findByStatusAndCreatedAtAfterOrderByCreatedAtAsc(any(), any()))
                .thenReturn(Collections.emptyList());

        AuditLogModel alertLog = new AuditLogModel();
        alertLog.setId(1L);
        alertLog.setAction("ORGANIZER_APPROVED");
        alertLog.setModule("ORGANIZER");
        alertLog.setReason("Duyệt đối tác đối chứng giấy phép kinh doanh hợp lệ");
        alertLog.setCreatedAt(LocalDateTime.now());
        when(auditLogRepository.findTop10ByOrderByIdDesc()).thenReturn(List.of(alertLog));

        AdminDashboardOverviewResponseDTO response = adminAnalyticsService.getDashboardOverview("7d");

        assertThat(response).isNotNull();
        assertThat(response.getKpis()).hasSize(5);
        assertThat(response.getTriageItems()).hasSize(3);
        assertThat(response.getTrendPoints()).isNotEmpty();
        assertThat(response.getAlerts()).hasSize(1);
        assertThat(response.getAlerts().get(0).getTitle()).isEqualTo("Đối tác được phê duyệt");
    }

    @Test
    @DisplayName("getPlatformAnalytics should return macro metrics, charts and leaderboard correctly")
    void testGetPlatformAnalytics() {
        when(paymentTransactionRepository.sumAmountByStatusAndCreatedAtAfter(eq(PaymentStatus.SUCCESS), any()))
                .thenReturn(BigDecimal.valueOf(50000000L));
        when(paymentTransactionRepository.sumTotalAmountByStatus(PaymentStatus.SUCCESS))
                .thenReturn(BigDecimal.valueOf(100000000L));
        when(bookingRepository.count()).thenReturn(60L);
        when(bookingRepository.sumPlatformFeeByStatusInAndCreatedAtAfter(any(), any()))
                .thenReturn(BigDecimal.valueOf(5000000L));
        when(workspaceRepository.countByStatus(WorkspaceStatus.ACTIVE)).thenReturn(10L);

        WorkspaceModel ws = new WorkspaceModel();
        ws.setId(10L);
        ws.setName("Enouvo Space 1");
        ws.setAddress("15 An Nhon 3");
        ws.setCity("Đà Nẵng");
        ws.setDistrict("Sơn Trà");
        ws.setStatus(WorkspaceStatus.ACTIVE);

        when(workspaceRepository.findByStatus(WorkspaceStatus.ACTIVE)).thenReturn(List.of(ws));
        when(bookingRepository.findTopWorkspacesByRevenue(any())).thenReturn(Collections.emptyList());
        when(mediaRepository.findFirstByWorkspaceIdAndCoverTrue(10L)).thenReturn(Optional.empty());

        AdminPlatformAnalyticsResponseDTO response = adminAnalyticsService.getPlatformAnalytics("30d");

        assertThat(response).isNotNull();
        assertThat(response.getGrossRevenueVnd()).isEqualTo(100000000L);
        assertThat(response.getMacroTrends()).isNotEmpty();
        assertThat(response.getResourceBreakdown()).isNotEmpty();
        assertThat(response.getLeaderboard()).hasSize(1);
        assertThat(response.getLeaderboard().get(0).getName()).isEqualTo("Enouvo Space 1");
    }
}
