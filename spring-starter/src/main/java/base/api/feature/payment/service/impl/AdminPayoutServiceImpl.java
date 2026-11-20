package base.api.feature.payment.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.notification.repository.IUserNotificationRepository;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.feature.organizer.service.OrganizerBankAccountCipher;
import base.api.feature.payment.dto.payout.OrganizerPayoutSettingDto;
import base.api.feature.payment.dto.payout.OrganizerWithdrawalBatchDto;
import base.api.feature.payment.dto.payout.ReviewPayoutRequestDto;
import base.api.feature.payment.mapper.PayoutMapper;
import base.api.feature.payment.repository.IOrganizerPayoutRepository;
import base.api.feature.payment.repository.IOrganizerPayoutSettingRepository;
import base.api.feature.payment.repository.IOrganizerWithdrawalBatchRepository;
import base.api.feature.payment.service.IAdminPayoutService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.entity.payment.OrganizerPayoutModel;
import base.api.shared.entity.payment.OrganizerPayoutSettingModel;
import base.api.shared.entity.payment.OrganizerWithdrawalBatchModel;
import base.api.shared.entity.review.UserNotificationModel;
import base.api.shared.enums.NotificationType;
import base.api.shared.enums.PayoutApprovalStatus;
import base.api.shared.enums.PayoutMode;
import base.api.shared.enums.PayoutStatus;
import base.api.shared.enums.WithdrawalBatchStatus;
import base.api.shared.enums.WithdrawalType;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;
import vn.payos.model.v1.payouts.Payout;
import vn.payos.model.v1.payouts.PayoutRequests;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.Set;

@Slf4j
@Service
public class AdminPayoutServiceImpl implements IAdminPayoutService {

    private static final Set<String> SETTING_SORTABLE_FIELDS = Set.of("id", "createdAt", "updatedAt", "requestedAt");
    private static final Set<String> WITHDRAWAL_SORTABLE_FIELDS = Set.of("id", "createdAt", "amount", "status", "payoutType");

    private static final Map<String, String> BANK_NAME_TO_BIN = Map.ofEntries(
            Map.entry("MBBank", "970422"),
            Map.entry("Vietcombank", "970436"),
            Map.entry("Techcombank", "970407"),
            Map.entry("VietinBank", "970415"),
            Map.entry("BIDV", "970418"),
            Map.entry("VPBank", "970432"),
            Map.entry("TPBank", "970423"),
            Map.entry("Agribank", "970405"),
            Map.entry("OCB", "970448"),
            Map.entry("ACB", "970416"),
            Map.entry("Sacombank", "970403"),
            Map.entry("HDBank", "970437")
    );

    private final IOrganizerPayoutSettingRepository payoutSettingRepository;
    private final IOrganizerWithdrawalBatchRepository withdrawalBatchRepository;
    private final IOrganizerPayoutRepository payoutRepository;
    private final IOrganizerProfileRepository organizerProfileRepository;
    private final IUserRepository userRepository;
    private final OrganizerBankAccountCipher bankCipher;
    private final PayOS payOS;
    private final IAuditService auditService;
    private final IUserNotificationRepository userNotificationRepository;

    @Value("${nexspace.payos.payout.client-id:${nexspace.payos.client-id:}}")
    private String clientId;

