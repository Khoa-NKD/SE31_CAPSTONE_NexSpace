package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.repository.IUserSessionRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.identity.UserSessionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.LocalDateTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserInactivitySchedulerTest {

    private IUserRepository userRepository;
    private IUserSessionRepository userSessionRepository;
    private IAuditService auditService;
    private UserInactivityScheduler scheduler;

    @BeforeEach
    void setUp() {
        userRepository = mock(IUserRepository.class);
        userSessionRepository = mock(IUserSessionRepository.class);
        auditService = mock(IAuditService.class);
        scheduler = new UserInactivityScheduler(userRepository, userSessionRepository, auditService);
        ReflectionTestUtils.setField(scheduler, "inactiveThresholdDays", 90L);
    }

    @Test
    @DisplayName("Tự động chuyển user không hoạt động quá ngưỡng ngày sang INACTIVE, hủy verified, thu hồi session và ghi audit log")
    void markInactiveUsers_TransitionsStaleUsersAndRevokesSessions() {
        UserModel staleUser = new UserModel();
        staleUser.setId(5L);
        staleUser.setUserName("stale_user");
        staleUser.setStatus(UserStatus.ACTIVE);
        staleUser.setVerified(true);
        staleUser.setRoleEntity(new RoleModel(UserRole.USER.name(), "User"));
        staleUser.setLastLoginAt(LocalDateTime.now().minusDays(100));

        UserSessionModel session = new UserSessionModel();
        session.setId(1L);
        session.setUser(staleUser);

        when(userRepository.findActiveUsersInactiveSince(any(LocalDateTime.class))).thenReturn(List.of(staleUser));
        when(userRepository.countByRoleNameAndStatus(UserRole.ADMIN.name(), UserStatus.ACTIVE)).thenReturn(1L);
        when(userSessionRepository.findByUserIdAndRevokedAtIsNull(5L)).thenReturn(List.of(session));

        int count = scheduler.markInactiveUsers();

        assertThat(count).isEqualTo(1);
        assertThat(staleUser.getStatus()).isEqualTo(UserStatus.INACTIVE);
        assertThat(staleUser.isVerified()).isFalse();
        assertThat(session.getRevokedAt()).isNotNull();
        verify(userRepository).save(staleUser);
        verify(userSessionRepository).saveAll(any());
        verify(auditService).log(
                eq(null),
                eq(AuditActorType.SYSTEM),
                eq("USER"),
                eq("USER_MARKED_INACTIVE"),
                eq("UserModel"),
                eq(5L),
                eq("ACTIVE"),
                eq("INACTIVE"),
                contains("90 ngày"),
                eq(null)
        );
    }

    @Test
    @DisplayName("Không tự động vô hiệu hóa tài khoản Quản trị viên (ADMIN) đang hoạt động duy nhất")
    void markInactiveUsers_SkipsLastActiveAdmin() {
        UserModel soleAdmin = new UserModel();
        soleAdmin.setId(1L);
        soleAdmin.setUserName("admin");
        soleAdmin.setStatus(UserStatus.ACTIVE);
        soleAdmin.setVerified(true);
        soleAdmin.setRoleEntity(new RoleModel(UserRole.ADMIN.name(), "Admin"));
        soleAdmin.setLastLoginAt(LocalDateTime.now().minusDays(120));

        when(userRepository.findActiveUsersInactiveSince(any(LocalDateTime.class))).thenReturn(List.of(soleAdmin));
        when(userRepository.countByRoleNameAndStatus(UserRole.ADMIN.name(), UserStatus.ACTIVE)).thenReturn(1L);

        int count = scheduler.markInactiveUsers();

        assertThat(count).isZero();
        assertThat(soleAdmin.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(soleAdmin.isVerified()).isTrue();
        verify(userRepository, never()).save(soleAdmin);
    }
}

