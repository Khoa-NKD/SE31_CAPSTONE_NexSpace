package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.DeleteAccountDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.mapper.UserMapper;
import base.api.feature.auth.repository.IRoleRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.repository.IUserSessionRepository;
import base.api.feature.auth.service.IUserService;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import base.api.feature.workspace.service.IMediaStorageService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.identity.UserSessionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.ConflictException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.exception.UnauthorizedException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Sort;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements IUserService {

    public static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");
    private static final DateTimeFormatter DATE_TIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss");
    private static final Set<String> SORTABLE_FIELDS = Set.of("id", "userName", "email", "createdAt");
    private static final long MAX_AVATAR_SIZE_BYTES = 5 * 1024 * 1024; // 5MB
    private static final String AVATAR_FOLDER = "nexspace/avatars";

    private final IUserRepository userRepository;
    private final IUserSessionRepository userSessionRepository;
    private final PasswordEncoder passwordEncoder;
    private final IAuditService auditService;
    private final IMediaStorageService mediaStorageService;
    private final IRoleRepository roleRepository;

    @Override
    @Transactional(readOnly = true)
    public UserDto getById(Long userId) {
        return UserMapper.toDto(findUser(userId));
    }

    @Override
    @Transactional
    public UserDto updateProfile(Long userId, UpdateProfileDto dto) {
        UserModel user = findUser(userId);
        user.setFirstName(dto.getFirstName().trim().replaceAll("\\s+", " "));
        user.setLastName(dto.getLastName() == null || dto.getLastName().isBlank() ? null : dto.getLastName().trim().replaceAll("\\s+", " "));
        user.setPhone(dto.getPhone() == null || dto.getPhone().isBlank() ? null : dto.getPhone().trim());
        user.setBirthDate(dto.getBirthDate());
        user.setGender(dto.getGender());

        if (dto.getAvatar() != null) {
            String newAvatar = dto.getAvatar().trim();
            String oldAvatar = user.getAvatar();
            if (newAvatar.isEmpty()) {
                user.setAvatar(null);
                cleanupOldAvatarSafely(oldAvatar, userId);
            } else {
                user.setAvatar(newAvatar);
                if (oldAvatar != null && !oldAvatar.equals(newAvatar)) {
                    cleanupOldAvatarSafely(oldAvatar, userId);
                }
            }
        }

        return UserMapper.toDto(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional
    public UserDto updateProfileWithMultipart(Long userId, base.api.feature.auth.dto.request.UpdateProfileMultipartDto dto) {
        UserModel user = findUser(userId);
        user.setFirstName(dto.getFirstName().trim().replaceAll("\\s+", " "));
        user.setLastName(dto.getLastName() == null || dto.getLastName().isBlank() ? null : dto.getLastName().trim().replaceAll("\\s+", " "));
        user.setPhone(dto.getPhone() == null || dto.getPhone().isBlank() ? null : dto.getPhone().trim());
        user.setBirthDate(dto.getBirthDate());
        user.setGender(dto.getGender());

        String oldAvatar = user.getAvatar();

        // Ưu tiên 1: Tải lên file ảnh từ máy tính nếu có (Cách 2 - ảnh local)
        if (dto.getFile() != null && !dto.getFile().isEmpty()) {
            validateAvatarFile(dto.getFile());
            MediaUploadResponseDto uploadResult = mediaStorageService.uploadImage(dto.getFile(), AVATAR_FOLDER, userId);
            user.setAvatar(uploadResult.getUrl());
            cleanupOldAvatarSafely(oldAvatar, userId);
            auditService.log(
                    user,
                    AuditActorType.USER,
                    "USER",
                    "USER_AVATAR_UPDATED",
                    "UserModel",
                    userId,
                    oldAvatar,
                    uploadResult.getUrl(),
                    "Tải lên ảnh đại diện từ máy tính kèm cập nhật hồ sơ",
                    null
            );
        } else if (dto.getAvatar() != null) {
            // Ưu tiên 2: Sử dụng link ảnh trên mạng (Cách 1 - https://...)
            String newAvatar = dto.getAvatar().trim();
            if (newAvatar.isEmpty()) {
                user.setAvatar(null);
                cleanupOldAvatarSafely(oldAvatar, userId);
            } else {
                user.setAvatar(newAvatar);
                if (oldAvatar != null && !oldAvatar.equals(newAvatar)) {
                    cleanupOldAvatarSafely(oldAvatar, userId);
                }
            }
        }

        return UserMapper.toDto(userRepository.saveAndFlush(user));
    }

    @Override
    @Transactional
    public UserDto uploadAvatar(Long userId, MultipartFile file) {
        validateAvatarFile(file);

        UserModel user = findUser(userId);
        String oldAvatar = user.getAvatar();

        MediaUploadResponseDto uploadResult = mediaStorageService.uploadImage(file, AVATAR_FOLDER, userId);
        user.setAvatar(uploadResult.getUrl());

        UserModel saved = userRepository.saveAndFlush(user);

        try {
            cleanupOldAvatarSafely(oldAvatar, userId);
        } catch (Throwable t) {
            log.warn("Lỗi dọn dẹp file avatar cũ: {}", t.getMessage());
        }

        try {
            auditService.log(
                    saved,
                    AuditActorType.USER,
                    "USER",
                    "USER_AVATAR_UPDATED",
                    "UserModel",
                    userId,
                    oldAvatar,
                    uploadResult.getUrl(),
                    "Tải lên ảnh đại diện từ máy tính",
                    null
            );
        } catch (Throwable t) {
            log.warn("Không thể ghi audit log khi tải lên avatar: {}", t.getMessage());
        }

        return UserMapper.toDto(saved);
    }

    @Override
    @Transactional
    public UserDto updateAvatarUrl(Long userId, String avatarUrl) {
        if (avatarUrl == null || avatarUrl.isBlank()) {
            return deleteAvatar(userId);
        }

        String trimmedUrl = avatarUrl.trim();
        if (!trimmedUrl.startsWith("http://") && !trimmedUrl.startsWith("https://")) {
            throw new BadRequestException("Đường dẫn ảnh đại diện phải bắt đầu bằng http:// hoặc https://");
        }

        UserModel user = findUser(userId);
        String oldAvatar = user.getAvatar();

        user.setAvatar(trimmedUrl);
        UserModel saved = userRepository.saveAndFlush(user);

        try {
            cleanupOldAvatarSafely(oldAvatar, userId);
        } catch (Throwable t) {
            log.warn("Lỗi dọn dẹp file avatar cũ: {}", t.getMessage());
        }

        try {
            auditService.log(
                    saved,
                    AuditActorType.USER,
                    "USER",
                    "USER_AVATAR_UPDATED",
                    "UserModel",
                    userId,
                    oldAvatar,
                    trimmedUrl,
                    "Cập nhật ảnh đại diện bằng đường dẫn mạng",
                    null
            );
        } catch (Throwable t) {
            log.warn("Không thể ghi audit log khi cập nhật URL avatar: {}", t.getMessage());
        }

        return UserMapper.toDto(saved);
    }

    @Override
    @Transactional
    public UserDto updateAvatar(Long userId, base.api.feature.auth.dto.request.UpdateAvatarMultipartDto dto) {
        if (dto == null) {
            return deleteAvatar(userId);
        }
        // Cách 2: Tải lên file ảnh từ máy tính nếu có (local file)
        if (dto.getFile() != null && !dto.getFile().isEmpty()) {
            return uploadAvatar(userId, dto.getFile());
        }
        // Cách 1: Cập nhật đường dẫn ảnh trên mạng (online URL)
        String effectiveUrl = dto.getEffectiveUrl();
        if (effectiveUrl != null && !effectiveUrl.isBlank()) {
            return updateAvatarUrl(userId, effectiveUrl);
        }
        // Trường hợp không có file và không có link -> xóa avatar
        return deleteAvatar(userId);
    }

    @Override
    @Transactional
    public UserDto deleteAvatar(Long userId) {
        UserModel user = findUser(userId);
        String oldAvatar = user.getAvatar();

        user.setAvatar(null);
        UserModel saved = userRepository.saveAndFlush(user);

        try {
            cleanupOldAvatarSafely(oldAvatar, userId);
        } catch (Throwable t) {
            log.warn("Lỗi dọn dẹp file avatar cũ: {}", t.getMessage());
        }

        try {
            auditService.log(
                    saved,
                    AuditActorType.USER,
                    "USER",
                    "USER_AVATAR_DELETED",
                    "UserModel",
                    userId,
                    oldAvatar,
                    null,
                    "Xóa ảnh đại diện",
                    null
            );
        } catch (Throwable t) {
            log.warn("Không thể ghi audit log khi xóa avatar: {}", t.getMessage());
        }

        return UserMapper.toDto(saved);
    }

    @Override
    @Transactional
    public void changePassword(Long userId, ChangePasswordDto dto) {
        UserModel user = findUser(userId);
        if (!passwordEncoder.matches(dto.getOldPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu cũ không đúng");
        }
        if (passwordEncoder.matches(dto.getNewPassword(), user.getPassword())) {
            throw new BadRequestException("Mật khẩu mới không được trùng với mật khẩu cũ");
        }
        if (!dto.getNewPassword().equals(dto.getConfirmNewPassword())) {
            throw new BadRequestException("Mật khẩu xác nhận không khớp");
        }
        user.setPassword(passwordEncoder.encode(dto.getNewPassword()));
        user.setFailedLoginCount(0);
        user.setLockedUntil(null);
    }

    @Override
    @Transactional
    public void deleteMyAccount(Long userId, DeleteAccountDto dto) {
        UserModel user = findUser(userId);
        if (user.getStatus() == UserStatus.DELETED) {
            throw new ConflictException("Tài khoản đã ở trạng thái đã xóa trước đó");
        }
        if (user.getPassword() != null && !user.getPassword().isBlank()) {
            if (dto.getPassword() == null || !passwordEncoder.matches(dto.getPassword(), user.getPassword())) {
                throw new UnauthorizedException("Mật khẩu xác nhận không chính xác");
            }
        }
        ensureNotLastActiveAdmin(user, user.getStatus(), "tự xóa");

        UserStatus oldStatus = user.getStatus();
        user.setStatus(UserStatus.DELETED);
        user.setLockedUntil(null);
        UserModel saved = userRepository.saveAndFlush(user);

        revokeActiveSessions(userId);

        String reason = (dto.getReason() != null && !dto.getReason().isBlank())
                ? dto.getReason().trim()
                : "Người dùng tự xóa tài khoản của chính mình";

        auditService.log(
                saved,
                AuditActorType.USER,
                "USER",
                "USER_SELF_DELETED",
                "UserModel",
                userId,
                oldStatus != null ? oldStatus.name() : null,
                UserStatus.DELETED.name(),
                reason,
                null
        );
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
        return updateUserStatus(actorId, targetUserId, status, null, null);
    }

    @Override
    @Transactional
    public UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status, String reason) {
        return updateUserStatus(actorId, targetUserId, status, reason, null);
    }

    @Override
    @Transactional
    public UserDto updateUserStatus(Long actorId, Long targetUserId, UserStatus status, String reason, LocalDateTime lockedUntil) {
        if (actorId.equals(targetUserId)) {
            throw new BadRequestException("Không thể tự thay đổi trạng thái tài khoản của mình");
        }
        UserModel actor = findUser(actorId);
        UserModel target = findUser(targetUserId);
        UserStatus oldStatus = target.getStatus();

        // Bảo toàn máy trạng thái cho tài khoản đã xóa mềm (DELETED)
        if (oldStatus == UserStatus.DELETED) {
            if (status == UserStatus.DELETED) {
                throw new ConflictException("Tài khoản đã được xóa mềm trước đó");
            }
            if (status != UserStatus.ACTIVE) {
                throw new ConflictException("Tài khoản đã bị xóa, chỉ có thể khôi phục về trạng thái ACTIVE");
            }
        }

        if (status == UserStatus.ACTIVE) {
            if (lockedUntil != null) {
                throw new BadRequestException("Không được thiết lập thời hạn khóa (lockedUntil) khi kích hoạt tài khoản ACTIVE");
            }
        } else if (status == UserStatus.LOCKED) {
            ensureNotLastActiveAdmin(target, oldStatus, "khóa");
            if (reason == null || reason.isBlank()) {
                throw new BadRequestException("Vui lòng nhập lý do khi khóa tài khoản");
            }
            if (lockedUntil != null) {
                LocalDateTime nowInVietnam = LocalDateTime.now(VIETNAM_ZONE);
                if (lockedUntil.isBefore(nowInVietnam)) {
                    throw new BadRequestException("Thời hạn khóa tài khoản phải là thời điểm trong tương lai (theo múi giờ Việt Nam GMT+7)");
                }
            }
        } else if (status == UserStatus.INACTIVE) {
            ensureNotLastActiveAdmin(target, oldStatus, "chuyển sang trạng thái không hoạt động");
            if (lockedUntil != null) {
                throw new BadRequestException("Không được thiết lập thời hạn khóa (lockedUntil) đối với trạng thái INACTIVE");
            }
        } else if (status == UserStatus.DELETED) {
            ensureNotLastActiveAdmin(target, oldStatus, "xóa mềm");
            if (reason == null || reason.isBlank()) {
                throw new BadRequestException("Vui lòng nhập lý do khi xóa tài khoản");
            }
            if (lockedUntil != null) {
                throw new BadRequestException("Không được thiết lập thời hạn khóa (lockedUntil) khi xóa tài khoản");
            }
        }

        target.setStatus(status);
        if (status == UserStatus.ACTIVE) {
            target.setFailedLoginCount(0);
            target.setLockedUntil(null);
            if (oldStatus == UserStatus.INACTIVE || oldStatus == UserStatus.DELETED) {
                LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
                target.setVerified(true);
                target.setLastLoginAt(now);
                if (target.getEmailVerifiedAt() == null) {
                    target.setEmailVerifiedAt(now);
                }
            }
        } else if (status == UserStatus.LOCKED) {
            target.setLockedUntil(lockedUntil);
            revokeActiveSessions(targetUserId);
        } else if (status == UserStatus.INACTIVE) {
            // Đánh dấu cần xác thực lại email trước khi đăng nhập
            target.setVerified(false);
            target.setLockedUntil(null);
            revokeActiveSessions(targetUserId);
        } else if (status == UserStatus.DELETED) {
            target.setLockedUntil(null);
            revokeActiveSessions(targetUserId);
        }

        UserModel saved = userRepository.saveAndFlush(target);

        String action = resolveStatusAuditAction(oldStatus, status);
        String auditDetail = resolveStatusAuditDetail(status, reason, lockedUntil);

        auditService.log(
                actor,
                AuditActorType.USER,
                "USER",
                action,
                "UserModel",
                targetUserId,
                oldStatus != null ? oldStatus.name() : null,
                status.name(),
                auditDetail,
                null
        );

        return UserMapper.toDto(saved);
    }

    @Override
    @Transactional
    public UserDto updateUserRole(Long actorId, Long targetUserId, UserRole role, String reason) {
        if (actorId.equals(targetUserId)) {
            throw new BadRequestException("Không thể tự thay đổi vai trò của chính mình");
        }
        if (role == null) {
            throw new BadRequestException("Vai trò không được để trống");
        }
        if (reason == null || reason.isBlank()) {
            throw new BadRequestException("Vui lòng nhập lý do khi thay đổi vai trò người dùng");
        }

        UserModel actor = findUser(actorId);
        UserModel target = findUser(targetUserId);
        if (target.getStatus() == UserStatus.DELETED) {
            throw new ConflictException("Không thể thay đổi vai trò của tài khoản đã bị xóa");
        }
        UserRole oldRole = target.getRole();

        if (oldRole == UserRole.ADMIN && role != UserRole.ADMIN) {
            long activeAdminCount = userRepository.countByRoleNameAndStatus(UserRole.ADMIN.name(), UserStatus.ACTIVE);
            if (activeAdminCount <= 1 && target.getStatus() == UserStatus.ACTIVE) {
                throw new ConflictException("Không thể hạ quyền Quản trị viên (ADMIN) đang hoạt động duy nhất trong hệ thống");
            }
        }

        RoleModel roleEntity = roleRepository.findByName(role.name())
                .orElseThrow(() -> new NotFoundException("Không tìm thấy vai trò: " + role.name()));

        target.setRoleEntity(roleEntity);
        UserModel saved = userRepository.saveAndFlush(target);

        revokeActiveSessions(targetUserId);

        auditService.log(
                actor,
                AuditActorType.USER,
                "USER",
                "USER_ROLE_CHANGED",
                "UserModel",
                targetUserId,
                oldRole != null ? oldRole.name() : null,
                role.name(),
                reason.trim(),
                null
        );

        return UserMapper.toDto(saved);
    }

    private void validateAvatarFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("Vui lòng chọn file ảnh để tải lên");
        }
        if (file.getSize() > MAX_AVATAR_SIZE_BYTES) {
            throw new BadRequestException("Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB)");
        }
        String filename = file.getOriginalFilename() != null ? file.getOriginalFilename().toLowerCase() : "";
        String contentType = file.getContentType() != null ? file.getContentType().toLowerCase() : "";

        boolean isAllowedExt = filename.endsWith(".jpg") || filename.endsWith(".jpeg")
                || filename.endsWith(".png") || filename.endsWith(".webp") || filename.endsWith(".gif");
        boolean isAllowedMime = contentType.equals("image/jpeg") || contentType.equals("image/jpg")
                || contentType.equals("image/png") || contentType.equals("image/webp")
                || contentType.equals("image/gif") || contentType.equals("application/octet-stream");

        if (!isAllowedExt && !isAllowedMime) {
            throw new BadRequestException("Định dạng file không hợp lệ (chỉ hỗ trợ JPG, PNG, WEBP, GIF)");
        }
    }

    private void cleanupOldAvatarSafely(String oldAvatarUrl, Long userId) {
        String publicId = extractPublicIdFromUrl(oldAvatarUrl);
        if (publicId != null && !publicId.isBlank()) {
            try {
                mediaStorageService.deleteImage(publicId, userId);
            } catch (Exception e) {
                log.warn("Không thể xóa ảnh đại diện cũ trên storage (publicId: {}): {}", publicId, e.getMessage());
            }
        }
    }

    private String extractPublicIdFromUrl(String avatarUrl) {
        if (!StringUtils.hasText(avatarUrl)) {
            return null;
        }
        // Trường hợp local upload: /uploads/nexspace/avatars/filename.jpg
        if (avatarUrl.contains("/uploads/")) {
            int idx = avatarUrl.indexOf("/uploads/");
            return avatarUrl.substring(idx + "/uploads/".length());
        }
        // Trường hợp Cloudinary: .../upload/(v[0-9]+/)?(nexspace/avatars/filename)(.ext)?
        if (avatarUrl.contains("cloudinary.com") && avatarUrl.contains("/upload/")) {
            String path = avatarUrl.substring(avatarUrl.indexOf("/upload/") + "/upload/".length());
            if (path.matches("^v\\d+/.*")) {
                path = path.substring(path.indexOf('/') + 1);
            }
            int dotIdx = path.lastIndexOf('.');
            if (dotIdx > 0) {
                path = path.substring(0, dotIdx);
            }
            return path;
        }
        return null;
    }

    private void ensureNotLastActiveAdmin(UserModel target, UserStatus oldStatus, String actionVerb) {
        if (target.getRole() == UserRole.ADMIN && oldStatus == UserStatus.ACTIVE) {
            long activeAdminCount = userRepository.countByRoleNameAndStatus(UserRole.ADMIN.name(), UserStatus.ACTIVE);
            if (activeAdminCount <= 1) {
                throw new ConflictException("Không thể " + actionVerb + " tài khoản Quản trị viên (ADMIN) đang hoạt động duy nhất trong hệ thống");
            }
        }
    }

    private void revokeActiveSessions(Long targetUserId) {
        List<UserSessionModel> activeSessions = userSessionRepository.findByUserIdAndRevokedAtIsNull(targetUserId);
        if (!activeSessions.isEmpty()) {
            LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
            activeSessions.forEach(session -> session.setRevokedAt(now));
            userSessionRepository.saveAll(activeSessions);
        }
    }

    private String resolveStatusAuditAction(UserStatus oldStatus, UserStatus newStatus) {
        return switch (newStatus) {
            case LOCKED -> "USER_LOCKED";
            case DELETED -> "USER_DELETED";
            case INACTIVE -> "USER_DEACTIVATED";
            case ACTIVE -> {
                if (oldStatus == UserStatus.DELETED) {
                    yield "USER_RESTORED";
                }
                if (oldStatus == UserStatus.INACTIVE) {
                    yield "USER_ACTIVATED";
                }
                yield "USER_UNLOCKED";
            }
        };
    }

    private String resolveStatusAuditDetail(UserStatus status, String reason, LocalDateTime lockedUntil) {
        String baseDetail;
        if (reason != null && !reason.isBlank()) {
            baseDetail = reason;
        } else {
            baseDetail = switch (status) {
                case LOCKED -> "Khóa tài khoản";
                case DELETED -> "Xóa mềm tài khoản";
                case INACTIVE -> "Chuyển sang trạng thái chưa kích hoạt";
                case ACTIVE -> "Mở khóa tài khoản";
            };
        }
        if (status == UserStatus.LOCKED && lockedUntil != null) {
            return baseDetail + " (Khóa tạm đến: " + lockedUntil.format(DATE_TIME_FORMATTER) + " GMT+7)";
        }
        return baseDetail;
    }

    private UserModel findUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new NotFoundException("Không tìm thấy người dùng"));
    }
}
