package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.*;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.mapper.UserMapper;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.service.*;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.*;
import base.api.shared.exception.*;
import java.time.*;
import java.util.*;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {
  private static final Set<String> SORTABLE_FIELDS = Set.of("id", "fullName", "email", "createdAt");
  private final IUserRepository userRepository;
  private final PasswordEncoder passwordEncoder;
  private final ITokenRevocationService sessions;
  private final AuditService audit;

  @Override
  @Transactional(readOnly = true)
  public UserDto getById(UUID userId) {
    return UserMapper.toDto(findUser(userId));
  }

  @Override
  @Transactional
  public UserDto updateProfile(UUID userId, UpdateProfileDto dto) {
    UserModel user = findUser(userId);
    user.setFullName(dto.getFullName().trim());
    user.setPhone(dto.getPhone());
    user.setAvatarUrl(dto.getAvatarUrl());
    user.setBirthDate(dto.getBirthDate());
    user.setAddress(dto.getAddress());
    return UserMapper.toDto(userRepository.saveAndFlush(user));
  }

  @Override
  @Transactional
  public void changePassword(UUID userId, ChangePasswordDto dto) {
    UserModel user = findUser(userId);
    if (user.getPassword() == null
        || !passwordEncoder.matches(dto.getOldPassword(), user.getPassword()))
      throw new BadRequestException("Mật khẩu cũ không đúng");
    if (!dto.getNewPassword().equals(dto.getConfirmNewPassword()))
      throw new BadRequestException("Mật khẩu xác nhận không khớp");
    user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
    user.setPasswordChangedAt(LocalDateTime.now(ZoneOffset.UTC));
    sessions.revokeAll(userId);
    audit.record(userId, userId, "CHANGE_PASSWORD");
  }

  @Override
  @Transactional(readOnly = true)
  public Page<UserDto> getUserPage(PageRequestDTO pageRequest, UserRole role, UserStatus status) {
    return userRepository
        .search(
            pageRequest.normalizedSearch(),
            role,
            status,
            pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS))
        .map(UserMapper::toDto);
  }

  @Override
  @Transactional
  public UserDto updateUserStatus(UUID actorId, UUID targetUserId, UserStatus status) {
    if (actorId.equals(targetUserId))
      throw new BadRequestException("Không thể tự thay đổi trạng thái tài khoản của mình");
    UserModel user = findUser(targetUserId);
    if (status == UserStatus.ACTIVE && !user.isVerified())
      throw new BadRequestException("Tài khoản cần xác minh email trước khi kích hoạt");
    if (status == UserStatus.UNVERIFIED && user.isVerified())
      throw new BadRequestException("Không thể chuyển tài khoản đã xác minh về Unverified");
    user.setStatus(status);
    if (status != UserStatus.ACTIVE) sessions.revokeAll(targetUserId);
    audit.record(actorId, targetUserId, "UPDATE_USER_STATUS");
    return UserMapper.toDto(userRepository.saveAndFlush(user));
  }

  private UserModel findUser(UUID userId) {
    return userRepository
        .findById(userId)
        .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
  }
}
