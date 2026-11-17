package base.api.feature.organizer.service;

import base.api.feature.auth.repository.*;
import base.api.feature.organizer.dto.response.OrganizerContractResponse;
import base.api.feature.organizer.repository.*;
import base.api.shared.config.EmailService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.*;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import java.security.SecureRandom;
import java.time.*;
import java.util.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.util.HtmlUtils;

@Service
public class OrganizerContractService {
    private final IOrganizerContractRepository contracts;
    private final IOrganizerProfileRepository profiles;
    private final IUserRepository users;
    private final IRoleRepository roles;
    private final OrganizerContractFiles files;
    private final OrganizerContractPdf pdf;
    private final OrganizerLifecycleAudit audit;
    private final EmailService email;
    private final PasswordEncoder encoder;
    private final Clock clock;
    private final ApplicationEventPublisher events;
    private final Environment environment;
    private final boolean demoEnabled;
    private final SecureRandom random = new SecureRandom();

    public OrganizerContractService(IOrganizerContractRepository contracts, IOrganizerProfileRepository profiles,
            IUserRepository users, IRoleRepository roles, OrganizerContractFiles files, OrganizerContractPdf pdf,
            OrganizerLifecycleAudit audit, EmailService email, PasswordEncoder encoder, Clock organizerApplicationClock,
            ApplicationEventPublisher events, Environment environment,
            @Value("${app.organizer.contract.demo-enabled:false}") boolean demoEnabled) {
        this.contracts = contracts; this.profiles = profiles; this.users = users; this.roles = roles;
        this.files = files; this.pdf = pdf; this.audit = audit; this.email = email; this.encoder = encoder;
        this.clock = organizerApplicationClock; this.events = events; this.environment = environment; this.demoEnabled = demoEnabled;
    }

