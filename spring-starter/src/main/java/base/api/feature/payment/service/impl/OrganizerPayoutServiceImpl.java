package base.api.feature.payment.service.impl;

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
import base.api.feature.payment.dto.payout.RequestCancelAutoPayoutDto;
import base.api.feature.payment.mapper.PayoutMapper;
import base.api.feature.payment.repository.IOrganizerPayoutRepository;
import base.api.feature.payment.repository.IOrganizerPayoutSettingRepository;
import base.api.feature.payment.repository.IOrganizerWithdrawalBatchRepository;
import base.api.feature.payment.service.IOrganizerPayoutService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.dto.PageResponseDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.booking.BookingModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.entity.payment.OrganizerPayoutModel;
import base.api.shared.entity.payment.OrganizerPayoutSettingModel;
import base.api.shared.entity.payment.OrganizerWithdrawalBatchModel;
import base.api.shared.entity.review.UserNotificationModel;
import base.api.shared.enums.BookingStatus;
import base.api.shared.enums.NotificationType;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.PayoutApprovalStatus;
import base.api.shared.enums.PayoutMode;
import base.api.shared.enums.PayoutStatus;
import base.api.shared.enums.WithdrawalBatchStatus;
import base.api.shared.enums.WithdrawalType;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
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

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Slf4j
@Service
public class OrganizerPayoutServiceImpl implements IOrganizerPayoutService {

    private static final Set<String> SORTABLE_FIELDS = Set.of("id", "createdAt", "amount", "status", "payoutType");
    private static final BigDecimal MIN_WITHDRAWAL_AMOUNT = new BigDecimal("1000.00");

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

    private final base.api.feature.payment.repository.IRefundRequestRepository refundRequests;
    private final IOrganizerPayoutRepository payoutRepository;
    private final IOrganizerPayoutSettingRepository payoutSettingRepository;
    private final IOrganizerWithdrawalBatchRepository withdrawalBatchRepository;
    private final IOrganizerProfileRepository organizerProfileRepository;
    private final IUserRepository userRepository;
    private final IBookingRepository bookingRepository;
    private final OrganizerBankAccountCipher bankCipher;
    private final PayOS payOS;
    private final IAuditService auditService;
    private final IUserNotificationRepository userNotificationRepository;

    @Value("${nexspace.payos.payout.client-id:${nexspace.payos.client-id:}}")
    private String clientId;

    public OrganizerPayoutServiceImpl(
            base.api.feature.payment.repository.IRefundRequestRepository refundRequests,
            IOrganizerPayoutRepository payoutRepository,
            IOrganizerPayoutSettingRepository payoutSettingRepository,
            IOrganizerWithdrawalBatchRepository withdrawalBatchRepository,
            IOrganizerProfileRepository organizerProfileRepository,
            IUserRepository userRepository,
            IBookingRepository bookingRepository,
            OrganizerBankAccountCipher bankCipher,
            @Qualifier("payOSPayoutClient") PayOS payOS,
            IAuditService auditService,
            IUserNotificationRepository userNotificationRepository) {
        this.refundRequests = refundRequests;
        this.payoutRepository = payoutRepository;
        this.payoutSettingRepository = payoutSettingRepository;
        this.withdrawalBatchRepository = withdrawalBatchRepository;
        this.organizerProfileRepository = organizerProfileRepository;
        this.userRepository = userRepository;
        this.bookingRepository = bookingRepository;
        this.bankCipher = bankCipher;
        this.payOS = payOS;
        this.auditService = auditService;
        this.userNotificationRepository = userNotificationRepository;
    }

