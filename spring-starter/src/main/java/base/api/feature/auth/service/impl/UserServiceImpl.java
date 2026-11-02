package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.mapper.UserMapper;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.service.IUserService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;

@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {

    private static final Set<String> SORTABLE_FIELDS = Set.of("id", "userName", "email", "createdAt");

    private final IUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    @Transactional(readOnly = true)
    public UserDto getById(Long userId) {
        return UserMapper.toDto(findUser(userId));
    }

    @Override
    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileDto dto) {
        UserModel user = findUser(userId);
        user.setFirstName(dto.getFirstName().trim());
        user.setLastName(dto.getLastName() == null ? null : dto.getLastName().trim());
        user.setPhone(dto.getPhone());
        user.setAvatar(dto.getAvatar());
        user.setBirthDate(dto.getBirthDate());
        user.setGender(dto.getGender());
        return UserMapper.toDto(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordDto dto) {
        UserModel user = findUser(userId);
        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu cũ không đúng");
        }
        if (!dto.getNewPassword().equals(dto.getConfirmNewPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp");
        }
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
    }

    @Override
    @Transactional(readOnly = true)
    public Page<UserDto> getUserPage(PageRequestDTO pageRequest, UserRole role, UserStatus status) {
        return userRepository.search(
                        pageRequest.normalizedSearch(),
                        role == null ? null : role.name(),
                        status,
                        pageRequest.toPageable("createdAt", Sort.Direction.DESC, SORTABLE_FIELDS))
                .map(UserMapper::toDto);
    }

    @Override
    @Transactional
    public UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status) {
        if (actorId.equals(targetUserId)) {
            throw new BadRequestException("Không thể tự thay đổi trạng thái tài khoản của mình");
        }
        UserModel user = findUser(targetUserId);
        user.setStatus(status);
        return UserMapper.toDto(userRepository.saveAndFlush(user));
    }

    private UserModel findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }
}
