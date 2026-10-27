package base.api.feature.auth.service.impl;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.repository.IUserRepository;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import java.util.Optional;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

class UserServiceImplTest {
  private static final java.util.UUID USER_ID = java.util.UUID.randomUUID();
  private static final java.util.UUID ACTOR_ID = java.util.UUID.randomUUID();
  private static final java.util.UUID MISSING_ID = java.util.UUID.randomUUID();

  private final PasswordEncoder passwordEncoder = new BCryptPasswordEncoder(4);
  private IUserRepository userRepository;
  private UserServiceImpl service;
  private UserModel user;

  @BeforeEach
  void setUp() {
    userRepository = mock(IUserRepository.class);
    service =
        new UserServiceImpl(
            userRepository,
            passwordEncoder,
            mock(base.api.feature.auth.service.ITokenRevocationService.class),
            mock(AuditService.class));

    user = new UserModel();
    user.setId(USER_ID);
    user.setFullName("John");
    user.setEmailVerifiedAt(java.time.LocalDateTime.now(java.time.ZoneOffset.UTC));
    user.setEmail("john@example.com");
    user.setPassword(passwordEncoder.encode("old-pass"));
    user.setRole(UserRole.CUSTOMER);
    when(userRepository.findById(USER_ID)).thenReturn(Optional.of(user));
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
    service.changePassword(USER_ID, changePassword("old-pass", "new-pass", "new-pass"));

    assertThat(passwordEncoder.matches("new-pass", user.getPassword())).isTrue();
  }

  @Test
  void changePasswordRejectsWrongOldPassword() {
    assertThatThrownBy(
            () -> service.changePassword(USER_ID, changePassword("wrong", "new-pass", "new-pass")))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("cũ");
  }

  @Test
  void changePasswordRejectsMismatchedConfirmation() {
    assertThatThrownBy(
            () -> service.changePassword(USER_ID, changePassword("old-pass", "new-pass", "other")))
        .isInstanceOf(BadRequestException.class)
        .hasMessageContaining("xác nhận");
  }

  @Test
  void getByIdThrowsNotFoundForUnknownUser() {
    when(userRepository.findById(MISSING_ID)).thenReturn(Optional.empty());

    assertThatThrownBy(() -> service.getById(MISSING_ID)).isInstanceOf(NotFoundException.class);
  }

  @Test
  void adminCannotLockThemselves() {
    assertThatThrownBy(() -> service.updateUserStatus(USER_ID, USER_ID, UserStatus.LOCKED))
        .isInstanceOf(BadRequestException.class);
  }

  @Test
  void adminCanLockAnotherUser() {
    assertThat(service.updateUserStatus(ACTOR_ID, USER_ID, UserStatus.LOCKED).getStatus())
        .isEqualTo(UserStatus.LOCKED);
  }
}