    @Override
    @Transactional
    public OrganizerPayoutBalanceDto getBalance(Long organizerId) {
        // 1. Tự động chuyển đổi các khoản HELD đã hết hạn giữ chỗ sang RELEASED
        releaseEligibleHeldPayoutsForOrganizer(organizerId);

        // 2. Tự động khởi tạo OrganizerPayout cho các booking đã confirm nếu chưa có
        backfillPayoutsForOrganizer(organizerId);

        // 3. Lấy thông tin tài khoản ngân hàng từ hồ sơ doanh nghiệp đã duyệt
        OrganizerProfileModel profile = organizerProfileRepository.findByOrganizerId(organizerId).orElse(null);
        String bankName = profile != null ? profile.getBankName() : null;
        String bankBin = profile != null ? resolveBankBin(profile.getBankBin(), profile.getBankName()) : null;
        String bankHolder = profile != null ? profile.getBankAccountHolder() : null;
        String bankAccountMasked = null;
        boolean hasConfiguredBank = false;

        if (profile != null && StringUtils.hasText(profile.getBankAccountNumber())) {
            String lastFour = bankCipher.lastFour(profile.getId(), profile.getBankAccountNumber());
            if (StringUtils.hasText(lastFour)) {
                bankAccountMasked = "•••• " + lastFour;
                hasConfiguredBank = StringUtils.hasText(bankName) && StringUtils.hasText(bankHolder);
            }
        }

        // 4. Tính toán các số dư
        List<OrganizerPayoutModel> allPayouts = payoutRepository.findByOrganizerId(organizerId);

        BigDecimal grossRevenue = BigDecimal.ZERO;
        BigDecimal heldBalance = BigDecimal.ZERO;
        BigDecimal withdrawableBalance = BigDecimal.ZERO;

        for (OrganizerPayoutModel p : allPayouts) {
            BigDecimal netPayout = p.getPayoutAmount() != null ? p.getPayoutAmount() : BigDecimal.ZERO;
            grossRevenue = grossRevenue.add(netPayout);

            if (p.getStatus() == PayoutStatus.HELD || p.getStatus() == PayoutStatus.FROZEN) {
                heldBalance = heldBalance.add(netPayout);
            } else if (p.getStatus() == PayoutStatus.RELEASED && p.getWithdrawalBatch() == null) {
                withdrawableBalance = withdrawableBalance.add(netPayout);
            }
        }

        // Tổng tiền đã thực chuyển thành công
        Page<OrganizerWithdrawalBatchModel> paidBatches = withdrawalBatchRepository.findByOrganizerIdAndStatus(
                organizerId, WithdrawalBatchStatus.PAID, Pageable.unpaged());
        BigDecimal paidOutTotal = paidBatches.getContent().stream()
                .map(OrganizerWithdrawalBatchModel::getAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        boolean canWithdraw = hasConfiguredBank && withdrawableBalance.compareTo(MIN_WITHDRAWAL_AMOUNT) >= 0;

        return OrganizerPayoutBalanceDto.builder()
                .grossRevenue(grossRevenue)
                .heldBalance(heldBalance)
                .withdrawableBalance(withdrawableBalance)
                .paidOutTotal(paidOutTotal)
                .bankName(bankName)
                .bankBin(bankBin)
                .bankAccountNumberMasked(bankAccountMasked)
                .bankAccountHolder(bankHolder)
                .hasConfiguredBank(hasConfiguredBank)
                .canWithdraw(canWithdraw)
                .build();
    }

    @Override
    @Transactional
    public OrganizerPayoutSettingDto getSettings(Long organizerId) {
        OrganizerPayoutSettingModel setting = payoutSettingRepository.findByOrganizerId(organizerId)
                .orElseGet(() -> {
                    UserModel user = userRepository.findById(organizerId)
                            .orElseThrow(() -> new NotFoundException("Organizer không tồn tại"));
                    OrganizerPayoutSettingModel newSetting = new OrganizerPayoutSettingModel();
                    newSetting.setOrganizer(user);
                    newSetting.setPayoutMode(PayoutMode.MANUAL);
                    newSetting.setAutoPayoutHour(9);
                    newSetting.setApprovalStatus(PayoutApprovalStatus.NONE);
                    return payoutSettingRepository.save(newSetting);
                });
        return PayoutMapper.toSettingDto(setting);
    }

    @Override
    @Transactional
    public OrganizerPayoutSettingDto requestAutoPayout(Long organizerId, RequestAutoPayoutDto dto) {
        OrganizerProfileModel profile = organizerProfileRepository.findByOrganizerId(organizerId)
                .orElseThrow(() -> new BadRequestException("Bạn chưa tạo hồ sơ doanh nghiệp Organizer"));
        if (profile.getStatus() != OrganizerProfileStatus.APPROVED) {
            throw new BadRequestException("Hồ sơ doanh nghiệp phải được Admin phê duyệt trước khi đăng ký Auto Payout");
        }
        if (!StringUtils.hasText(profile.getBankAccountNumber()) || !StringUtils.hasText(profile.getBankName())) {
            throw new BadRequestException("Vui lòng hoàn tất thông tin tài khoản ngân hàng trong hồ sơ trước khi bật Auto Payout");
        }

        OrganizerPayoutSettingModel setting = payoutSettingRepository.findByOrganizerId(organizerId)
                .orElseGet(() -> {
                    UserModel user = userRepository.findById(organizerId)
                            .orElseThrow(() -> new NotFoundException("Organizer không tồn tại"));
                    OrganizerPayoutSettingModel s = new OrganizerPayoutSettingModel();
                    s.setOrganizer(user);
                    return s;
                });

        if (setting.getApprovalStatus() == PayoutApprovalStatus.PENDING_ENABLE) {
            throw new ConflictException("Yêu cầu kích hoạt Auto Payout của bạn đang chờ Admin xét duyệt, vui lòng không gửi lại");
        }

        setting.setPendingAutoPayoutHour(dto.getAutoPayoutHour());
        setting.setRequestNote(dto.getRequestNote());
        setting.setApprovalStatus(PayoutApprovalStatus.PENDING_ENABLE);
        setting.setRequestedAt(LocalDateTime.now());
        setting = payoutSettingRepository.save(setting);

        auditService.log(
                setting.getOrganizer(),
                "PAYOUT_SETTING",
                "REQUEST_ENABLE_AUTO",
                "OrganizerPayoutSetting",
                setting.getId(),
                "Organizer gửi yêu cầu kích hoạt Auto Payout hàng ngày lúc " + dto.getAutoPayoutHour() + ":00"
        );

        return PayoutMapper.toSettingDto(setting);
    }

    @Override
    @Transactional
    public OrganizerPayoutSettingDto requestCancelAutoPayout(Long organizerId, RequestCancelAutoPayoutDto dto) {
        OrganizerPayoutSettingModel setting = payoutSettingRepository.findByOrganizerId(organizerId)
                .orElseThrow(() -> new NotFoundException("Chưa tìm thấy cấu hình Payout của bạn"));

        if (setting.getPayoutMode() != PayoutMode.AUTO_DAILY) {
            throw new BadRequestException("Hệ thống của bạn hiện đang ở chế độ Rút tay (Manual), không cần gửi yêu cầu hủy");
        }
        if (setting.getApprovalStatus() == PayoutApprovalStatus.PENDING_DISABLE) {
            throw new ConflictException("Yêu cầu hủy Auto Payout của bạn đang chờ Admin xét duyệt");
        }

        setting.setApprovalStatus(PayoutApprovalStatus.PENDING_DISABLE);
        setting.setRequestNote(dto != null ? dto.getRequestNote() : null);
        setting.setRequestedAt(LocalDateTime.now());
        setting = payoutSettingRepository.save(setting);

        auditService.log(
                setting.getOrganizer(),
                "PAYOUT_SETTING",
                "REQUEST_DISABLE_AUTO",
                "OrganizerPayoutSetting",
                setting.getId(),
                "Organizer gửi yêu cầu hủy chế độ Auto Payout quay về Rút tay"
        );

        return PayoutMapper.toSettingDto(setting);
    }

    @Override
    @Transactional
    public OrganizerWithdrawalBatchDto withdrawManual(Long organizerId, ManualWithdrawalRequestDto dto) {
        UserModel organizer = userRepository.findById(organizerId)
                .orElseThrow(() -> new NotFoundException("Organizer không tồn tại"));

        OrganizerProfileModel profile = organizerProfileRepository.findByOrganizerId(organizerId)
                .orElseThrow(() -> new BadRequestException("Bạn chưa có hồ sơ doanh nghiệp Organizer"));
        if (!StringUtils.hasText(profile.getBankAccountNumber()) || !StringUtils.hasText(profile.getBankName())) {
            throw new BadRequestException("Vui lòng cập nhật đầy đủ thông tin tài khoản ngân hàng trước khi thực hiện rút tiền");
        }

        // Tự động giải phóng các khoản đã đủ điều kiện
        releaseEligibleHeldPayoutsForOrganizer(organizerId);

        List<OrganizerPayoutModel> releasedPayouts = payoutRepository.findWithdrawableForUpdate(organizerId);

        BigDecimal availableAmount = releasedPayouts.stream()
                .map(OrganizerPayoutModel::getPayoutAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add);

        if (availableAmount.compareTo(MIN_WITHDRAWAL_AMOUNT) < 0) {
            throw new BadRequestException("Số dư khả dụng hiện tại (" + availableAmount + " đ) không đủ mức rút tối thiểu (" + MIN_WITHDRAWAL_AMOUNT + " đ)");
        }

        BigDecimal requestedAmount = (dto.getWithdrawAll() != null && dto.getWithdrawAll())
                ? availableAmount
                : dto.getAmount();

        if (requestedAmount == null || requestedAmount.compareTo(MIN_WITHDRAWAL_AMOUNT) < 0) {
            throw new BadRequestException("Số tiền rút tối thiểu là 1.000 VNĐ");
        }
        if (requestedAmount.compareTo(availableAmount) > 0) {
            throw new BadRequestException("Số tiền rút (" + requestedAmount + " đ) vượt quá số dư khả dụng (" + availableAmount + " đ)");
        }

        String bankBin = resolveBankBin(profile.getBankBin(), profile.getBankName());
        String decryptedAccountNumber = bankCipher.decrypt(profile.getId(), profile.getBankAccountNumber());
        if (!StringUtils.hasText(decryptedAccountNumber)) {
            throw new ConflictException("Không thể giải mã số tài khoản ngân hàng. Vui lòng cập nhật lại thông tin tài khoản ngân hàng.");
        }

        String batchCode = "WD-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-"
                + (System.currentTimeMillis() % 1000000);

        OrganizerWithdrawalBatchModel batch = new OrganizerWithdrawalBatchModel();
        batch.setBatchCode(batchCode);
        batch.setOrganizer(organizer);
        batch.setAmount(requestedAmount);
        batch.setPayoutType(WithdrawalType.MANUAL);
        batch.setStatus(WithdrawalBatchStatus.PROCESSING);
        batch.setBankName(profile.getBankName());
        batch.setBankBin(bankBin);
        batch.setBankAccountNumber(profile.getBankAccountNumber());
        batch.setBankAccountHolder(profile.getBankAccountHolder());
        batch = withdrawalBatchRepository.save(batch);

        // Gom các payout đủ số tiền yêu cầu
        List<OrganizerPayoutModel> allocatedPayouts = new ArrayList<>();
        BigDecimal accumulated = BigDecimal.ZERO;
        for (OrganizerPayoutModel p : releasedPayouts) {
            allocatedPayouts.add(p);
            p.setWithdrawalBatch(batch);
            accumulated = accumulated.add(p.getPayoutAmount());
            if (accumulated.compareTo(requestedAmount) >= 0) {
                break;
            }
        }
        payoutRepository.saveAll(allocatedPayouts);

        // Gọi PayOS Payouts thực tế
        executePayOSPayout(batch, decryptedAccountNumber, bankBin, allocatedPayouts);

        return PayoutMapper.toWithdrawalBatchDto(batch);
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponseDTO<OrganizerWithdrawalBatchDto> getWithdrawalHistory(Long organizerId, PageRequestDTO pageRequest) {
        Pageable pageable = pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS);
        Page<OrganizerWithdrawalBatchModel> page = withdrawalBatchRepository.findByOrganizerId(organizerId, pageable);
        return PageResponseDTO.from(page.map(PayoutMapper::toWithdrawalBatchDto));
    }

    @Override
    @Transactional
    public void releaseEligibleHeldPayouts() {
        LocalDateTime now = LocalDateTime.now();
        List<OrganizerPayoutModel> eligiblePayouts = payoutRepository.findByStatusAndEligibleAtBefore(
                PayoutStatus.HELD, now);

        if (eligiblePayouts.isEmpty()) return;

        List<OrganizerPayoutModel> toRelease = new ArrayList<>();
        for (OrganizerPayoutModel p : eligiblePayouts) {
            // Không release nếu đang bị chặn bởi khiếu nại (support case)
            if (p.getSupportCase() == null && !hasPendingRefund(p)) {
                p.setStatus(PayoutStatus.RELEASED);
                toRelease.add(p);
            }
        }

        if (!toRelease.isEmpty()) {
            payoutRepository.saveAll(toRelease);
            log.info("Released {} eligible held payouts to WITHDRAWABLE balance at {}", toRelease.size(), now);
        }
    }

    @Override
    @Transactional
    public void executeDailyAutoPayoutForCurrentHour() {
        int currentHour = LocalDateTime.now().getHour();
        List<OrganizerPayoutSettingModel> activeAutoSettings = payoutSettingRepository
                .findByPayoutModeAndApprovalStatusAndAutoPayoutHour(
                        PayoutMode.AUTO_DAILY, PayoutApprovalStatus.APPROVED, currentHour);

        log.info("Running Daily Auto-Payout job for hour {}:00, found {} active organizers", currentHour, activeAutoSettings.size());

        for (OrganizerPayoutSettingModel setting : activeAutoSettings) {
            Long orgId = setting.getOrganizer().getId();
            try {
                releaseEligibleHeldPayoutsForOrganizer(orgId);

                List<OrganizerPayoutModel> releasedPayouts = payoutRepository.findWithdrawableForUpdate(orgId);

                BigDecimal availableAmount = releasedPayouts.stream()
                        .map(OrganizerPayoutModel::getPayoutAmount)
                        .reduce(BigDecimal.ZERO, BigDecimal::add);

                if (availableAmount.compareTo(MIN_WITHDRAWAL_AMOUNT) < 0) {
                    log.info("Organizer {} available balance ({} đ) below minimum withdrawal threshold. Skipping auto payout.",
                            orgId, availableAmount);
                    continue;
                }

                OrganizerProfileModel profile = organizerProfileRepository.findByOrganizerId(orgId).orElse(null);
                if (profile == null || !StringUtils.hasText(profile.getBankAccountNumber()) || !StringUtils.hasText(profile.getBankName())) {
                    log.warn("Organizer {} has missing bank details. Skipping auto payout.", orgId);
                    continue;
                }

                String bankBin = resolveBankBin(profile.getBankBin(), profile.getBankName());
                String decryptedAccountNumber = bankCipher.decrypt(profile.getId(), profile.getBankAccountNumber());
                if (!StringUtils.hasText(decryptedAccountNumber)) {
                    log.error("Failed to decrypt bank account for organizer {}. Skipping auto payout.", orgId);
                    continue;
                }

                String batchCode = "WD-AUTO-" + LocalDateTime.now().format(DateTimeFormatter.ofPattern("yyyyMMdd")) + "-"
                        + (System.currentTimeMillis() % 1000000);

                OrganizerWithdrawalBatchModel batch = new OrganizerWithdrawalBatchModel();
                batch.setBatchCode(batchCode);
                batch.setOrganizer(setting.getOrganizer());
                batch.setAmount(availableAmount);
                batch.setPayoutType(WithdrawalType.AUTO_DAILY);
                batch.setStatus(WithdrawalBatchStatus.PROCESSING);
                batch.setBankName(profile.getBankName());
                batch.setBankBin(bankBin);
                batch.setBankAccountNumber(profile.getBankAccountNumber());
                batch.setBankAccountHolder(profile.getBankAccountHolder());
                batch = withdrawalBatchRepository.save(batch);

                for (OrganizerPayoutModel p : releasedPayouts) {
                    p.setWithdrawalBatch(batch);
                }
                payoutRepository.saveAll(releasedPayouts);

                executePayOSPayout(batch, decryptedAccountNumber, bankBin, releasedPayouts);

                // Gửi thông báo đến chuông thông báo
                createNotification(
                        setting.getOrganizer(),
                        "Rút tiền tự động hàng ngày thành công",
                        "Hệ thống đã tự động chuyển " + String.format("%,d", availableAmount.longValue()) + " đ về tài khoản ngân hàng "
                                + profile.getBankName() + " theo lịch Auto Payout " + currentHour + ":00.",
                        "ORGANIZER_WITHDRAWAL",
                        batch.getId()
                );

            } catch (Exception e) {
                log.error("Failed to execute daily auto payout for organizer {}: {}", orgId, e.getMessage(), e);
            }
        }
    }

    private void executePayOSPayout(
            OrganizerWithdrawalBatchModel batch,
            String decryptedAccountNumber,
            String bankBin,
            List<OrganizerPayoutModel> allocatedPayouts) {

        String refId = batch.getBatchCode();
        String desc = "NEXSPACE PAYOUT " + batch.getId();
        if (desc.length() > 25) desc = desc.substring(0, 25);

        if ("mock-client-id".equals(clientId) || !StringUtils.hasText(clientId)) {
            log.info("Mock PayOS credentials detected. Simulating successful payout for batchCode={}", batch.getBatchCode());
            batch.setStatus(WithdrawalBatchStatus.PAID);
            batch.setPayosReference("PAYOS_MOCK_" + System.currentTimeMillis());
            withdrawalBatchRepository.save(batch);

            for (OrganizerPayoutModel p : allocatedPayouts) {
                p.setStatus(PayoutStatus.PAID);
                p.setPaidAt(LocalDateTime.now());
                p.setPayoutReference(batch.getPayosReference());
            }
            payoutRepository.saveAll(allocatedPayouts);
            return;
        }

        try {
            log.info("Calling PayOS Payouts for batchCode={}, amount={}, bin={}, toAcc=••••{}",
                    batch.getBatchCode(), batch.getAmount().longValue(), bankBin,
                    decryptedAccountNumber.substring(Math.max(0, decryptedAccountNumber.length() - 4)));

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
                    batch.getOrganizer(),
                    "PAYOUT",
                    "WITHDRAWAL_SUCCESS",
                    "OrganizerWithdrawalBatch",
                    batch.getId(),
                    "Chi tiền thành công " + batch.getAmount() + " đ qua PayOS (ref=" + ref + ")"
            );

        } catch (Exception e) {
            log.error("PayOS Payout failed for batch {}: {}", batch.getBatchCode(), e.getMessage(), e);
            batch.setStatus(WithdrawalBatchStatus.FAILED);
            batch.setErrorReason(e.getMessage());
            withdrawalBatchRepository.save(batch);

            // Hoàn lại trạng thái RELEASED cho các payout con
            for (OrganizerPayoutModel p : allocatedPayouts) {
                p.setWithdrawalBatch(null);
            }
            payoutRepository.saveAll(allocatedPayouts);

            throw new BadRequestException("Cổng PayOS báo lỗi khi thực hiện chi tiền: " + e.getMessage());
        }
    }