    /** Called only from the administrator's locked review transaction. Production cannot issue this demo template. */
    @Transactional(propagation = Propagation.MANDATORY)
    public void issue(OrganizerProfileModel profile) {
        requireDemoEnabled();
        if (contracts.findByProfileId(profile.getId()).isPresent()) throw new ConflictException("An agreement already exists for this application");
        var contract = new OrganizerContractModel();
        contract.setProfile(profile); contract.setDemo(true); contract.setTemplateVersion("LOCAL-DEMO-1");
        contract.setContractNumber("NX-DEMO-" + profile.getId() + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        contract.setSigningEmail(profile.getOrganizer().getEmail());
        contract.setIssuedAt(now());
        contract.setContentSnapshot(template(profile, contract.getContractNumber()));
        byte[] artifact = pdf.render(contract.getContentSnapshot());
        contract.setContentHash(OrganizerContractFiles.digest(artifact));
        contract.setOriginalPdfKey(files.store(artifact));
        contracts.saveAndFlush(contract);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(readOnly = true)
    public OrganizerContractResponse current(Long actorId) {
        var actor = eligible(actorId);
        var profile = profiles.findByOrganizerId(actorId).orElseThrow(() -> new NotFoundException("Organizer application not found"));
        var contract = find(profile);
        return response(contract, actor, profile);
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public OrganizerContractResponse adminCurrent(Long actorId, Long applicationId) {
        admin(actorId);
        var profile = profiles.findById(applicationId).orElseThrow(() -> new NotFoundException("Organizer application not found"));
        return OrganizerContractResponse.from(find(profile), false);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(readOnly = true)
    public byte[] ownerPdf(Long actorId) {
        eligible(actorId);
        return artifact(find(profiles.findByOrganizerId(actorId).orElseThrow(() -> new NotFoundException("Organizer application not found"))));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public byte[] adminPdf(Long actorId, Long applicationId) {
        admin(actorId);
        return artifact(find(profiles.findById(applicationId).orElseThrow(() -> new NotFoundException("Organizer application not found"))));
    }

    @PreAuthorize("hasRole('USER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerContractResponse requestOtp(Long actorId, Long contractId, String contentHash) {
        var actor = lockActor(actorId);
        var profile = lockProfile(actorId);
        var contract = find(profile);
        identity(contract, contractId, contentHash); requirePending(actor, profile, contract);
        var now = now();
        if (contract.getOtpSentAt() != null && now.isBefore(contract.getOtpSentAt().plusSeconds(60)))
            throw new ConflictException("Wait 60 seconds before requesting another code");
        if (contract.getOtpWindowStart() == null || !now.isBefore(contract.getOtpWindowStart().plusHours(1))) {
            contract.setOtpWindowStart(now); contract.setOtpWindowCount(0);
        }
        if (contract.getOtpWindowCount() >= 5) throw new ConflictException("Email code limit reached. Try again after the one-hour window.");
        String otp = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        contract.setOtpHash(encoder.encode(otp)); contract.setOtpExpiresAt(now.plusMinutes(10));
        contract.setOtpSentAt(now); contract.setOtpAttempts(0); contract.setOtpWindowCount(contract.getOtpWindowCount() + 1);
        contracts.saveAndFlush(contract);
        try {
            email.sendRequiredHtmlEmail(actor.getEmail(), "NexSpace — Mã xác nhận hợp đồng thử nghiệm", """
                <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;padding:28px;border:1px solid #ddd;border-radius:16px">
                <h2 style="color:#5145e8">NexSpace · Xác nhận hợp đồng</h2>
                <p>Đây là mã xác nhận cho hợp đồng <strong>%s</strong> trong môi trường Local thử nghiệm.</p>
                <p style="font-size:32px;font-weight:bold;letter-spacing:8px">%s</p>
                <p>Mã có hiệu lực 10 phút. Không cung cấp mã cho người khác, kể cả người tự nhận là nhân viên NexSpace.</p>
                <p>Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Chưa có hợp đồng nào được xác nhận chỉ bởi việc gửi mã.</p></div>
                """.formatted(HtmlUtils.htmlEscape(contract.getContractNumber()), otp));
        } catch (IllegalStateException exception) { throw new ConflictException(exception.getMessage()); }
        return response(contract, actor, profile);
    }

    /** Failed OTP attempts must commit; all other signing failures roll back agreement and role changes. */
    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED, noRollbackFor = InvalidContractOtpException.class)
    public OrganizerContractResponse sign(Long actorId, Long contractId, String contentHash, String otp, boolean consent) {
        if (!consent) throw new BadRequestException("Confirm your authority and agreement before signing");
        // Match the approval lock order to serialize conditional tax-ID uniqueness without deadlocks.
        var role = roles.findByNameForOrganizerApproval("ORGANIZER")
                .orElseThrow(() -> new ConflictException("Organizer role is not configured"));
        var actor = lockActor(actorId);
        var profile = lockProfile(actorId);
        var contract = find(profile);
        identity(contract, contractId, contentHash);
        if ("SIGNED".equals(contract.getStatus()) && profile.getStatus() == OrganizerProfileStatus.APPROVED
                && actor.getRole() == UserRole.ORGANIZER) return response(contract, actor, profile);
        requirePending(actor, profile, contract);
        if (contract.getOtpHash() == null || contract.getOtpExpiresAt() == null || !now().isBefore(contract.getOtpExpiresAt()))
            throw new BadRequestException("The email code has expired. Request a new code.");
        if (contract.getOtpAttempts() >= 5) throw new BadRequestException("This code is locked after five incorrect attempts. Request a new code.");
        if (otp == null || !otp.matches("[0-9]{6}") || !encoder.matches(otp, contract.getOtpHash())) {
            contract.setOtpAttempts(contract.getOtpAttempts() + 1); contracts.saveAndFlush(contract);
            throw new InvalidContractOtpException("Incorrect email code. Remaining attempts: " + (5 - contract.getOtpAttempts()));
        }
        if (!OrganizerContractFiles.digest(files.read(contract.getOriginalPdfKey())).equals(contract.getContentHash()))
            throw new ConflictException("The contract artifact failed its integrity check. Contact support.");
        if (profiles.existsByTaxIdAndStatusAndIdNot(profile.getTaxId(), OrganizerProfileStatus.APPROVED, profile.getId()))
            throw new ConflictException("This tax ID belongs to an approved Organizer");
        var signedAt = now();
        String receipt = contract.getContentSnapshot() + "\n\nBIÊN NHẬN XÁC NHẬN THỬ NGHIỆM\n"
                + "Mã hợp đồng: " + contract.getContractNumber() + "\nNgười xác nhận: " + actorId
                + "\nThời điểm UTC: " + signedAt + "\nPhương thức: OTP email + xác nhận đồng ý và thẩm quyền đại diện."
                + "\nSHA-256 bản PDF được chấp thuận: " + contract.getContentHash()
                + "\nĐây không phải chữ ký số của NexSpace hay chứng nhận danh tính từ bên thứ ba.";
        byte[] signedPdf = pdf.render(receipt);
        contract.setSignedPdfKey(files.store(signedPdf)); contract.setSignedPdfHash(OrganizerContractFiles.digest(signedPdf));
        contract.setStatus("SIGNED");
        contract.setSignedAt(signedAt); contract.setSignedBy(actorId); contract.setOtpHash(null); contract.setOtpExpiresAt(null);
        profile.setStatus(OrganizerProfileStatus.APPROVED); actor.setRoleEntity(role);
        users.save(actor); profiles.save(profile); contracts.saveAndFlush(contract);
        audit.write(actor, profile.getId(), "Organizer.ContractSigned", Map.of("status", "CONTRACT_PENDING"),
                Map.of("status", "APPROVED", "contractId", contract.getId(), "contentHash", contract.getContentHash(),
                        "method", "EMAIL_OTP", "consent", true, "authorityConfirmed", true, "signedAt", signedAt.toString()), null);
        events.publishEvent(new OrganizerReviewNotification(profile.getId(), actor.getEmail(), actor.getUserName(),
                profile.getLegalName(), OrganizerProfileStatus.APPROVED, null, List.of()));
        return response(contract, actor, profile);
    }

    private OrganizerContractResponse response(OrganizerContractModel c, UserModel actor, OrganizerProfileModel profile) {
        return OrganizerContractResponse.from(c, "PENDING_SIGNATURE".equals(c.getStatus())
                && profile.getStatus() == OrganizerProfileStatus.CONTRACT_PENDING && actor.getRole() == UserRole.USER
                && demoEnabled && environment.acceptsProfiles(Profiles.of("local")));
    }
    private byte[] artifact(OrganizerContractModel c) {
        byte[] original = files.read(c.getOriginalPdfKey());
        if (!OrganizerContractFiles.digest(original).equals(c.getContentHash())) throw new ConflictException("Contract integrity check failed");
        if (c.getSignedPdfKey() == null) return original;
        byte[] signed = files.read(c.getSignedPdfKey());
        if (!OrganizerContractFiles.digest(signed).equals(c.getSignedPdfHash())) throw new ConflictException("Signed contract integrity check failed");
        return signed;
    }
    private OrganizerContractModel find(OrganizerProfileModel p) {
        return contracts.findByProfileId(p.getId()).orElseThrow(() -> new NotFoundException("No agreement has been issued for this application"));
    }
    private void identity(OrganizerContractModel c, Long id, String hash) {
        if (!Objects.equals(c.getId(), id) || !Objects.equals(c.getContentHash(), hash))
            throw new ConflictException("The agreement version changed. Reload and read the current agreement.");
    }
    private void requirePending(UserModel actor, OrganizerProfileModel profile, OrganizerContractModel c) {
        requireDemoEnabled();
        if (profile.getStatus() != OrganizerProfileStatus.CONTRACT_PENDING || !"PENDING_SIGNATURE".equals(c.getStatus())
                || actor.getRole() != UserRole.USER || !Objects.equals(c.getSigningEmail(), actor.getEmail()))
            throw new ConflictException("This agreement is not available for signing");
    }
    private void requireDemoEnabled() {
        if (!demoEnabled || !environment.acceptsProfiles(Profiles.of("local")) || environment.acceptsProfiles(Profiles.of("prod", "production")))
            throw new ConflictException("An approved production agreement template is required. The demo template is only available in Local.");
    }
    private UserModel eligible(Long id) {
        var actor = users.findById(id).orElseThrow(() -> new UnauthorizedException("Account not found"));
        requireEligible(actor); return actor;
    }
    private UserModel lockActor(Long id) {
        var actor = users.findByIdForApplication(id).orElseThrow(() -> new UnauthorizedException("Account not found"));
        requireEligible(actor); return actor;
    }
    private void requireEligible(UserModel actor) {
        if (!actor.isActive() || !actor.isVerified() || (actor.getRole() != UserRole.USER && actor.getRole() != UserRole.ORGANIZER))
            throw new ForbiddenException("An active, email-verified applicant account is required");
    }
    private OrganizerProfileModel lockProfile(Long actorId) {
        return profiles.findByOrganizerIdForUpdate(actorId).orElseThrow(() -> new NotFoundException("Organizer application not found"));
    }
    private void admin(Long id) {
        var actor = users.findById(id).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!actor.isActive() || actor.getRole() != UserRole.ADMIN) throw new ForbiddenException("An active Administrator account is required");
    }
    private LocalDateTime now() { return LocalDateTime.ofInstant(clock.instant(), ZoneOffset.UTC); }
    private String value(String text) { return text == null ? "" : text.replaceAll("[\\r\\n\\t]", " "); }
    private String template(OrganizerProfileModel p, String number) {
        return """
                NEXSPACE — HỢP ĐỒNG HỢP TÁC ORGANIZER
                BẢN THỬ NGHIỆM LOCAL — KHÔNG DÙNG CHO GIAO DỊCH THỰC TẾ

                Mã hợp đồng: %s
                Phiên bản: LOCAL-DEMO-1
                Thời điểm phát hành UTC: %s

                BÊN NỀN TẢNG: NexSpace (môi trường mô phỏng).
                Chưa cung cấp pháp nhân và người đại diện chính thức; không chèn chữ ký đại diện NexSpace.

                BÊN ORGANIZER
                Tên pháp lý: %s
                Loại hình: %s
                Mã số thuế: %s
                Người đại diện: %s
                Địa chỉ: %s
                Liên hệ: %s — %s

                1. PHẠM VI HỢP TÁC
                Organizer sử dụng NexSpace để quản lý các workspace, sơ đồ tầng, ghế/phòng và thông tin cung cấp trên nền tảng. Hợp đồng này không phải đơn đặt chỗ của khách hàng và không tự tạo giao dịch thanh toán.

                2. TRÁCH NHIỆM CUNG CẤP THÔNG TIN
                Organizer xác nhận thông tin đã nộp là chính xác, có thẩm quyền đại diện và có quyền cung cấp không gian được đăng. Organizer có trách nhiệm bảo đảm thông tin về không gian, tiện ích, giá và tình trạng cung cấp phản ánh đúng khả năng phục vụ.

                3. TÀI KHOẢN VÀ DỮ LIỆU
                Các bên bảo vệ thông tin tài khoản và chỉ xử lý thông tin khách hàng phục vụ hoạt động đã được cho phép. Không chia sẻ mã xác nhận. Thông tin giấy tờ và hợp đồng được truy cập theo quyền sở hữu và quyền quản trị.

                4. ĐIỀU KIỆN THƯƠNG MẠI
                Mẫu thử nghiệm này không ấn định phí, hoa hồng, tiền phạt, hoàn tiền hoặc nghĩa vụ thanh toán. Những điều khoản đó phải được các bên xác lập và duyệt trong hợp đồng chính thức trước khi sử dụng thực tế.

                5. XÁC NHẬN ĐIỆN TỬ TRONG MÔI TRƯỜNG THỬ NGHIỆM
                Người dùng đọc nội dung, xác nhận đồng ý và thẩm quyền đại diện, sau đó nhập OTP gửi tới email tài khoản đã xác thực. Hệ thống lưu phiên bản, mã kiểm tra nội dung, tài khoản và thời điểm xác nhận. Đây không phải chứng nhận chữ ký số hay xác minh danh tính của bên thứ ba.

                6. LƯU TRỮ VÀ PHẠM VI THỬ NGHIỆM
                Bản nội dung đã phát hành không tự thay đổi khi cập nhật thông tin liên hệ hoặc ngân hàng. Chỉ môi trường Local được phép sử dụng mẫu này. Trước triển khai thật, NexSpace phải cung cấp pháp nhân, mẫu điều khoản và phương thức ký chính thức đã được duyệt.
                """.formatted(number, now(), value(p.getLegalName()), p.getBusinessType(), value(p.getTaxId()),
                        value(p.getRepresentativeName()), value(p.getAddress()), value(p.getContactEmail()), value(p.getContactPhone()));
    }

    public static class InvalidContractOtpException extends BadRequestException {
        public InvalidContractOtpException(String message) { super(message); }
    }
}
