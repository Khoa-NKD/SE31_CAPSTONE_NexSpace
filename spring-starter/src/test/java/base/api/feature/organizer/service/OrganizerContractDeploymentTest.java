package base.api.feature.organizer.service;

import base.api.feature.auth.repository.*;
import base.api.feature.organizer.repository.*;
import base.api.shared.config.EmailService;
import base.api.shared.entity.*;
import base.api.shared.entity.organizer.*;
import base.api.shared.enums.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.atomic.AtomicReference;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.context.ApplicationEventPublisher;
import org.springframework.mock.env.MockEnvironment;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.mockito.ArgumentMatchers.*;

class OrganizerContractDeploymentTest {
    @Test void configuredProductionCanIssueEmailAndSignWithoutTheLocalDemoSwitch() throws Exception {
        var environment = new MockEnvironment().withProperty("app.organizer.contract.enabled", "true")
                .withProperty("app.organizer.contract.platform.legal-name", "305 NEXSPACE")
                .withProperty("app.organizer.contract.platform.tax-id", "TEST-TAX-ID")
                .withProperty("app.organizer.contract.platform.address", "Ngũ Hành Sơn, Đà Nẵng, Việt Nam")
                .withProperty("app.organizer.contract.platform.representative-name", "Nguyễn Huy Vũ")
                .withProperty("app.organizer.contract.platform.representative-title", "CEO");
        environment.setActiveProfiles("production");
        var repository = mock(IOrganizerContractRepository.class);
        var profiles = mock(IOrganizerProfileRepository.class);
        var users = mock(IUserRepository.class);
        var roles = mock(IRoleRepository.class);
        var files = mock(OrganizerContractFiles.class);
        var email = mock(EmailService.class);
        var holder = new AtomicReference<OrganizerContractModel>();
        Map<String, byte[]> artifacts = new HashMap<>();
        when(repository.findByProfileId(10L)).thenAnswer(call -> Optional.ofNullable(holder.get()));
        when(repository.saveAndFlush(any())).thenAnswer(call -> {
            var contract = call.getArgument(0, OrganizerContractModel.class);
            contract.setId(100L); holder.set(contract); return contract;
        });
        when(files.store(any())).thenAnswer(call -> {
            String key = UUID.randomUUID() + ".pdf"; artifacts.put(key, call.getArgument(0)); return key;
        });
        when(files.read(anyString())).thenAnswer(call -> artifacts.get(call.getArgument(0)));
        var owner = new UserModel(); owner.setId(12L); owner.setUserName("owner-test");
        owner.setEmail("owner@example.test"); owner.setVerified(true); owner.setStatus(UserStatus.ACTIVE);
        owner.setRoleEntity(new RoleModel("USER", null));
        var reviewer = new UserModel(); reviewer.setId(1L); reviewer.setUserName("reviewer-test");
        var profile = new OrganizerProfileModel(); profile.setId(10L); profile.setOrganizer(owner);
        profile.setStatus(OrganizerProfileStatus.CONTRACT_PENDING); profile.setLegalName("Organizer kiểm thử");
        profile.setRepresentativeName("Người Ký Mẫu"); profile.setTaxId("TEST-ORGANIZER-TAX");
        profile.setReviewedBy(reviewer); profile.setReviewedAt(LocalDateTime.parse("2026-11-20T01:00:00"));
        when(users.findById(12L)).thenReturn(Optional.of(owner));
        when(users.findByIdForApplication(12L)).thenReturn(Optional.of(owner));
        when(profiles.findByOrganizerId(12L)).thenReturn(Optional.of(profile));
        when(profiles.findByOrganizerIdForUpdate(12L)).thenReturn(Optional.of(profile));
        when(roles.findByNameForOrganizerApproval("ORGANIZER")).thenReturn(Optional.of(new RoleModel("ORGANIZER", null)));
        var service = new OrganizerContractService(repository, profiles, users, roles, files, new OrganizerContractPdf(),
                mock(OrganizerLifecycleAudit.class), email, new BCryptPasswordEncoder(4),
                Clock.fixed(Instant.parse("2026-11-20T01:00:00Z"), ZoneOffset.UTC),
                mock(ApplicationEventPublisher.class), environment, false);

        service.issue(profile);
        var contract = holder.get();
        assertThat(contract.isDemo()).isFalse();
        assertThat(contract.getTemplateVersion()).isEqualTo("NEXSPACE-OTP-1");
        assertThat(contract.getContentSnapshot())
                .contains("10% tổng giá trị hóa đơn đã bao gồm VAT", "NexSpace nhận 11.000 đồng", "Organizer nhận 99.000 đồng")
                .doesNotContain("10% tiền thuê cơ bản chưa VAT");
        assertThat(service.current(12L).canSign()).isTrue();
        service.requestOtp(12L, contract.getId(), contract.getContentHash());
        var html = ArgumentCaptor.forClass(String.class);
        verify(email).sendRequiredHtmlEmail(eq(owner.getEmail()), anyString(), html.capture());
        var otp = java.util.regex.Pattern.compile(">([0-9]{6})</p>").matcher(html.getValue());
        assertThat(otp.find()).isTrue();
        var signed = service.sign(12L, contract.getId(), contract.getContentHash(), otp.group(1), true);
        assertThat(signed.status()).isEqualTo("SIGNED");
        assertThat(signed.canSign()).isFalse();
        assertThat(owner.getRole()).isEqualTo(UserRole.ORGANIZER);
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.APPROVED);
        assertThat(contract.getOtpHash()).isNull();
        assertThat(contract.getSignedBy()).isEqualTo(12L);
        try (var document = org.apache.pdfbox.Loader.loadPDF(files.read(contract.getSignedPdfKey()))) {
            assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(document).replaceAll("\\s+", " "))
                    .contains("reviewer-test", "Người Ký Mẫu", "owner-test", "OTP email", "SHA-256");
        }
    }

    @Test void missingPlatformTaxIdPreventsIssuanceBeforeAnyStorageOrDatabaseWrite() {
        var environment = new MockEnvironment().withProperty("app.organizer.contract.platform.legal-name", "305 NEXSPACE");
        assertThatThrownBy(() -> OrganizerContractTemplate.requireConfiguration(environment))
                .isInstanceOf(base.api.shared.exception.ConflictException.class).hasMessageContaining("tax-id");
    }
}
