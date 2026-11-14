package base.api.feature.organizer.service;

import base.api.feature.auth.repository.*;
import base.api.feature.governance.repository.IAuditLogRepository;
import base.api.feature.organizer.dto.request.OrganizerLifecycleRequests.*;
import base.api.feature.organizer.dto.response.OrganizerLifecycleContext;
import base.api.feature.organizer.repository.*;
import base.api.shared.entity.*;
import base.api.shared.entity.organizer.*;
import base.api.shared.entity.governance.AuditLogModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.*;
import jakarta.validation.Validator;
import jakarta.validation.Validation;
import org.hibernate.SessionFactory;
import org.junit.jupiter.api.*;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.context.annotation.*;
import org.springframework.data.jpa.repository.support.JpaRepositoryFactory;
import org.springframework.orm.jpa.*;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.transaction.*;
import org.springframework.transaction.annotation.EnableTransactionManagement;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.mock.web.MockMultipartFile;
import java.nio.file.*;
import java.time.*;
import java.util.*;
import java.util.concurrent.*;
import static org.assertj.core.api.Assertions.*;

/** Real transactions and competing threads on H2 only; never starts the application or loads Local properties. */
class OrganizerLifecycleDatabaseTest {
    @TempDir static Path files;
    static AnnotationConfigApplicationContext context;
    static TransactionTemplate tx;
    static EntityManager em;
    static OrganizerApplicationLifecycleService service;
    static volatile boolean failAudit;
    static Long adminId, ownerId, profileId, documentId;
    static final LocalDateTime TIME = LocalDateTime.of(2026, 11, 5, 0, 0);

