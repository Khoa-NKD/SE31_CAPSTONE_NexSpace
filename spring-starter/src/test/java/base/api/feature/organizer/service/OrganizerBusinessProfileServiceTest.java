package base.api.feature.organizer.service;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.organizer.dto.request.UpdateOrganizerBusinessProfileRequest;
import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.organizer.OrganizerProfileModel;
import base.api.shared.enums.BusinessType;
import base.api.shared.enums.OrganizerProfileStatus;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.exception.UnauthorizedException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.Optional;
import java.time.LocalDateTime;
import java.util.concurrent.atomic.AtomicInteger;
import org.springframework.aop.framework.ProxyFactory;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.AnnotationTransactionAttributeSource;
import org.springframework.transaction.interceptor.TransactionInterceptor;
import org.springframework.transaction.support.AbstractPlatformTransactionManager;
import org.springframework.transaction.support.DefaultTransactionStatus;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.doThrow;

class OrganizerBusinessProfileServiceTest {
    private IUserRepository users;
    private IOrganizerProfileRepository profiles;
    private OrganizerBusinessProfileService service;
    private UserModel organizer;
    private OrganizerProfileModel profile;
    private static final UpdateOrganizerBusinessProfileRequest UPDATE = new UpdateOrganizerBusinessProfileRequest(
            " 456 New Street ", " new@example.test ", " +84901234567 ");