    public AdminPayoutServiceImpl(
            IOrganizerPayoutSettingRepository payoutSettingRepository,
            IOrganizerWithdrawalBatchRepository withdrawalBatchRepository,
            IOrganizerPayoutRepository payoutRepository,
            IOrganizerProfileRepository organizerProfileRepository,
            IUserRepository userRepository,
            OrganizerBankAccountCipher bankCipher,
            @Qualifier("payOSPayoutClient") PayOS payOS,
            IAuditService auditService,
            IUserNotificationRepository userNotificationRepository) {
        this.payoutSettingRepository = payoutSettingRepository;
        this.withdrawalBatchRepository = withdrawalBatchRepository;
        this.payoutRepository = payoutRepository;
        this.organizerProfileRepository = organizerProfileRepository;
        this.userRepository = userRepository;
        this.bankCipher = bankCipher;
        this.payOS = payOS;
        this.auditService = auditService;
        this.userNotificationRepository = userNotificationRepository;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<OrganizerPayoutSettingDto> getPendingApprovalRequests(PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest.toPageable("requestedAt", Sort.Direction.DESC, SETTING_SORTABLE_FIELDS);
        Page<OrganizerPayoutSettingModel> page = payoutSettingRepository.findByApprovalStatusIn(
                List.of(PayoutApprovalStatus.PENDING_ENABLE, PayoutApprovalStatus.PENDING_DISABLE), pageable);
        return PageResponseDTO.from(page.map(PayoutMapper::toSettingDto));
    }

    @Override
    @Transactional
    public OrganizerPayoutSettingDto reviewAutoPayoutRequest(Long adminId, Long settingId, ReviewPayoutRequestDto dto) {
        UserModel admin = userRepository.findById(adminId)
                .orElseThrow(() -> new NotFoundException("Admin không tồn tại"));

        OrganizerPayoutSettingModel setting = payoutSettingRepository.findById(settingId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy cấu hình Payout ID " + settingId));

        PayoutApprovalStatus currentStatus = setting.getApprovalStatus();
        if (currentStatus != PayoutApprovalStatus.PENDING_ENABLE && currentStatus != PayoutApprovalStatus.PENDING_DISABLE) {
            throw new BadRequestException("Cấu hình này hiện không có yêu cầu nào đang chờ xét duyệt");
        }

        boolean approved = Boolean.TRUE.equals(dto.getApproved());
        String actionAudit;
        String notificationTitle;
        String notificationContent;

        if (approved) {
            if (currentStatus == PayoutApprovalStatus.PENDING_ENABLE) {
                setting.setPayoutMode(PayoutMode.AUTO_DAILY);
                int targetHour = setting.getPendingAutoPayoutHour() != null ? setting.getPendingAutoPayoutHour() : 9;
                setting.setAutoPayoutHour(targetHour);
                setting.setApprovalStatus(PayoutApprovalStatus.APPROVED);

                actionAudit = "APPROVE_AUTO_PAYOUT_ENABLE";
                notificationTitle = "Yêu cầu kích hoạt Auto Payout đã được phê duyệt";
                notificationContent = "Quản trị viên đã phê duyệt yêu cầu kích hoạt chế độ Auto Payout hàng ngày lúc "
                        + targetHour + ":00 của bạn.";
            } else {
                setting.setPayoutMode(PayoutMode.MANUAL);
                setting.setApprovalStatus(PayoutApprovalStatus.NONE);

                actionAudit = "APPROVE_AUTO_PAYOUT_CANCEL";
                notificationTitle = "Yêu cầu hủy Auto Payout đã được phê duyệt";
                notificationContent = "Quản trị viên đã phê duyệt yêu cầu hủy Auto Payout. Tài khoản của bạn đã chuyển về chế độ Rút tiền thủ công (Manual).";
            }
        } else {
            setting.setApprovalStatus(PayoutApprovalStatus.REJECTED);
            actionAudit = "REJECT_AUTO_PAYOUT_REQUEST";
            notificationTitle = "Yêu cầu Payout đã bị từ chối";
            notificationContent = "Yêu cầu thay đổi chế độ Payout của bạn đã bị từ chối."
                    + (StringUtils.hasText(dto.getAdminFeedback()) ? " Lý do: " + dto.getAdminFeedback() : "");
        }

        setting.setReviewedBy(admin);
        setting.setReviewedAt(LocalDateTime.now());
        setting.setAdminFeedback(dto.getAdminFeedback());
        setting = payoutSettingRepository.save(setting);

        // Ghi Audit log
        auditService.log(
                admin,
                "PAYOUT_SETTING",
                actionAudit,
                "OrganizerPayoutSetting",
                setting.getId(),
                "Admin " + (approved ? "phê duyệt" : "từ chối") + " yêu cầu payout của Organizer ID="
                        + setting.getOrganizer().getId() + (StringUtils.hasText(dto.getAdminFeedback()) ? " - " + dto.getAdminFeedback() : "")
        );

        // Gửi thông báo đến Organizer
        createNotification(
                setting.getOrganizer(),
                notificationTitle,
                notificationContent,
                "PAYOUT_SETTING",
                setting.getId()
        );

        return PayoutMapper.toSettingDto(setting);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<OrganizerWithdrawalBatchDto> getAllWithdrawals(
            PageRequestDTO pageRequest, String status, String payoutType) {
        Pageable pageable = pageRequest.toPageable("createdAt", Sort.Direction.DESC, WITHDRAWAL_SORTABLE_FIELDS);

        WithdrawalBatchStatus batchStatus = null;
        if (StringUtils.hasText(status)) {
            try {
                batchStatus = WithdrawalBatchStatus.valueOf(status.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        WithdrawalType type = null;
        if (StringUtils.hasText(payoutType)) {
            try {
                type = WithdrawalType.valueOf(payoutType.trim().toUpperCase());
            } catch (IllegalArgumentException ignored) {}
        }

        Page<OrganizerWithdrawalBatchModel> page;
        if (batchStatus != null && type != null) {
            page = withdrawalBatchRepository.findByStatusAndPayoutType(batchStatus, type, pageable);
        } else if (batchStatus != null) {
            page = withdrawalBatchRepository.findByStatus(batchStatus, pageable);
        } else if (type != null) {
            page = withdrawalBatchRepository.findByPayoutType(type, pageable);
        } else {
            page = withdrawalBatchRepository.findAll(pageable);
        }

        return PageResponseDTO.from(page.map(PayoutMapper::toWithdrawalBatchDto));
    }

    @Override
    @Transactional
    public OrganizerWithdrawalBatchDto retryWithdrawal(Long adminId, Long batchId) {
        UserModel admin = userRepository.findById(adminId)
                .orElseThrow(() -> new NotFoundException("Admin không tồn tại"));

        OrganizerWithdrawalBatchModel batch = withdrawalBatchRepository.findById(batchId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy đợt rút tiền ID " + batchId));

        if (batch.getStatus() != WithdrawalBatchStatus.FAILED) {
            throw new BadRequestException("Chỉ có thể thử lại các đợt rút tiền có trạng thái THẤT BẠI (FAILED)");
        }

        OrganizerProfileModel profile = organizerProfileRepository.findByOrganizerId(batch.getOrganizer().getId())
                .orElseThrow(() -> new BadRequestException("Không tìm thấy hồ sơ doanh nghiệp của Organizer"));

        String bankBin = resolveBankBin(batch.getBankBin(), batch.getBankName());
        String decryptedAccountNumber = bankCipher.decrypt(profile.getId(), profile.getBankAccountNumber());
        if (!StringUtils.hasText(decryptedAccountNumber)) {
            throw new BadRequestException("Không thể giải mã số tài khoản ngân hàng của Organizer");
        }

        List<OrganizerPayoutModel> allocatedPayouts = payoutRepository.findByWithdrawalBatchId(batch.getId());

        batch.setStatus(WithdrawalBatchStatus.PROCESSING);
        batch.setErrorReason(null);
        withdrawalBatchRepository.save(batch);

        String refId = batch.getBatchCode();
        String desc = "NEXSPACE RETRY " + batch.getId();
        if (desc.length() > 25) desc = desc.substring(0, 25);

        if ("mock-client-id".equals(clientId) || !StringUtils.hasText(clientId)) {
            batch.setStatus(WithdrawalBatchStatus.PAID);
            batch.setPayosReference("PAYOS_MOCK_RETRY_" + System.currentTimeMillis());
            withdrawalBatchRepository.save(batch);

            for (OrganizerPayoutModel p : allocatedPayouts) {
                p.setStatus(PayoutStatus.PAID);
                p.setPaidAt(LocalDateTime.now());
                p.setPayoutReference(batch.getPayosReference());
            }
            payoutRepository.saveAll(allocatedPayouts);
            return PayoutMapper.toWithdrawalBatchDto(batch);
        }

        try {
            PayoutRequests payoutReq = PayoutRequests.builder()
                    .referenceId(refId)
                    .amount(batch.getAmount().longValue())
                    .description(desc)
                    .toBin(bankBin.trim())
                    .toAccountNumber(decryptedAccountNumber.trim())
                    .build();

            Payout payout = payOS.payouts().create(payoutReq);
            String ref = StringUtils.hasText(payout.getId()) ? payout.getId() : payout.getReferenceId();

            batch.setStatus(WithdrawalBatchStatus.PAID);
            batch.setPayosReference(ref);
            withdrawalBatchRepository.save(batch);

            for (OrganizerPayoutModel p : allocatedPayouts) {
                p.setStatus(PayoutStatus.PAID);
                p.setPaidAt(LocalDateTime.now());
                p.setPayoutReference(ref);
            }
            payoutRepository.saveAll(allocatedPayouts);

            auditService.log(
                    admin,
                    "PAYOUT",
                    "RETRY_WITHDRAWAL_SUCCESS",
                    "OrganizerWithdrawalBatch",
                    batch.getId(),
                    "Admin thử lại chi tiền thành công đợt " + batch.getBatchCode() + " (" + batch.getAmount() + " đ, ref=" + ref + ")"
            );

        } catch (Exception e) {
            log.error("Retry PayOS Payout failed for batch {}: {}", batch.getBatchCode(), e.getMessage(), e);
            batch.setStatus(WithdrawalBatchStatus.FAILED);
            batch.setErrorReason(e.getMessage());
            withdrawalBatchRepository.save(batch);
            throw new BadRequestException("Thử lại chi tiền PayOS thất bại: " + e.getMessage());
        }

        return PayoutMapper.toWithdrawalBatchDto(batch);
    }

    private String resolveBankBin(String configuredBin, String bankName) {
        if (StringUtils.hasText(configuredBin)) return configuredBin.trim();
        if (!StringUtils.hasText(bankName)) return "970422";
        for (Map.Entry<String, String> entry : BANK_NAME_TO_BIN.entrySet()) {
            if (bankName.toLowerCase().contains(entry.getKey().toLowerCase())) {
                return entry.getValue();
            }
        }
        return "970422";
    }

    private void createNotification(UserModel user, String title, String content, String entityType, Long entityId) {
        UserNotificationModel notification = new UserNotificationModel();
        notification.setUser(user);
        notification.setType(NotificationType.SYSTEM);
        notification.setTitle(title);
        notification.setContent(content);
        notification.setRelatedEntityType(entityType);
        notification.setRelatedEntityId(entityId);
        notification.setRead(false);
        userNotificationRepository.save(notification);
    }
}