    @Configuration @EnableTransactionManagement @EnableMethodSecurity
    static class DatabaseConfiguration {
        @Bean base.api.shared.config.EmailService emailService() {
            return org.mockito.Mockito.mock(base.api.shared.config.EmailService.class);
        }
        @Bean OrganizerReviewEmailNotification reviewEmails(base.api.shared.config.EmailService emailService) {
            return new OrganizerReviewEmailNotification(emailService, "http://localhost:3000");
        }
        @Bean(destroyMethod="close") SessionFactory entityManagerFactory() {
            String url = "jdbc:h2:mem:organizer_lifecycle_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000";
            if (!url.startsWith("jdbc:h2:mem:")) throw new IllegalStateException("Only isolated in-memory tests are allowed");
            return new org.hibernate.cfg.Configuration().addAnnotatedClass(UserModel.class).addAnnotatedClass(RoleModel.class)
                    .addAnnotatedClass(OrganizerProfileModel.class).addAnnotatedClass(OrganizerDocumentModel.class).addAnnotatedClass(AuditLogModel.class)
                    .addAnnotatedClass(OrganizerContractModel.class)
                    .setProperty("hibernate.connection.driver_class", "org.h2.Driver")
                    .setProperty("hibernate.connection.url", url).setProperty("hibernate.connection.username", "sa")
                    .setProperty("hibernate.connection.password", "").setProperty("hibernate.hbm2ddl.auto", "create-drop")
                    .setProperty("hibernate.connection.handling_mode", "DELAYED_ACQUISITION_AND_HOLD")
                    .setProperty("hibernate.connection.pool_size", "8").setProperty("hibernate.show_sql", "false").buildSessionFactory();
        }
        @Bean PlatformTransactionManager transactionManager(EntityManagerFactory factory) {
            var manager = new JpaTransactionManager(factory);
            manager.setJpaDialect(new org.springframework.orm.jpa.vendor.HibernateJpaDialect());
            return manager;
        }
        @Bean EntityManager entityManager(EntityManagerFactory factory) { return SharedEntityManagerCreator.createSharedEntityManager(factory); }
        @Bean IUserRepository users(EntityManager em) { return new JpaRepositoryFactory(em).getRepository(IUserRepository.class); }
        @Bean IRoleRepository roles(EntityManager em) { return new JpaRepositoryFactory(em).getRepository(IRoleRepository.class); }
        @Bean IOrganizerProfileRepository profiles(EntityManager em) { return new JpaRepositoryFactory(em).getRepository(IOrganizerProfileRepository.class); }
        @Bean OrganizerPartnerService partners(IOrganizerProfileRepository profiles, IUserRepository users,
                OrganizerLifecycleAudit audit, org.springframework.context.ApplicationEventPublisher events) {
            return new OrganizerPartnerService(profiles, users,
                    org.mockito.Mockito.mock(base.api.feature.workspace.repository.IWorkspaceRepository.class),
                    org.mockito.Mockito.mock(base.api.feature.booking.repository.IBookingRepository.class), audit, events);
        }
        @Bean IOrganizerDocumentRepository documents(EntityManager em) { return new JpaRepositoryFactory(em).getRepository(IOrganizerDocumentRepository.class); }
        @Bean IOrganizerContractRepository contracts(EntityManager em) { return new JpaRepositoryFactory(em).getRepository(IOrganizerContractRepository.class); }
        @Bean OrganizerContractService contractService(IOrganizerContractRepository contracts, IOrganizerProfileRepository profiles,
                IUserRepository users, IRoleRepository roles, OrganizerLifecycleAudit audit,
                base.api.shared.config.EmailService email, Clock clock, org.springframework.context.ApplicationEventPublisher events) {
            var environment = new org.springframework.mock.env.MockEnvironment(); environment.setActiveProfiles("local");
            return new OrganizerContractService(contracts, profiles, users, roles,
                    new OrganizerContractFiles(files.resolve("contracts").toString()), new OrganizerContractPdf(), audit, email,
                    new org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder(4), clock, events, environment, true);
        }
        @Bean IAuditLogRepository records(EntityManager em) {
            return new JpaRepositoryFactory(em).getRepository(IAuditLogRepository.class);
        }
        @Bean ObjectMapper mapper() { return new ObjectMapper().findAndRegisterModules(); }
        @Bean Validator validator() { return Validation.buildDefaultValidatorFactory().getValidator(); }
        @Bean Clock organizerApplicationClock() { return Clock.fixed(TIME.toInstant(ZoneOffset.UTC), ZoneOffset.UTC); }
        @Bean PrivateOrganizerDocumentStorage storage() { return new PrivateOrganizerDocumentStorage(files.toString()); }
        @Bean OrganizerLifecycleAudit audit(IAuditLogRepository records, ObjectMapper mapper, EntityManager em) {
            return new OrganizerLifecycleAudit(records, mapper) {
                @Override public void write(UserModel actor, Long profileId, String action, Object before, Object after, String reason) {
                    if (failAudit) { em.flush(); throw new IllegalStateException("isolated audit failure"); }
                    super.write(actor, profileId, action, before, after, reason);
                }
            };
        }
        @Bean OrganizerApplicationLifecycleService service(IUserRepository users, IRoleRepository roles,
                IOrganizerProfileRepository profiles, IOrganizerDocumentRepository documents, PrivateOrganizerDocumentStorage storage,
                OrganizerLifecycleAudit audit, Validator validator, Clock clock, org.springframework.context.ApplicationEventPublisher events,
                OrganizerContractService contracts) {
            return new OrganizerApplicationLifecycleService(users, roles, profiles, documents, storage, audit, validator, clock, events, contracts);
        }
    }
    @BeforeAll static void start() {
        context = new AnnotationConfigApplicationContext(DatabaseConfiguration.class);
        tx = new TransactionTemplate(context.getBean(PlatformTransactionManager.class));
        em = context.getBean(EntityManager.class); service = context.getBean(OrganizerApplicationLifecycleService.class);
    }
    @AfterAll static void close() { if (context != null) context.close(); }
    static void authentication(String role) {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("test-actor", "unused",
                AuthorityUtils.createAuthorityList("ROLE_" + role)));
    }
    @AfterEach void clearAuthentication() { SecurityContextHolder.clearContext(); }
    @BeforeEach void seedIsolatedDatabase() {
        org.mockito.Mockito.reset(context.getBean(base.api.shared.config.EmailService.class));
        failAudit = false; authentication("ADMIN");
        tx.executeWithoutResult(status -> {
            for (String entity : List.of("AuditLogModel", "OrganizerContractModel", "OrganizerDocumentModel", "OrganizerProfileModel", "UserModel", "RoleModel"))
                em.createQuery("delete from " + entity).executeUpdate();
            var userRole = new RoleModel("USER", null); var adminRole = new RoleModel("ADMIN", null);
            em.persist(userRole); em.persist(adminRole); em.persist(new RoleModel("ORGANIZER", null));
            var admin = account("admin", adminRole); var owner = account("owner", userRole);
            em.persist(admin); em.persist(owner); em.flush(); adminId = admin.getId(); ownerId = owner.getId();
            var profile = profile(owner, "0400000123"); em.persist(profile); em.flush(); profileId = profile.getId();
            var document = new OrganizerDocumentModel(); document.setOrganizerProfile(profile);
            document.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE); document.setFileName("license.pdf");
            document.setFileUrl("11111111-1111-1111-1111-111111111111.pdf"); em.persist(document); em.flush(); documentId = document.getId();
        });
    }
    static UserModel account(String name, RoleModel role) {
        var user = new UserModel(); user.setUserName(name); user.setEmail(name + "@example.test"); user.setPassword("isolated-test-hash");
        user.setVerified(true); user.setRoleEntity(role); return user;
    }
    static OrganizerProfileModel profile(UserModel owner, String taxId) {
        var p = new OrganizerProfileModel(); p.setOrganizer(owner); p.setStatus(OrganizerProfileStatus.PENDING_REVIEW);
        p.setLegalName("Test Workspace Company"); p.setBusinessType(BusinessType.LIMITED_LIABILITY); p.setTaxId(taxId);
        p.setRepresentativeName("Test Representative"); p.setAddress("12 Test Street"); p.setContactPhone("0900000123");
        p.setContactEmail("business@example.test"); p.setRegistrationReason("Provide flexible workspaces for local companies."); p.setSubmittedAt(TIME); return p;
    }
    Approval approval(long revision) { return new Approval(revision, true, List.of(documentId), "Documents checked and consistent"); }
    long events() { return tx.execute(status -> em.createQuery("select count(a) from AuditLogModel a", Long.class).getSingleResult()); }

    OrganizerContractService agreements() { return context.getBean(OrganizerContractService.class); }

    @Test void partnerSuspensionAndRestorePreserveApprovalAndRecordBothDecisions() {
        var partners = context.getBean(OrganizerPartnerService.class);
        tx.executeWithoutResult(status -> {
            var profile = em.find(OrganizerProfileModel.class, profileId);
            profile.setStatus(OrganizerProfileStatus.APPROVED);
            profile.getOrganizer().setRoleEntity(em.createQuery(
                    "select r from RoleModel r where r.name = 'ORGANIZER'", RoleModel.class).getSingleResult());
        });
        var request = new base.api.shared.dto.PageRequestDTO();
        request.setSearch("OWNER@example.test");
        assertThat(partners.list(adminId, request, false).getContent()).hasSize(1);
        assertThatThrownBy(() -> partners.detail(ownerId, ownerId)).isInstanceOf(ForbiddenException.class);

        var paused = partners.change(adminId, ownerId, new Reason(0L, "Policy review"), true);
        assertThat(paused.partner().suspended()).isTrue();
        assertThat(partners.status(ownerId).reason()).isEqualTo("Policy review");
        assertThat(partners.list(adminId, request, false).getContent()).isEmpty();
        assertThatThrownBy(() -> partners.change(adminId, ownerId, new Reason(0L, "Stale"), false))
                .isInstanceOf(ConflictException.class);

        var restored = partners.change(adminId, ownerId, new Reason(paused.revision(), "Review completed"), false);
        assertThat(restored.partner().suspended()).isFalse();
        assertThat(events()).isEqualTo(2);
        var approvalStatus = tx.execute(status -> em.find(OrganizerProfileModel.class, profileId).getStatus());
        assertThat(approvalStatus).isEqualTo(OrganizerProfileStatus.APPROVED);
    }
    base.api.feature.organizer.dto.response.OrganizerContractResponse issueAgreement() {
        service.approve(adminId, profileId, approval(0)); authentication("USER");
        return agreements().current(ownerId);
    }
    String sendCode(base.api.feature.organizer.dto.response.OrganizerContractResponse contract) {
        agreements().requestOtp(ownerId, contract.id(), contract.contentHash());
        var body = org.mockito.ArgumentCaptor.forClass(String.class);
        org.mockito.Mockito.verify(context.getBean(base.api.shared.config.EmailService.class))
                .sendRequiredHtmlEmail(org.mockito.ArgumentMatchers.eq("owner@example.test"), org.mockito.ArgumentMatchers.anyString(), body.capture());
        var matcher = java.util.regex.Pattern.compile(">(\\d{6})</p>").matcher(body.getValue());
        if (!matcher.find()) throw new AssertionError("Verification email must contain a six-digit code");
        return matcher.group(1);
    }

    @Test void signedAgreementActivatesOwnerAtomicallyAndRetriesAreIdempotent() throws Exception {
        var contract = issueAgreement();
        String code = sendCode(contract);
        var result = agreements().sign(ownerId, contract.id(), contract.contentHash(), code, true);
        assertThat(result.status()).isEqualTo("SIGNED"); assertThat(result.signedAt()).isEqualTo(TIME);
        assertThat(agreements().sign(ownerId, contract.id(), contract.contentHash(), code, true).id()).isEqualTo(contract.id());
        assertThat(events()).isEqualTo(2);
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerProfileModel.class, profileId).getStatus()).isEqualTo(OrganizerProfileStatus.APPROVED);
            assertThat(em.find(UserModel.class, ownerId).getRole()).isEqualTo(UserRole.ORGANIZER);
            assertThat(em.find(OrganizerContractModel.class, contract.id()).getOtpHash()).isNull();
        });
        try (var document = org.apache.pdfbox.Loader.loadPDF(agreements().ownerPdf(ownerId))) {
            assertThat(new org.apache.pdfbox.text.PDFTextStripper().getText(document))
                    .contains("HỢP ĐỒNG HỢP TÁC", "BIÊN NHẬN", contract.contentHash());
        }
    }

    @Test void incorrectOtpAttemptsCommitAndLockAfterFiveFailures() {
        var contract = issueAgreement(); String code = sendCode(contract);
        String incorrect = code.equals("000000") ? "111111" : "000000";
        for (int attempt = 0; attempt < 5; attempt++)
            assertThatThrownBy(() -> agreements().sign(ownerId, contract.id(), contract.contentHash(), incorrect, true))
                    .isInstanceOf(OrganizerContractService.InvalidContractOtpException.class);
        assertThatThrownBy(() -> agreements().sign(ownerId, contract.id(), contract.contentHash(), code, true))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("locked");
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerContractModel.class, contract.id()).getOtpAttempts()).isEqualTo(5);
            assertThat(em.find(UserModel.class, ownerId).getRole()).isEqualTo(UserRole.USER);
        });
        assertThat(events()).isEqualTo(1);
    }

    @Test void consentVersionExpiryAndOtherOwnersCannotSign() {
        var contract = issueAgreement(); String code = sendCode(contract);
        assertThatThrownBy(() -> agreements().sign(ownerId, contract.id(), contract.contentHash(), code, false)).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> agreements().sign(ownerId, contract.id(), "0".repeat(64), code, true)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> agreements().sign(ownerId, contract.id() + 1, contract.contentHash(), code, true)).isInstanceOf(ConflictException.class);
        tx.executeWithoutResult(status -> em.find(OrganizerContractModel.class, contract.id()).setOtpExpiresAt(TIME));
        assertThatThrownBy(() -> agreements().sign(ownerId, contract.id(), contract.contentHash(), code, true))
                .isInstanceOf(BadRequestException.class).hasMessageContaining("expired");
        Long foreign = tx.execute(status -> { var account = account("foreign", em.find(UserModel.class, ownerId).getRoleEntity()); em.persist(account); em.flush(); return account.getId(); });
        assertThatThrownBy(() -> agreements().current(foreign)).isInstanceOf(NotFoundException.class);
        assertThat(events()).isEqualTo(1);
    }

    @Test void resendCooldownAndHourlyLimitAreEnforced() {
        var contract = issueAgreement(); sendCode(contract);
        assertThatThrownBy(() -> agreements().requestOtp(ownerId, contract.id(), contract.contentHash())).isInstanceOf(ConflictException.class).hasMessageContaining("60 seconds");
        tx.executeWithoutResult(status -> { var c = em.find(OrganizerContractModel.class, contract.id()); c.setOtpSentAt(TIME.minusMinutes(2)); c.setOtpWindowCount(5); });
        assertThatThrownBy(() -> agreements().requestOtp(ownerId, contract.id(), contract.contentHash())).isInstanceOf(ConflictException.class).hasMessageContaining("limit");
    }

    @Test void smtpFailureDoesNotPersistAnUndeliverableOtp() {
        var contract = issueAgreement();
        org.mockito.Mockito.doThrow(new IllegalStateException("Email could not be delivered"))
                .when(context.getBean(base.api.shared.config.EmailService.class)).sendRequiredHtmlEmail(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        assertThatThrownBy(() -> agreements().requestOtp(ownerId, contract.id(), contract.contentHash())).isInstanceOf(ConflictException.class);
        tx.executeWithoutResult(status -> { var c = em.find(OrganizerContractModel.class, contract.id()); assertThat(c.getOtpHash()).isNull(); assertThat(c.getOtpWindowCount()).isZero(); });
    }

    @Test void signingAuditFailureRollsBackRoleContractAndProfile() {
        var contract = issueAgreement(); String code = sendCode(contract); failAudit = true;
        assertThatThrownBy(() -> agreements().sign(ownerId, contract.id(), contract.contentHash(), code, true)).isInstanceOf(IllegalStateException.class);
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerContractModel.class, contract.id()).getStatus()).isEqualTo("PENDING_SIGNATURE");
            assertThat(em.find(OrganizerContractModel.class, contract.id()).getSignedPdfKey()).isNull();
            assertThat(em.find(OrganizerProfileModel.class, profileId).getStatus()).isEqualTo(OrganizerProfileStatus.CONTRACT_PENDING);
            assertThat(em.find(UserModel.class, ownerId).getRole()).isEqualTo(UserRole.USER);
        });
        assertThat(events()).isEqualTo(1);
    }

    @Test void concurrentSigningCreatesOneSignatureAndOneActivationAudit() throws Exception {
        var contract = issueAgreement(); String code = sendCode(contract);
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        Callable<String> sign = () -> { authentication("USER"); start.await(); try { return agreements().sign(ownerId, contract.id(), contract.contentHash(), code, true).status(); } finally { SecurityContextHolder.clearContext(); } };
        try { var a = pool.submit(sign); var b = pool.submit(sign); start.countDown(); assertThat(a.get(15, TimeUnit.SECONDS)).isEqualTo("SIGNED"); assertThat(b.get(15, TimeUnit.SECONDS)).isEqualTo("SIGNED"); assertThat(events()).isEqualTo(2); }
        finally { pool.shutdownNow(); }
    }

    @Test void documentApprovalIssuesAgreementWithoutGrantingOrganizerAccess() {
        var result = service.approve(adminId, profileId, approval(0));
        org.mockito.Mockito.verify(context.getBean(base.api.shared.config.EmailService.class))
                .sendHtmlEmail(org.mockito.ArgumentMatchers.eq("owner@example.test"),
                        org.mockito.ArgumentMatchers.contains("mời xác nhận"),
                        org.mockito.ArgumentMatchers.contains("%2Forganizer%2Fapply"));
        assertThat(result.status()).isEqualTo(OrganizerProfileStatus.CONTRACT_PENDING); assertThat(result.canSuspend()).isFalse();
        tx.executeWithoutResult(status -> {
            var p = em.find(OrganizerProfileModel.class, profileId);
            assertThat(p.getOrganizer().getRole()).isEqualTo(UserRole.USER);
            assertThat(p.getReviewedBy().getId()).isEqualTo(adminId); assertThat(p.getReviewedAt()).isEqualTo(TIME);
            assertThat(em.find(OrganizerDocumentModel.class, documentId).getStatus()).isEqualTo(OrganizerDocumentStatus.VERIFIED);
        });
        assertThat(events()).isEqualTo(1);
        assertThatThrownBy(() -> service.approve(adminId, profileId, approval(result.revision()))).isInstanceOf(ConflictException.class);
        assertThat(events()).isEqualTo(1);
    }

    @Test void selfReviewAndInvalidLifecycleStatesCannotWrite() {
        tx.executeWithoutResult(status -> em.find(OrganizerProfileModel.class, profileId).setOrganizer(em.find(UserModel.class,adminId)));
        assertThatThrownBy(() -> service.approve(adminId,profileId,approval(0))).isInstanceOf(ForbiddenException.class);
        tx.executeWithoutResult(status -> em.find(OrganizerProfileModel.class, profileId).setOrganizer(em.find(UserModel.class,ownerId)));
        assertThat(service.adminContext(adminId, profileId).canSuspend()).isFalse();
        authentication("USER");
        assertThatThrownBy(() -> service.resubmit(ownerId,new Revision(0L))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.reject(adminId,profileId,new Rejection(0L,"Unauthorized"))).isInstanceOf(org.springframework.security.access.AccessDeniedException.class);
        assertThat(events()).isZero();
    }

    @Test void requestedDocumentChangesCannotModifyBusinessInformation() {
        tx.executeWithoutResult(status -> { var profile=em.find(OrganizerProfileModel.class,profileId); profile.setStatus(OrganizerProfileStatus.REVISION_REQUESTED); profile.setReviewFeedback("Replace the license"); });
        authentication("USER");
        var input=new base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest("Changed company",BusinessType.OTHER,"0400000123","Changed owner","Changed address","0900000123","changed@example.test", "Changed reason");
        assertThatThrownBy(() -> service.saveCorrection(ownerId,new Correction(0L,input))).isInstanceOf(ConflictException.class);
        tx.executeWithoutResult(status -> {
            var profile=em.find(OrganizerProfileModel.class,profileId);
            assertThat(profile.getLegalName()).isEqualTo("Test Workspace Company");
            assertThat(profile.getBusinessType()).isEqualTo(BusinessType.LIMITED_LIABILITY);
            assertThat(profile.getAddress()).isEqualTo("12 Test Street");
            assertThat(profile.getReviewFeedback()).isEqualTo("Replace the license");
        });
        assertThat(events()).isZero();
    }

    @Test void legacyPendingApplicationCanBeApprovedWithoutFabricatingAReason() {
        tx.executeWithoutResult(status -> em.find(OrganizerProfileModel.class,profileId).setRegistrationReason(null));
        assertThat(service.approve(adminId,profileId,approval(0)).status()).isEqualTo(OrganizerProfileStatus.CONTRACT_PENDING);
        tx.executeWithoutResult(status -> assertThat(em.find(OrganizerProfileModel.class,profileId).getRegistrationReason()).isNull());
    }

    @Test void resubmissionRequiresReasonAndKeepsRevisionRequestUnchanged() {
        var rejected=requestDocumentChanges("Clarify the application");
        tx.executeWithoutResult(status -> em.find(OrganizerProfileModel.class,profileId).setRegistrationReason(null));
        authentication("USER");
        assertThatThrownBy(() -> service.resubmit(ownerId,new Revision(rejected.revision())))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, failure -> assertThat(failure.getErrors()).containsKey("registrationReason"));
        tx.executeWithoutResult(status -> assertThat(em.find(OrganizerProfileModel.class,profileId).getStatus()).isEqualTo(OrganizerProfileStatus.REVISION_REQUESTED));
        assertThat(events()).isEqualTo(1);
    }
    @Test void auditFailureRollsBackAlreadyFlushedRoleProfileAndDocumentChanges() {
        failAudit = true;
        assertThatThrownBy(() -> service.approve(adminId, profileId, approval(0))).isInstanceOf(IllegalStateException.class);
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerProfileModel.class, profileId).getStatus()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
            assertThat(em.find(UserModel.class, ownerId).getRole()).isEqualTo(UserRole.USER);
            assertThat(em.find(OrganizerDocumentModel.class, documentId).getStatus()).isEqualTo(OrganizerDocumentStatus.PENDING);
        });
        assertThat(events()).isZero();
        org.mockito.Mockito.verifyNoInteractions(context.getBean(base.api.shared.config.EmailService.class));
    }

    @Test void decisionEventIsNotDeliveredBeforeCommitOrAfterOuterRollback() {
        var email = context.getBean(base.api.shared.config.EmailService.class);
        tx.executeWithoutResult(status -> {
            service.approve(adminId, profileId, approval(0));
            org.mockito.Mockito.verifyNoInteractions(email);
            status.setRollbackOnly();
        });
        org.mockito.Mockito.verifyNoInteractions(email);
        tx.executeWithoutResult(status -> assertThat(em.find(OrganizerProfileModel.class, profileId).getStatus())
                .isEqualTo(OrganizerProfileStatus.PENDING_REVIEW));
    }
    @Test void requestedChangesRequireReplacementBeforeResubmissionAndRejectStaleReview() {
        var rejected = requestDocumentChanges("Please clarify the business address");
        assertThat(rejected.status()).isEqualTo(OrganizerProfileStatus.REVISION_REQUESTED);
        authentication("USER");
        assertThat(service.ownerContext(ownerId).canCorrect()).isTrue();
        assertThatThrownBy(() -> service.resubmit(ownerId, new Revision(rejected.revision()))).isInstanceOf(OrganizerApplicationValidationException.class);
        var replacement = service.correctDocument(ownerId, rejected.revision(), OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("corrected.pdf"));
        var submitted = service.resubmit(ownerId, new Revision(replacement.revision()));
        assertThat(submitted.id()).isEqualTo(profileId);
        assertThat(submitted.status()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
        tx.executeWithoutResult(status -> {
            var p = em.find(OrganizerProfileModel.class, profileId);
            assertThat(p.getSubmittedAt()).isEqualTo(TIME); assertThat(p.getReviewedAt()).isNull();
            assertThat(p.getReviewFeedback()).isNull(); assertThat(p.getOrganizer().getRole()).isEqualTo(UserRole.USER);
            assertThat(em.createQuery("select count(p) from OrganizerProfileModel p", Long.class).getSingleResult()).isEqualTo(1);
        });
        authentication("ADMIN");
        assertThatThrownBy(() -> service.approve(adminId, profileId, approval(0))).isInstanceOf(ConflictException.class);
        assertThat(events()).isEqualTo(3);
    }
    @Test void invalidReasonOrUnconfirmedDocumentsWriteNothing() {
        assertThatThrownBy(() -> service.reject(adminId, profileId, new Rejection(0L, "  "))).isInstanceOf(OrganizerApplicationValidationException.class);
        assertThatThrownBy(() -> service.approve(adminId, profileId, new Approval(0L, false, List.of(documentId), null))).isInstanceOf(ConflictException.class);
        assertThat(events()).isZero();
    }

    @Test void requestChangesStoresRequiredDocumentReasonsAndProfileSummary() {
        Long secondDocument = tx.execute(status -> {
            var document=new OrganizerDocumentModel();document.setOrganizerProfile(em.find(OrganizerProfileModel.class,profileId));
            document.setDocumentType(OrganizerDocumentType.ID_CARD_FRONT);document.setFileName("identity.png");
            document.setFileUrl("22222222-2222-2222-2222-222222222222.png");em.persist(document);em.flush();return document.getId();
        });
        service.requestChanges(adminId,profileId,new Rejection(0L,"Please clarify the documents",List.of(
                new DocumentFeedback(documentId," License image is blurry "),new DocumentFeedback(secondDocument,"Identity card is cropped"))));
        org.mockito.Mockito.verify(context.getBean(base.api.shared.config.EmailService.class))
                .sendHtmlEmail(org.mockito.ArgumentMatchers.eq("owner@example.test"),
                        org.mockito.ArgumentMatchers.contains("cần bổ sung"),
                        org.mockito.ArgumentMatchers.argThat(html -> html.contains("License image is blurry")
                                && html.contains("Identity card is cropped") && html.contains("%2Forganizer%2Fapply")));
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerProfileModel.class,profileId).getReviewFeedback()).isEqualTo("Please clarify the documents");
            assertThat(em.find(OrganizerDocumentModel.class,documentId).getAdminFeedback()).isEqualTo("License image is blurry");
            assertThat(em.find(OrganizerDocumentModel.class,secondDocument).getAdminFeedback()).isEqualTo("Identity card is cropped");
            assertThat(em.find(OrganizerDocumentModel.class,documentId).getStatus()).isEqualTo(OrganizerDocumentStatus.REJECTED);
            assertThat(em.find(UserModel.class,ownerId).getRole()).isEqualTo(UserRole.USER);
        });
        assertThat(events()).isEqualTo(1);
    }

    @Test void requestedChangesRollBackWhenAuditFails() {
        tx.executeWithoutResult(status -> em.find(OrganizerDocumentModel.class,documentId).setAdminFeedback("Keep previous note"));
        failAudit=true;
        assertThatThrownBy(() -> service.requestChanges(adminId,profileId,new Rejection(0L,"Correct the license",List.of(new DocumentFeedback(documentId,"New note"))))).isInstanceOf(IllegalStateException.class);
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerProfileModel.class,profileId).getStatus()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
            assertThat(em.find(OrganizerProfileModel.class,profileId).getReviewFeedback()).isNull();
            assertThat(em.find(OrganizerDocumentModel.class,documentId).getAdminFeedback()).isEqualTo("Keep previous note");
        });
        assertThat(events()).isZero();
    }

    @Test void requestChangesCannotTargetPreviousForeignOrDuplicateDocuments() {
        Long[] invalidDocuments=tx.execute(status -> {
            var previous=new OrganizerDocumentModel();previous.setOrganizerProfile(em.find(OrganizerProfileModel.class,profileId));
            previous.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE);previous.setFileName("old.pdf");previous.setFileUrl("old-reference");previous.setCurrent(false);em.persist(previous);
            var foreignProfile=profile(em.find(UserModel.class,adminId),"0400000999");em.persist(foreignProfile);
            var foreign=new OrganizerDocumentModel();foreign.setOrganizerProfile(foreignProfile);foreign.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE);foreign.setFileName("foreign.pdf");foreign.setFileUrl("foreign-reference");em.persist(foreign);em.flush();
            return new Long[]{previous.getId(),foreign.getId()};
        });
        for(Long id:invalidDocuments)assertThatThrownBy(() -> service.requestChanges(adminId,profileId,new Rejection(0L,"Clarify documents",List.of(new DocumentFeedback(id,"Invalid target"))))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.requestChanges(adminId,profileId,new Rejection(0L,"Clarify documents",List.of(new DocumentFeedback(documentId,"One"),new DocumentFeedback(documentId,"Two"))))).isInstanceOf(BadRequestException.class);
        assertThat(events()).isZero();
        tx.executeWithoutResult(status -> assertThat(em.find(OrganizerProfileModel.class,profileId).getStatus()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW));
    }
    @Test void approvedProfileHasNoSuspensionCapability() {
        var approved = service.approve(adminId, profileId, approval(0));
        assertThat(approved.canSuspend()).isFalse();
        assertThat(approved.suspended()).isFalse();
        assertThat(approved.status()).isEqualTo(OrganizerProfileStatus.CONTRACT_PENDING);
        tx.executeWithoutResult(status -> assertThat(em.find(UserModel.class, ownerId).getRole()).isEqualTo(UserRole.USER));
        assertThat(events()).isEqualTo(1);
    }
    @Test void concurrentApprovalAndRejectionProduceExactlyOneDecision() throws Exception {
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        try {
            Callable<Boolean> approve = () -> { authentication("ADMIN"); start.await(); try { service.approve(adminId, profileId, approval(0)); return true; } catch (ConflictException expected) { return false; } finally { SecurityContextHolder.clearContext(); } };
            Callable<Boolean> reject = () -> { authentication("ADMIN"); start.await(); try { service.reject(adminId, profileId, new Rejection(0L, "Correction required")); return true; } catch (ConflictException expected) { return false; } finally { SecurityContextHolder.clearContext(); } };
            var a = pool.submit(approve); var b = pool.submit(reject); start.countDown();
            assertThat((a.get(15, TimeUnit.SECONDS) ? 1 : 0) + (b.get(15, TimeUnit.SECONDS) ? 1 : 0)).isEqualTo(1);
            assertThat(events()).isEqualTo(1);
        } finally { pool.shutdownNow(); }
    }

    @Test void draftReplacementRetainsVersionAndCannotSubmitOrReplaceAfterSubmission() {
        tx.executeWithoutResult(status -> {
            var profile = em.find(OrganizerProfileModel.class, profileId);
            profile.setStatus(OrganizerProfileStatus.DRAFT); profile.setSubmittedAt(null);
        });
        authentication("USER");
        var saved = service.correctDocument(ownerId, 0L, OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("draft.pdf"));
        assertThat(saved.status()).isEqualTo(OrganizerProfileStatus.DRAFT);
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerDocumentModel.class, documentId).isCurrent()).isFalse();
            assertThat(em.find(OrganizerProfileModel.class, profileId).getSubmittedAt()).isNull();
        });
        assertThatThrownBy(() -> service.resubmit(ownerId, new Revision(saved.revision()))).isInstanceOf(ConflictException.class);
        tx.executeWithoutResult(status -> em.find(OrganizerProfileModel.class, profileId).setStatus(OrganizerProfileStatus.PENDING_REVIEW));
        assertThatThrownBy(() -> service.correctDocument(ownerId, saved.revision(), OrganizerDocumentType.BUSINESS_LICENSE,
                saved.currentDocumentIds().get(0), pdf("blocked.pdf"))).isInstanceOf(ConflictException.class);
    }

    @Test void draftPagesCanBeAddedAndRemovedIndividually() {
        tx.executeWithoutResult(status -> {
            var profile = em.find(OrganizerProfileModel.class, profileId);
            profile.setStatus(OrganizerProfileStatus.DRAFT);
            profile.setSubmittedAt(null);
            em.remove(em.find(OrganizerDocumentModel.class, documentId));
        });
        authentication("USER");
        var png = java.util.Base64.getDecoder().decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+kvxUAAAAASUVORK5CYII=");
        var first = new MockMultipartFile("files", "page-1.png", "image/png", png);
        var second = new MockMultipartFile("files", "page-2.png", "image/png", png);
        assertThatThrownBy(() -> service.appendPages(ownerId, profileId + 1, 0L,
                OrganizerDocumentType.BUSINESS_LICENSE, List.of(first, second))).isInstanceOf(ConflictException.class);
        var added = service.appendPages(ownerId, profileId, 0L, OrganizerDocumentType.BUSINESS_LICENSE,
                List.of(first, second));
        assertThat(added.currentDocumentIds()).hasSize(2);
        assertThatThrownBy(() -> service.appendPages(ownerId, profileId, added.revision(),
                OrganizerDocumentType.BUSINESS_LICENSE, List.of(pdf("extra.pdf"))))
                .isInstanceOf(base.api.shared.exception.BadRequestException.class);
        var after = service.deleteDraftDocument(ownerId, added.revision(), added.currentDocumentIds().get(0));
        assertThat(after.currentDocumentIds()).containsExactly(added.currentDocumentIds().get(1));
    }

    @Test void replacementRetainsMetadataAndDeletesOldFileAfterCommit() throws Exception {
        var rejected = requestDocumentChanges("Upload a clearer license");
        var storage = context.getBean(PrivateOrganizerDocumentStorage.class);
        var original = storage.store(pdf("old.pdf"));
        tx.executeWithoutResult(status -> em.find(OrganizerDocumentModel.class, documentId).setFileUrl(original.key()));
        authentication("USER");
        var corrected = service.correctDocument(ownerId, rejected.revision(), OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("new.pdf"));
        assertThat(corrected.status()).isEqualTo(OrganizerProfileStatus.REVISION_REQUESTED);
        assertThat(files.resolve(original.key())).doesNotExist();
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerDocumentModel.class, documentId).isCurrent()).isFalse();
            assertThat(em.find(OrganizerDocumentModel.class, documentId).getStatus()).isEqualTo(OrganizerDocumentStatus.REPLACED);
            var docs = em.createQuery("select d from OrganizerDocumentModel d where d.organizerProfile.id=:id and d.current=true", OrganizerDocumentModel.class).setParameter("id", profileId).getResultList();
            assertThat(docs).hasSize(1); assertThat(docs.get(0).getStatus()).isEqualTo(OrganizerDocumentStatus.PENDING);
            assertThat(docs.get(0).getFileName()).isEqualTo("new.pdf"); assertThat(files.resolve(docs.get(0).getFileUrl())).exists();
        });
        assertThatThrownBy(() -> service.correctDocument(ownerId, corrected.revision(), OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("stale.pdf")))
                .isInstanceOf(ConflictException.class);
    }

    @Test void failedReplacementRollsBackMetadataAndDeletesOnlyNewFile() throws Exception {
        var rejected = requestDocumentChanges("License correction required");
        long before;
        try (var list = Files.list(files)) { before = list.count(); }
        failAudit = true;
        authentication("USER");
        assertThatThrownBy(() -> service.correctDocument(ownerId, rejected.revision(), OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("failed.pdf"))).isInstanceOf(IllegalStateException.class);
        tx.executeWithoutResult(status -> {
            assertThat(em.find(OrganizerDocumentModel.class, documentId).isCurrent()).isTrue();
            assertThat(em.createQuery("select count(d) from OrganizerDocumentModel d", Long.class).getSingleResult()).isEqualTo(1);
        });
        try (var list = Files.list(files)) { assertThat(list.count()).isEqualTo(before); }
        assertThat(events()).isEqualTo(1);
    }

    @Test void resubmitRequiresRequiredDocumentsAndCorrectOwnership() {
        var rejected = requestDocumentChanges("Correct details");
        tx.executeWithoutResult(status -> em.remove(em.find(OrganizerDocumentModel.class, documentId)));
        authentication("USER");
        assertThatThrownBy(() -> service.resubmit(ownerId, new Revision(rejected.revision()))).isInstanceOf(OrganizerApplicationValidationException.class);
        assertThat(events()).isEqualTo(1);
        assertThatThrownBy(() -> service.resubmit(adminId, new Revision(rejected.revision()))).isInstanceOf(ForbiddenException.class);
    }

    @Test void concurrentApprovalsCannotApproveTheSameTaxIdTwice() throws Exception {
        Long[] other = tx.execute(status -> {
            var role = em.createQuery("select r from RoleModel r where r.name='USER'", RoleModel.class).getSingleResult();
            var user = account("second-owner", role); em.persist(user); var p = profile(user, "0400000123"); em.persist(p);
            var d = new OrganizerDocumentModel(); d.setOrganizerProfile(p); d.setDocumentType(OrganizerDocumentType.BUSINESS_LICENSE);
            d.setFileName("license.pdf"); d.setFileUrl("22222222-2222-2222-2222-222222222222.pdf"); em.persist(d); em.flush();
            return new Long[]{p.getId(), d.getId()};
        });
        var start = new CountDownLatch(1); var pool = Executors.newFixedThreadPool(2);
        try {
            var a = pool.submit(() -> competingApproval(start, profileId, documentId));
            var b = pool.submit(() -> competingApproval(start, other[0], other[1])); start.countDown();
            assertThat((a.get(15, TimeUnit.SECONDS) ? 1 : 0) + (b.get(15, TimeUnit.SECONDS) ? 1 : 0)).isEqualTo(1);
            assertThat(events()).isEqualTo(1);
        } finally { pool.shutdownNow(); }
    }
    static boolean competingApproval(CountDownLatch start, Long profile, Long document) throws Exception {
        authentication("ADMIN"); start.await();
        try { service.approve(adminId, profile, new Approval(0L, true, List.of(document), null)); return true; }
        catch (ConflictException expected) { return false; }
        finally { SecurityContextHolder.clearContext(); }
    }
    static MockMultipartFile pdf(String name) {
        return new MockMultipartFile("file", name, "application/pdf", "%PDF-1.4 isolated test".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
    }

    @Test void onlyRequestedDocumentsCanBeReplaced() {
        Long other = tx.execute(status -> {
            var document = new OrganizerDocumentModel(); document.setOrganizerProfile(em.find(OrganizerProfileModel.class, profileId));
            document.setDocumentType(OrganizerDocumentType.ID_CARD_FRONT); document.setFileName("identity.pdf");
            document.setFileUrl("identity-key"); em.persist(document); em.flush(); return document.getId();
        });
        var requested = requestDocumentChanges("Replace the license only");
        authentication("USER");
        assertThatThrownBy(() -> service.correctDocument(ownerId, requested.revision(), OrganizerDocumentType.ID_CARD_FRONT, other, pdf("not-requested.pdf"))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.correctDocument(ownerId, requested.revision(), OrganizerDocumentType.OTHER, null, pdf("new-type.pdf"))).isInstanceOf(ConflictException.class);
        var replaced = service.correctDocument(ownerId, requested.revision(), OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("replacement.pdf"));
        assertThatThrownBy(() -> service.correctDocument(ownerId, replaced.revision(), OrganizerDocumentType.BUSINESS_LICENSE,
                replaced.currentDocumentIds().stream().filter(id -> !id.equals(other)).findFirst().orElseThrow(), pdf("already-resolved.pdf"))).isInstanceOf(ConflictException.class);
        assertThat(service.resubmit(ownerId, new Revision(replaced.revision())).status()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
    }

    @Test void revisionCannotAddEvenMissingRequiredDocumentTypesWithoutAdminRequest() {
        tx.executeWithoutResult(status -> em.find(OrganizerProfileModel.class, profileId).setBusinessType(BusinessType.HOUSEHOLD_BUSINESS));
        var requested = requestDocumentChanges("Replace the unclear registration certificate");
        authentication("USER");
        assertThatThrownBy(() -> service.correctDocument(ownerId, requested.revision(), OrganizerDocumentType.ID_CARD_FRONT, null, pdf("front.pdf")))
                .isInstanceOf(ConflictException.class);
        var replaced = service.correctDocument(ownerId, requested.revision(), OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("registration.pdf"));
        assertThatThrownBy(() -> service.resubmit(ownerId, new Revision(replaced.revision())))
                .isInstanceOfSatisfying(OrganizerApplicationValidationException.class, error -> assertThat(error.getErrors())
                        .containsKeys("documents.ID_CARD_FRONT", "documents.ID_CARD_BACK"));
    }

    private OrganizerLifecycleContext requestDocumentChanges(String reason) {
        return service.requestChanges(adminId, profileId, new Rejection(0L, reason, List.of(new DocumentFeedback(documentId, reason))));
    }
    @Test void adminCanRejectRevisionBlockedByAnotherApprovedTaxId() {
        var requested = requestDocumentChanges("Replace the license");
        assertThat(service.adminContext(adminId, profileId).canReject()).isFalse();
        tx.executeWithoutResult(status -> {
            var role = em.createQuery("select r from RoleModel r where r.name='USER'", RoleModel.class).getSingleResult();
            var other = account("existing-owner", role);
            em.persist(other);
            var approved = profile(other, "0400000123");
            approved.setStatus(OrganizerProfileStatus.APPROVED);
            em.persist(approved);
        });

        var context = service.adminContext(adminId, profileId);
        assertThat(context.canApprove()).isFalse();
        assertThat(context.canReject()).isTrue();
        assertThat(service.reject(adminId, profileId, new Rejection(requested.revision(), "Tax ID already in use")).status())
                .isEqualTo(OrganizerProfileStatus.REJECTED);
    }

    @Test void finalRejectionBlocksEveryCorrectionAndResubmissionPath() {
        var rejected = service.reject(adminId, profileId, new Rejection(0L, "Application does not meet requirements"));
        authentication("USER");
        assertThat(service.ownerContext(ownerId).canCorrect()).isFalse();
        assertThatThrownBy(() -> service.correctDocument(ownerId, rejected.revision(), OrganizerDocumentType.BUSINESS_LICENSE, documentId, pdf("blocked.pdf"))).isInstanceOf(ConflictException.class);
        var input = new base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest("Company", BusinessType.LIMITED_LIABILITY, "0400000123", "Representative", "Address", "0900000123", "company@example.test", "Reason");
        assertThatThrownBy(() -> service.saveCorrection(ownerId, new Correction(rejected.revision(), input))).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.resubmit(ownerId, new Revision(rejected.revision()))).isInstanceOf(ConflictException.class);
        assertThat(events()).isEqualTo(1);
    }
    @Test void requestingChangesRequiresDocumentsAndFinalRejectionRejectsPerDocumentInput() {
        assertThatThrownBy(() -> service.requestChanges(adminId, profileId, new Rejection(0L, "Clarify documents"))).isInstanceOf(BadRequestException.class);
        assertThatThrownBy(() -> service.reject(adminId, profileId, new Rejection(0L, "Reject", List.of(new DocumentFeedback(documentId, "Clarify"))))).isInstanceOf(BadRequestException.class);
        assertThat(events()).isZero();
    }
}