    @BeforeEach
    void setUp() {
        users = mock(IUserRepository.class);
        profiles = mock(IOrganizerProfileRepository.class);
        service = new OrganizerBusinessProfileService(users, profiles);
        organizer = new UserModel();
        organizer.setId(7L);
        organizer.setVerified(true);
        organizer.setStatus(UserStatus.ACTIVE);
        organizer.setRoleEntity(new RoleModel("ORGANIZER", null));
        profile = new OrganizerProfileModel();
        profile.setId(42L);
        profile.setOrganizer(organizer);
        profile.setStatus(OrganizerProfileStatus.APPROVED);
        profile.setLegalName("Example Company");
        profile.setBusinessType(BusinessType.LIMITED_LIABILITY);
        profile.setTaxId("TEST-TAX-123");
        profile.setRepresentativeName("Test Representative");
        profile.setAddress("123 Example Street");
        profile.setContactEmail("contact@example.test");
        profile.setContactPhone("0901234567");
        when(users.findById(7L)).thenReturn(Optional.of(organizer));
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.of(profile));
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.of(profile));
    }

    @Test
    void readsApprovedProfileForItsOwner() {
        var result = service.getCurrentProfile(7L);
        assertThat(result.id()).isEqualTo(42L);
        assertThat(result.legalName()).isEqualTo("Example Company");
        assertThat(result.businessType()).isEqualTo(BusinessType.LIMITED_LIABILITY);
        assertThat(result.taxId()).isEqualTo("TEST-TAX-123");
        assertThat(result.representativeName()).isEqualTo("Test Representative");
        assertThat(result.address()).isEqualTo("123 Example Street");
        assertThat(result.contactEmail()).isEqualTo("contact@example.test");
        assertThat(result.contactPhone()).isEqualTo("0901234567");
    }

    @Test
    void rejectsMissingAccount() {
        when(users.findById(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getCurrentProfile(7L)).isInstanceOf(UnauthorizedException.class);
        assertThatThrownBy(() -> service.updateCurrentProfile(7L, UPDATE)).isInstanceOf(UnauthorizedException.class);
    }

    @Test
    void rejectsMissingProfile() {
        when(profiles.findByOrganizerId(7L)).thenReturn(Optional.empty());
        when(profiles.findByOrganizerIdForUpdate(7L)).thenReturn(Optional.empty());
        assertThatThrownBy(() -> service.getCurrentProfile(7L)).isInstanceOf(NotFoundException.class);
        assertThatThrownBy(() -> service.updateCurrentProfile(7L, UPDATE)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void rejectsForeignOwnershipEvenIfRepositoryReturnsAnUnexpectedRecord() {
        var other = new UserModel();
        other.setId(8L);
        profile.setOrganizer(other);
        assertThatThrownBy(() -> service.getCurrentProfile(7L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.updateCurrentProfile(7L, UPDATE)).isInstanceOf(ForbiddenException.class);
    }

    @ParameterizedTest
    @ValueSource(strings = {"USER", "ADMIN"})
    void rejectsOtherRoles(String role) {
        organizer.setRoleEntity(new RoleModel(role, null));
        assertThatThrownBy(() -> service.getCurrentProfile(7L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.updateCurrentProfile(7L, UPDATE)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(profiles);
    }

    @Test
    void rejectsInactiveAndUnverifiedOrganizers() {
        organizer.setVerified(false);
        assertThatThrownBy(() -> service.getCurrentProfile(7L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.updateCurrentProfile(7L, UPDATE)).isInstanceOf(ForbiddenException.class);
        organizer.setVerified(true);
        organizer.setStatus(UserStatus.LOCKED);
        assertThatThrownBy(() -> service.getCurrentProfile(7L)).isInstanceOf(ForbiddenException.class);
        assertThatThrownBy(() -> service.updateCurrentProfile(7L, UPDATE)).isInstanceOf(ForbiddenException.class);
        verifyNoInteractions(profiles);
    }

    @ParameterizedTest
    @EnumSource(value = OrganizerProfileStatus.class, names = "APPROVED", mode = EnumSource.Mode.EXCLUDE)
    void rejectsApplicationStatesOutsideApprovedBusinessProfile(OrganizerProfileStatus status) {
        profile.setStatus(status);
        assertThatThrownBy(() -> service.getCurrentProfile(7L)).isInstanceOf(ConflictException.class);
        assertThatThrownBy(() -> service.updateCurrentProfile(7L, UPDATE)).isInstanceOf(ConflictException.class);
    }

    @Test
    void updatesOnlyTrimmedContactFieldsAndPreservesLegalIdentityAndApproval() {
        var submittedAt = LocalDateTime.of(2026, 10, 1, 10, 0);
        var reviewedAt = submittedAt.plusDays(1);
        var reviewer = new UserModel();
        reviewer.setId(99L);
        profile.setSubmittedAt(submittedAt);
        profile.setReviewedAt(reviewedAt);
        profile.setReviewedBy(reviewer);
        profile.setReviewFeedback("Approved evidence");
        profile.setBankName("Existing bank");
        profile.setBankAccountNumber("encrypted-existing-value");
        profile.setBankAccountHolder("Existing holder");

        var result = service.updateCurrentProfile(7L, UPDATE);

        assertThat(result.address()).isEqualTo("456 New Street");
        assertThat(result.contactEmail()).isEqualTo("new@example.test");
        assertThat(result.contactPhone()).isEqualTo("+84901234567");
        assertThat(profile.getAddress()).isEqualTo(result.address());
        assertThat(profile.getContactEmail()).isEqualTo(result.contactEmail());
        assertThat(profile.getContactPhone()).isEqualTo(result.contactPhone());
        assertThat(profile.getLegalName()).isEqualTo("Example Company");
        assertThat(profile.getBusinessType()).isEqualTo(BusinessType.LIMITED_LIABILITY);
        assertThat(profile.getTaxId()).isEqualTo("TEST-TAX-123");
        assertThat(profile.getRepresentativeName()).isEqualTo("Test Representative");
        assertThat(profile.getOrganizer()).isSameAs(organizer);
        assertThat(organizer.getRole().name()).isEqualTo("ORGANIZER");
        assertThat(profile.getStatus()).isEqualTo(OrganizerProfileStatus.APPROVED);
        assertThat(profile.getSubmittedAt()).isEqualTo(submittedAt);
        assertThat(profile.getReviewedAt()).isEqualTo(reviewedAt);
        assertThat(profile.getReviewedBy()).isSameAs(reviewer);
        assertThat(profile.getReviewFeedback()).isEqualTo("Approved evidence");
        assertThat(profile.getBankName()).isEqualTo("Existing bank");
        assertThat(profile.getBankAccountNumber()).isEqualTo("encrypted-existing-value");
        assertThat(profile.getBankAccountHolder()).isEqualTo("Existing holder");
        verify(profiles).findByOrganizerIdForUpdate(7L);
        verify(profiles).saveAndFlush(profile);
    }

    @Test
    void persistenceFailureRollsBackTheAnnotatedServiceTransaction() {
        var commits = new AtomicInteger();
        var rollbacks = new AtomicInteger();
        var manager = new AbstractPlatformTransactionManager() {
            protected Object doGetTransaction() { return new Object(); }
            protected void doBegin(Object tx, TransactionDefinition definition) { }
            protected void doCommit(DefaultTransactionStatus status) { commits.incrementAndGet(); }
            protected void doRollback(DefaultTransactionStatus status) { rollbacks.incrementAndGet(); }
        };
        var proxy = new ProxyFactory(service);
        proxy.addAdvice(new TransactionInterceptor(manager, new AnnotationTransactionAttributeSource()));
        var transactionalService = (OrganizerBusinessProfileService) proxy.getProxy();
        doThrow(new IllegalStateException("Simulated persistence failure")).when(profiles).saveAndFlush(profile);

        assertThatThrownBy(() -> transactionalService.updateCurrentProfile(7L, UPDATE))
                .isInstanceOf(IllegalStateException.class).hasMessage("Simulated persistence failure");
        assertThat(commits).hasValue(0);
        assertThat(rollbacks).hasValue(1);
    }
}
