package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class UserServiceImplTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private IUserRepository userRepository;
    private IAuditService auditService;
    private UserServiceImpl service;
    private UserModel user;
    private UserModel admin;

    @BeforeEach
    void setUp() {
        userRepository = mock(IUserRepository.class);
        auditService = mock(IAuditService.class);
        service = new UserServiceImpl(userRepository, passwordEncoder, auditService);

        user = new UserModel();
        user.setId(1L);
        user.setUserName("john");
        user.setEmail("john@example.com");
        user.setPassword(passwordEncoder.encode("old-pass"));
        user.setStatus(UserStatus.ACTIVE);
        user.setRoleEntity(new RoleModel(UserRole.USER.name(), null));

        admin = new UserModel();
        admin.setId(2L);
        admin.setUserName("admin");
        admin.setEmail("admin@example.com");
        admin.setRoleEntity(new RoleModel(UserRole.ADMIN.name(), null));

        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
        when(userRepository.findById(2L)).thenReturn(Optional.of(admin));
        when(userRepository.saveAndFlush(any(UserModel.class))).thenAnswer(inv -> inv.getArgument(0));
    }

    private static ChangePasswordDto changePassword(String oldPw, String newPw, String confirm) {
        ChangePasswordDto dto = new ChangePasswordDto();
        dto.setOldPassword(oldPw);
        dto.setNewPassword(newPw);
        dto.setConfirmNewPassword(confirm);
        return dto;
    }

    @Test
    @DisplayName("Đổi mật khẩu thành công khi mật khẩu cũ hợp lệ và xác nhận khớp")
    void changePasswordUpdatesHashWhenOldPasswordMatches() {
        service.changePassword(1L, changePassword("old-pass", "new-pass", "new-pass"));

        assertThat(passwordEncoder.matches("new-pass", user.getPassword())).isTrue();
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi nhập sai mật khẩu cũ")
    void changePasswordRejectsWrongOldPassword() {
        assertThatThrownBy(() -> service.changePassword(1L, changePassword("wrong", "new-pass", "new-pass")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cũ");
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi mật khẩu mới trùng mật khẩu cũ")
    void changePasswordRejectsSameAsOldPassword() {
        assertThatThrownBy(() -> service.changePassword(1L, changePassword("old-pass", "old-pass", "old-pass")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("trùng với mật khẩu cũ");
    }

    @Test
    @DisplayName("Đổi mật khẩu thất bại khi xác nhận mật khẩu không khớp")
    void changePasswordRejectsMismatchedConfirmation() {
        assertThatThrownBy(() -> service.changePassword(1L, changePassword("old-pass", "new-pass", "other")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xác nhận");
    }

    @Test
    @DisplayName("Tìm user theo ID không tồn tại ném NotFoundException")
    void getByIdThrowsNotFoundForUnknownUser() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    @DisplayName("Admin không thể tự khóa tài khoản của chính mình")
    void adminCannotLockThemselves() {
        assertThatThrownBy(() -> service.updateUserStatus(1L, 1L, UserStatus.LOCKED))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Không thể tự thay đổi trạng thái");
    }

    @Test
    @DisplayName("Admin khóa tài khoản thành công và ghi vết Audit Log theo BR-31")
    void adminCanLockAnotherUser() {
        var result = service.updateUserStatus(2L, 1L, UserStatus.LOCKED, "Vi phạm điều khoản dịch vụ");

        assertThat(result.getStatus()).isEqualTo(UserStatus.LOCKED);
        verify(auditService).log(
                eq(admin),
                eq(AuditActorType.USER),
                eq("USER"),
                eq("USER_LOCKED"),
                eq("UserModel"),
                eq(1L),
                eq("ACTIVE"),
                eq("LOCKED"),
                eq("Vi phạm điều khoản dịch vụ"),
                eq(null)
        );
    }

    @Test
    @DisplayName("Admin mở khóa tài khoản sẽ tự động xóa bộ đếm đăng nhập sai và thời gian phạt")
    void adminCanUnlockAnotherUserAndResetsLockout() {
        user.setStatus(UserStatus.LOCKED);
        user.setFailedLoginCount(5);
        user.setLockedUntil(LocalDateTime.now().plusMinutes(10));

        var result = service.updateUserStatus(2L, 1L, UserStatus.ACTIVE, "Đã xử lý khiếu nại");

        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
        assertThat(user.getFailedLoginCount()).isZero();
        assertThat(user.getLockedUntil()).isNull();
        verify(auditService).log(
                eq(admin),
                eq(AuditActorType.USER),
                eq("USER"),
                eq("USER_UNLOCKED"),
                eq("UserModel"),
                eq(1L),
                eq("LOCKED"),
                eq("ACTIVE"),
                eq("Đã xử lý khiếu nại"),
                eq(null)
        );
    }
}
