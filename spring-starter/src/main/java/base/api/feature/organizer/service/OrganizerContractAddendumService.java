package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.response.OrganizerContractAddendumResponse;
import base.api.feature.organizer.repository.*;
import base.api.shared.config.EmailService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.*;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import java.security.SecureRandom;
import java.time.*;
import java.time.format.DateTimeFormatter;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.core.env.Environment;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.*;
import org.springframework.web.util.HtmlUtils;

@Service
@RequiredArgsConstructor
public class OrganizerContractAddendumService {
    static final String VERSION = "NEXSPACE-IDENTITY-CORRECTION-1";
    private final IOrganizerContractRepository contracts;
    private final IOrganizerContractAddendumRepository addenda;
    private final IOrganizerProfileRepository profiles;
    private final IUserRepository users;
    private final OrganizerContractFiles files;
    private final OrganizerContractPdf pdf;
    private final OrganizerLifecycleAudit audit;
    private final EmailService email;
    private final PasswordEncoder encoder;
    private final Clock organizerApplicationClock;
    private final Environment environment;
    private final SecureRandom random = new SecureRandom();

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerContractAddendumResponse issue(Long actorId, Long profileId, Long contractId, String contentHash) {
        var actor = administrator(actorId);
        var profile = profiles.findByIdForLifecycleUpdate(profileId).orElseThrow(() -> new NotFoundException("Organizer application not found"));
        var base = base(profile);
        if (!Objects.equals(base.getId(), contractId) || !Objects.equals(base.getContentHash(), contentHash))
            throw new ConflictException("The agreement version changed. Reload and read the current agreement.");
        var existing = addenda.findByContractIdAndTemplateVersion(base.getId(), VERSION);
        if (existing.isPresent()) return response(existing.get(), null);
        enabled();
        OrganizerContractTemplate.requireConfiguration(environment);
        verifyBase(base, base.getSignedPdfHash());
        var item = new OrganizerContractAddendumModel();
        item.setContract(base); item.setTemplateVersion(VERSION);
        item.setAddendumNumber("NX-ADD-" + profileId + "-" + UUID.randomUUID().toString().substring(0, 8).toUpperCase(Locale.ROOT));
        item.setIssuedAt(now()); item.setIssuedBy(actorId); item.setSigningEmail(profile.getOrganizer().getEmail());
        item.setBaseSignedPdfHash(base.getSignedPdfHash());
        item.setContentSnapshot(render(item, actor));
        byte[] artifact = pdf.render(item.getContentSnapshot());
        item.setContentHash(OrganizerContractFiles.digest(artifact)); item.setOriginalPdfKey(files.store(artifact));
        addenda.saveAndFlush(item);
        audit.write(actor, profileId, "Organizer.IssueContractAddendum", Map.of("contractId", base.getId()),
                Map.of("addendumId", item.getId(), "number", item.getAddendumNumber(), "contentHash", item.getContentHash(),
                        "baseSignedPdfHash", base.getSignedPdfHash()), "Platform representative name and address encoding correction only");
        return response(item, null);
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(readOnly = true)
    public List<OrganizerContractAddendumResponse> ownerList(Long actorId) {
        var actor = owner(actorId, false);
        var profile = ownerProfile(actorId, false);
        var base = contracts.findByProfileId(profile.getId()).orElse(null);
        return base == null ? List.of() : addenda.findByContractIdOrderByIdDesc(base.getId()).stream().map(item -> response(item, actor)).toList();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public List<OrganizerContractAddendumResponse> adminList(Long actorId, Long profileId) {
        administrator(actorId);
        var profile = profiles.findById(profileId).orElseThrow(() -> new NotFoundException("Organizer application not found"));
        var base = contracts.findByProfileId(profile.getId()).orElse(null);
        return base == null ? List.of() : addenda.findByContractIdOrderByIdDesc(base.getId()).stream().map(item -> response(item, null)).toList();
    }

    @PreAuthorize("hasAnyRole('USER','ORGANIZER')")
    @Transactional(readOnly = true)
    public byte[] ownerPdf(Long actorId, Long id) {
        owner(actorId, false);
        return artifact(find(ownerProfile(actorId, false), id));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional(readOnly = true)
    public byte[] adminPdf(Long actorId, Long profileId, Long id) {
        administrator(actorId);
        return artifact(find(profiles.findById(profileId).orElseThrow(() -> new NotFoundException("Organizer application not found")), id));
    }

    @PreAuthorize("hasRole('ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public OrganizerContractAddendumResponse requestOtp(Long actorId, Long id, String hash) {
        var actor = owner(actorId, true);
        var profile = ownerProfile(actorId, true);
        var item = find(profile, id);
        identity(item, hash); pending(item, actor); enabled();
        var now = now();
        if (item.getOtpSentAt() != null && now.isBefore(item.getOtpSentAt().plusSeconds(60)))
            throw new ConflictException("Wait 60 seconds before requesting another code");
        if (item.getOtpWindowStart() == null || !now.isBefore(item.getOtpWindowStart().plusHours(1))) {
            item.setOtpWindowStart(now); item.setOtpWindowCount(0);
        }
        if (item.getOtpWindowCount() >= 5) throw new ConflictException("Email code limit reached. Try again after the one-hour window.");
        String otp = String.format(Locale.ROOT, "%06d", random.nextInt(1_000_000));
        item.setOtpHash(encoder.encode(otp)); item.setOtpExpiresAt(now.plusMinutes(10)); item.setOtpSentAt(now);
        item.setOtpAttempts(0); item.setOtpWindowCount(item.getOtpWindowCount() + 1);
        addenda.saveAndFlush(item);
        try {
            email.sendRequiredHtmlEmail(actor.getEmail(), "NexSpace — Xác nhận phụ lục đính chính",
                    "<h2>Xác nhận phụ lục " + HtmlUtils.htmlEscape(item.getAddendumNumber()) + "</h2>"
                    + "<p>Chỉ nhập mã sau khi đọc đúng phụ lục trên NexSpace. Hợp đồng gốc không bị thay thế.</p>"
                    + "<p style='font-size:32px;font-weight:bold'>" + otp + "</p>"
                    + "<p>Mã có hiệu lực 10 phút. Không cung cấp mã cho người khác. Bỏ qua nếu bạn không yêu cầu.</p>");
        } catch (IllegalStateException failure) { throw new ConflictException("Could not send the confirmation email. Try again later."); }
        return response(item, actor);
    }

    /** Profile locking serializes retries; incorrect attempts commit while artifact failures roll back. */
    @PreAuthorize("hasRole('ORGANIZER')")
    @Transactional(isolation = Isolation.READ_COMMITTED, noRollbackFor = OrganizerContractService.InvalidContractOtpException.class)
    public OrganizerContractAddendumResponse sign(Long actorId, Long id, String hash, String otp, boolean consent) {
        if (!consent) throw new BadRequestException("Confirm your authority and agreement before signing");
        var actor = owner(actorId, true);
        var profile = ownerProfile(actorId, true);
        var item = find(profile, id);
        identity(item, hash);
        if ("SIGNED".equals(item.getStatus())) return response(item, actor);
        pending(item, actor); enabled();
        if (item.getOtpHash() == null || item.getOtpExpiresAt() == null || !now().isBefore(item.getOtpExpiresAt()))
            throw new BadRequestException("The email code has expired. Request a new code.");
        if (item.getOtpAttempts() >= 5) throw new BadRequestException("This code is locked after five incorrect attempts. Request a new code.");
        if (otp == null || !otp.matches("[0-9]{6}") || !encoder.matches(otp, item.getOtpHash())) {
            item.setOtpAttempts(item.getOtpAttempts() + 1); addenda.saveAndFlush(item);
            throw new OrganizerContractService.InvalidContractOtpException("Incorrect email code. Remaining attempts: " + (5 - item.getOtpAttempts()));
        }
        verifyBase(item.getContract(), item.getBaseSignedPdfHash());
        checked(item.getOriginalPdfKey(), item.getContentHash());
        var signedAt = now();
        String receipt = item.getContentSnapshot() + "\n\nBIÊN NHẬN XÁC NHẬN PHỤ LỤC"
                + "\nNgười ký: " + clean(actor.getUserName()) + " (ID " + actorId + ")"
                + "\nEmail xác nhận: " + clean(actor.getEmail()) + "\nThời điểm UTC: " + signedAt
                + "\nPhương thức: OTP email, đồng ý nội dung và xác nhận thẩm quyền đại diện."
                + "\nSHA-256 PDF phụ lục được chấp thuận: " + item.getContentHash()
                + "\nHợp đồng gốc và bằng chứng ký trước đó được giữ nguyên.";
        byte[] signed = pdf.render(receipt);
        item.setSignedPdfKey(files.store(signed)); item.setSignedPdfHash(OrganizerContractFiles.digest(signed));
        item.setSignedAt(signedAt); item.setSignedBy(actorId); item.setStatus("SIGNED");
        item.setOtpHash(null); item.setOtpExpiresAt(null);
        addenda.saveAndFlush(item);
        audit.write(actor, profile.getId(), "Organizer.SignContractAddendum", Map.of("status", "PENDING_SIGNATURE"),
                Map.of("status", "SIGNED", "addendumId", id, "contentHash", hash, "method", "EMAIL_OTP",
                        "consent", true, "signedAt", signedAt.toString()), null);
        return response(item, actor);
    }

    private String render(OrganizerContractAddendumModel item, UserModel issuer) {
        var base = item.getContract();
        String legalName = setting("legal-name"), taxId = setting("tax-id"), title = setting("representative-title");
        String platformBlock = base.getContentSnapshot().split("BÊN ORGANIZER", 2)[0];
        if (!platformBlock.contains("Tên pháp nhân: " + legalName + "\n") || !platformBlock.contains("Mã số thuế: " + taxId + "\n")
                || !platformBlock.contains("Chức danh: " + title + "\n"))
            throw new ConflictException("This correction cannot change the platform legal entity, tax ID or title");
        if (platformBlock.contains("Người đại diện: " + setting("representative-name") + "\n")
                && platformBlock.contains("Địa chỉ: " + setting("address") + "\n"))
            throw new ConflictException("The agreement already has the correct platform name and address");
        return """
                PHỤ LỤC ĐÍNH CHÍNH THÔNG TIN NỀN TẢNG
                Mã phụ lục: %s
                Phiên bản: %s
                Phát hành: %s UTC
                Hợp đồng được tham chiếu: %s
                SHA-256 bản hợp đồng gốc đã ký: %s

                1. NỘI DUNG ĐÍNH CHÍNH
                Đính chính lỗi mã hóa dấu tiếng Việt của tên người đại diện và địa chỉ nền tảng trong hợp đồng được tham chiếu.
                Tên pháp nhân: %s
                Mã số thuế: %s
                Người đại diện: %s
                Chức danh: %s
                Địa chỉ: %s

                2. PHẠM VI
                Chỉ đính chính cách thể hiện tên và địa chỉ nêu trên. Không thay đổi các khoản phí, thuế, quyền lợi, nghĩa vụ hoặc nội dung khác. PDF, mã kiểm tra và bằng chứng ký của hợp đồng gốc được giữ nguyên.

                3. XÁC NHẬN PHÍA NỀN TẢNG
                Người phát hành: %s (tài khoản ID %s)
                Thời điểm: %s UTC
                Phương thức: Quản trị viên có quyền phát hành phụ lục trên NexSpace.

                4. XÁC NHẬN PHÍA ORGANIZER
                Đại diện theo hồ sơ: %s
                Trạng thái: CHỜ XÁC NHẬN.
                Organizer đọc nội dung, xác nhận thẩm quyền và đồng ý, sau đó nhập OTP từ email tài khoản. Biên nhận của phụ lục ghi riêng tài khoản, thời điểm và SHA-256 PDF được chấp thuận; không sao chép chữ ký hay thời điểm của hợp đồng gốc.
                Đây là xác nhận điện tử bằng OTP email, không phải chữ ký số được chứng thực bởi nhà cung cấp chứng thư số.
                """.formatted(item.getAddendumNumber(), VERSION, stamp(item.getIssuedAt()), base.getContractNumber(),
                        item.getBaseSignedPdfHash(), legalName, taxId, setting("representative-name"), title,
                        setting("address"), clean(issuer.getUserName()), issuer.getId(), stamp(item.getIssuedAt()),
                        clean(base.getProfile().getRepresentativeName()));
    }

    private OrganizerContractModel base(OrganizerProfileModel profile) {
        var base = contracts.findByProfileId(profile.getId()).orElseThrow(() -> new NotFoundException("No agreement has been issued for this application"));
        if (!"SIGNED".equals(base.getStatus()) || base.isDemo() || profile.getStatus() != OrganizerProfileStatus.APPROVED)
            throw new ConflictException("A signed managed agreement and approved profile are required for a correction");
        return base;
    }
    private OrganizerContractAddendumModel find(OrganizerProfileModel profile, Long id) {
        return addenda.findByIdAndContractId(id, base(profile).getId()).orElseThrow(() -> new NotFoundException("Contract addendum not found"));
    }
    private UserModel owner(Long actorId, boolean lock) {
        var actor = (lock ? users.findByIdForApplication(actorId) : users.findById(actorId)).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!actor.isActive() || !actor.isVerified() || (actor.getRole() != UserRole.USER && actor.getRole() != UserRole.ORGANIZER))
            throw new ForbiddenException("An active, email-verified applicant account is required");
        return actor;
    }
    private OrganizerProfileModel ownerProfile(Long actorId, boolean lock) {
        return (lock ? profiles.findByOrganizerIdForUpdate(actorId) : profiles.findByOrganizerId(actorId))
                .orElseThrow(() -> new NotFoundException("Organizer application not found"));
    }
    private UserModel administrator(Long actorId) {
        var actor = users.findById(actorId).orElseThrow(() -> new UnauthorizedException("Account not found"));
        if (!actor.isActive() || actor.getRole() != UserRole.ADMIN) throw new ForbiddenException("An active Administrator account is required");
        return actor;
    }
    private void enabled() {
        if (!environment.getProperty("app.organizer.contract.enabled", Boolean.class, false))
            throw new ConflictException("Managed agreements are not enabled");
    }
    private void identity(OrganizerContractAddendumModel item, String hash) {
        if (!Objects.equals(item.getContentHash(), hash)) throw new ConflictException("The addendum version changed. Reload and read it again.");
    }
    private void pending(OrganizerContractAddendumModel item, UserModel actor) {
        if (!"PENDING_SIGNATURE".equals(item.getStatus()) || actor.getRole() != UserRole.ORGANIZER
                || !Objects.equals(item.getSigningEmail(), actor.getEmail())) throw new ConflictException("This addendum is not available for signing");
    }
    private OrganizerContractAddendumResponse response(OrganizerContractAddendumModel item, UserModel actor) {
        boolean canSign = actor != null && actor.getRole() == UserRole.ORGANIZER && "PENDING_SIGNATURE".equals(item.getStatus())
                && item.getContract().getProfile().getStatus() == OrganizerProfileStatus.APPROVED
                && Objects.equals(item.getSigningEmail(), actor.getEmail())
                && environment.getProperty("app.organizer.contract.enabled", Boolean.class, false);
        return OrganizerContractAddendumResponse.from(item, canSign);
    }
    private byte[] checked(String key, String hash) {
        byte[] bytes = files.read(key);
        if (hash == null || !OrganizerContractFiles.digest(bytes).equals(hash)) throw new ConflictException("Contract integrity check failed");
        return bytes;
    }
    private void verifyBase(OrganizerContractModel base, String expectedHash) {
        if (expectedHash == null || !Objects.equals(base.getSignedPdfHash(), expectedHash)) throw new ConflictException("The signed agreement reference changed");
        checked(base.getOriginalPdfKey(), base.getContentHash()); checked(base.getSignedPdfKey(), expectedHash);
    }
    private byte[] artifact(OrganizerContractAddendumModel item) {
        byte[] original = checked(item.getOriginalPdfKey(), item.getContentHash());
        return item.getSignedPdfKey() == null ? original : checked(item.getSignedPdfKey(), item.getSignedPdfHash());
    }
    private String setting(String field) { return clean(environment.getRequiredProperty("app.organizer.contract.platform." + field)); }
    private static String clean(String value) { return value == null ? "" : value.replaceAll("[\\r\\n\\t]", " "); }
    private static String stamp(LocalDateTime value) { return DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm:ss").format(value); }
    private LocalDateTime now() { return LocalDateTime.ofInstant(organizerApplicationClock.instant(), ZoneOffset.UTC); }
}
