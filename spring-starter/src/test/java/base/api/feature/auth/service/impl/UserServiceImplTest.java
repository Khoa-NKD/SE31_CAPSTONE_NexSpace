package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.repository.IUserRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class UserServiceImplTest {

    private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
    private IUserRepository userRepository;
    private UserServiceImpl service;
    private UserModel user;

    @BeforeEach
    void setUp() {
        userRepository = mock(IUserRepository.class);
        service = new UserServiceImpl(userRepository, passwordEncoder);

        user = new UserModel();
        user.setId(1L);
        user.setUserName("john");
        user.setEmail("john@example.com");
        user.setPassword(passwordEncoder.encode("old-pass"));
        user.setRoleEntity(new RoleModel(UserRole.USER.name(), null));
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));
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
    void changePasswordUpdatesHashWhenOldPasswordMatches() {
        service.changePassword(1L, changePassword("old-pass", "new-pass", "new-pass"));

        assertThat(passwordEncoder.matches("new-pass", user.getPassword())).isTrue();
    }

    @Test
    void changePasswordRejectsWrongOldPassword() {
        assertThatThrownBy(() -> service.changePassword(1L, changePassword("wrong", "new-pass", "new-pass")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("cũ");
    }

    @Test
    void changePasswordRejectsMismatchedConfirmation() {
        assertThatThrownBy(() -> service.changePassword(1L, changePassword("old-pass", "new-pass", "other")))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("xác nhận");
    }

    @Test
    void getByIdThrowsNotFoundForUnknownUser() {
        when(userRepository.findById(99L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> service.getById(99L)).isInstanceOf(NotFoundException.class);
    }

    @Test
    void adminCannotLockThemselves() {
        assertThatThrownBy(() -> service.updateUserStatus(1L, 1L, UserStatus.LOCKED))
                .isInstanceOf(BadRequestException.class);
    }

    @Test
    void adminCanLockAnotherUser() {
        assertThat(service.updateUserStatus(2L, 1L, UserStatus.LOCKED).getStatus()).isEqualTo(UserStatus.LOCKED);
    }
}
