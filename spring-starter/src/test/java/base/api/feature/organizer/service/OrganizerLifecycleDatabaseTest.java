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
        @Bean(destroyMethod="close") SessionFactory entityManagerFactory() {
            String url = "jdbc:h2:mem:organizer_lifecycle_" + UUID.randomUUID() + ";MODE=MySQL;DB_CLOSE_DELAY=-1;LOCK_TIMEOUT=5000";
            if (!url.startsWith("jdbc:h2:mem:")) throw new IllegalStateException("Only isolated in-memory tests are allowed");
            return new org.hibernate.cfg.Configuration().addAnnotatedClass(UserModel.class).addAnnotatedClass(RoleModel.class)
                    .addAnnotatedClass(OrganizerProfileModel.class).addAnnotatedClass(OrganizerDocumentModel.class).addAnnotatedClass(AuditLogModel.class)
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
        @Bean IOrganizerDocumentRepository documents(EntityManager em) { return new JpaRepositoryFactory(em).getRepository(IOrganizerDocumentRepository.class); }
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
                OrganizerLifecycleAudit audit, Validator validator, Clock clock) {
            return new OrganizerApplicationLifecycleService(users, roles, profiles, documents, storage, audit, validator, clock);
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
        failAudit = false; authentication("ADMIN");
        tx.executeWithoutResult(status -> {
            for (String entity : List.of("AuditLogModel", "OrganizerDocumentModel", "OrganizerProfileModel", "UserModel", "RoleModel"))
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

    @Test void approvalUpdatesProfileRoleDocumentsAndAuditTogether() {
        var result = service.approve(adminId, profileId, approval(0));
        assertThat(result.status()).isEqualTo(OrganizerProfileStatus.APPROVED); assertThat(result.canSuspend()).isFalse();
        tx.executeWithoutResult(status -> {
            var p = em.find(OrganizerProfileModel.class, profileId);
            assertThat(p.getOrganizer().getRole()).isEqualTo(UserRole.ORGANIZER);
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

    @Test void savingRequestedCorrectionsRetainsReviewOutcomeUntilExplicitResubmission() {
        tx.executeWithoutResult(status -> {var profile=em.find(OrganizerProfileModel.class,profileId); profile.setStatus(OrganizerProfileStatus.REVISION_REQUESTED);profile.setReviewFeedback("Clarify legal address");});
        authentication("USER");
        var input=new base.api.feature.organizer.dto.request.SubmitOrganizerApplicationRequest("Updated Workspace Company",BusinessType.LIMITED_LIABILITY,"0400000123","Representative","25 New Street","0900000123","contact@example.test", "Offer meeting rooms and flexible desks.");
        var corrected=service.saveCorrection(ownerId,new Correction(0L,input));
        assertThat(corrected.status()).isEqualTo(OrganizerProfileStatus.REVISION_REQUESTED);
        tx.executeWithoutResult(status -> {var profile=em.find(OrganizerProfileModel.class,profileId); assertThat(profile.getAddress()).isEqualTo("25 New Street");assertThat(profile.getReviewFeedback()).isEqualTo("Clarify legal address");assertThat(profile.getOrganizer().getRole()).isEqualTo(UserRole.USER);});
        assertThat(service.resubmit(ownerId,new Revision(corrected.revision())).status()).isEqualTo(OrganizerProfileStatus.PENDING_REVIEW);
        tx.executeWithoutResult(status -> assertThat(em.find(OrganizerProfileModel.class, profileId).getRegistrationReason()).isEqualTo(input.registrationReason()));
        assertThat(events()).isEqualTo(2);
    }

    @Test void legacyPendingApplicationCanBeApprovedWithoutFabricatingAReason() {
        tx.executeWithoutResult(status -> em.find(OrganizerProfileModel.class,profileId).setRegistrationReason(null));
        assertThat(service.approve(adminId,profileId,approval(0)).status()).isEqualTo(OrganizerProfileStatus.APPROVED);
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
        assertThat(approved.status()).isEqualTo(OrganizerProfileStatus.APPROVED);
        tx.executeWithoutResult(status -> assertThat(em.find(UserModel.class, ownerId).getRole()).isEqualTo(UserRole.ORGANIZER));
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

    private OrganizerLifecycleContext requestDocumentChanges(String reason) {
        return service.requestChanges(adminId, profileId, new Rejection(0L, reason, List.of(new DocumentFeedback(documentId, reason))));
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