    private boolean hasPendingRefund(OrganizerPayoutModel payout) {
        return refundRequests.findByBookingId(payout.getBooking().getId()).stream().anyMatch(r -> r.getStatus() == base.api.shared.enums.RefundStatus.PENDING);
    }

    private void releaseEligibleHeldPayoutsForOrganizer(Long organizerId) {
        LocalDateTime now = LocalDateTime.now();
        List<OrganizerPayoutModel> heldPayouts = payoutRepository.findHeldForUpdate(organizerId);
        List<OrganizerPayoutModel> toRelease = new ArrayList<>();
        for (OrganizerPayoutModel p : heldPayouts) {
            if (p.getEligibleAt() != null && !p.getEligibleAt().isAfter(now) && p.getSupportCase() == null && !hasPendingRefund(p)) {
                p.setStatus(PayoutStatus.RELEASED);
                toRelease.add(p);
            }
        }
        if (!toRelease.isEmpty()) {
            payoutRepository.saveAll(toRelease);
        }
    }

    private void backfillPayoutsForOrganizer(Long organizerId) {
        // Tìm các booking confirmed của organizer này mà chưa có trong organizer_payout
        List<BookingModel> confirmedBookings = bookingRepository.findConfirmedBookingsByOrganizerId(
                organizerId, List.of(BookingStatus.CONFIRMED, BookingStatus.COMPLETED));

        for (BookingModel b : confirmedBookings) {
            if (payoutRepository.findByBookingId(b.getId()).isEmpty()) {
                OrganizerPayoutModel payout = new OrganizerPayoutModel();
                payout.setOrganizer(b.getWorkspace().getOrganizer());
                payout.setBooking(b);

                BigDecimal base = b.getBaseAmount() != null ? b.getBaseAmount() : BigDecimal.ZERO;
                BigDecimal surcharge = b.getSurchargeAmount() != null ? b.getSurchargeAmount() : BigDecimal.ZERO;
                BigDecimal addon = b.getAddonAmount() != null ? b.getAddonAmount() : BigDecimal.ZERO;
                BigDecimal vat = b.getTaxAmount() != null ? b.getTaxAmount() : BigDecimal.ZERO;
                BigDecimal platformFee = b.getPlatformFeeAmount() != null ? b.getPlatformFeeAmount() : BigDecimal.ZERO;

                BigDecimal gross = base.add(surcharge).add(addon);
                BigDecimal payoutAmount = gross.add(vat).subtract(platformFee);

                payout.setGrossAmount(gross);
                payout.setPlatformFeeAmount(platformFee);
                payout.setRefundDeductionAmount(BigDecimal.ZERO);
                payout.setPayoutAmount(payoutAmount);

                // Nếu booking đã kết thúc quá 24h thì cho RELEASED luôn, ngược lại HELD
                LocalDateTime eligibleAt = b.getEndTime() != null ? b.getEndTime().plusDays(1) : b.getCreatedAt().plusDays(1);
                payout.setEligibleAt(eligibleAt);
                if (eligibleAt.isBefore(LocalDateTime.now())) {
                    payout.setStatus(PayoutStatus.RELEASED);
                } else {
                    payout.setStatus(PayoutStatus.HELD);
                }

                payoutRepository.save(payout);
                log.info("Backfilled missing OrganizerPayout for confirmed booking {}", b.getBookingCode());
            }
        }
    }

    private String resolveBankBin(String configuredBin, String bankName) {
        if (StringUtils.hasText(configuredBin)) return configuredBin.trim();
        if (!StringUtils.hasText(bankName)) return "970422"; // default MBBank
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
