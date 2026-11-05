package base.api.feature.auth.service.impl;

import base.api.feature.auth.dto.request.ChangePasswordDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import base.api.feature.workspace.service.IMediaStorageService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.UserGender;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.io.IOException;
import java.time.LocalDate;
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
    private IMediaStorageService mediaStorageService;
    private UserServiceImpl service;
    private UserModel user;
    private UserModel admin;

    @BeforeEach
    void setUp() {
        userRepository = mock(IUserRepository.class);
        auditService = mock(IAuditService.class);
        mediaStorageService = mock(IMediaStorageService.class);
        service = new UserServiceImpl(userRepository, passwordEncoder, auditService, mediaStorageService);

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
    @DisplayName("Cập nhật thông tin hồ sơ thành công")
    void updateProfileUpdatesAllFieldsSuccessfully() {
        UpdateProfileDto dto = UpdateProfileDto.builder()
                .firstName("John")
                .lastName("Doe")
                .phone("0912345678")
                .birthDate(LocalDate.now().minusYears(20))
                .gender(UserGender.MALE)
                .avatar("https://res.cloudinary.com/demo/image/upload/sample.jpg")
                .build();

        UserDto result = service.updateProfile(1L, dto);

        assertThat(result.getFirstName()).isEqualTo("John");
        assertThat(result.getLastName()).isEqualTo("Doe");
        assertThat(result.getPhone()).isEqualTo("0912345678");
        assertThat(result.getGender()).isEqualTo(UserGender.MALE);
        assertThat(result.getAvatar()).isEqualTo("https://res.cloudinary.com/demo/image/upload/sample.jpg");
    }

    @Test
    @DisplayName("Cập nhật thông tin hồ sơ với họ và tên tiếng Việt có dấu và dấu cách")
    void updateProfileSupportsVietnameseNamesWithSpaces() {
        UpdateProfileDto dto = UpdateProfileDto.builder()
                .firstName("Anh Tuấn")
                .lastName("Nguyễn Đăng")
                .phone("0912345678")
                .build();

        UserDto result = service.updateProfile(1L, dto);

        assertThat(result.getFirstName()).isEqualTo("Anh Tuấn");
        assertThat(result.getLastName()).isEqualTo("Nguyễn Đăng");
    }

    @Test
    @DisplayName("Cập nhật hồ sơ thành công cho người dùng với ngày sinh trong quá khứ")
    void updateProfileAllowsValidBirthDate() {
        UpdateProfileDto dto = UpdateProfileDto.builder()
                .firstName("Tuấn")
                .birthDate(LocalDate.now().minusYears(16))
                .build();

        UserDto result = service.updateProfile(1L, dto);

        assertThat(result.getFirstName()).isEqualTo("Tuấn");
        assertThat(result.getBirthDate()).isEqualTo(LocalDate.now().minusYears(16));
    }

    @Test
    @DisplayName("Cập nhật hồ sơ với chuỗi avatar rỗng sẽ xóa avatar cũ của người dùng")
    void updateProfileWithEmptyAvatarDeletesOldAvatar() {
        user.setAvatar("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/old.jpg");

        UpdateProfileDto dto = UpdateProfileDto.builder()
                .firstName("Tuấn")
                .avatar("")
                .build();

        UserDto result = service.updateProfile(1L, dto);

        assertThat(result.getAvatar()).isNull();
        verify(mediaStorageService).deleteImage(eq("nexspace/avatars/old"), eq(1L));
    }

    @Test
    @DisplayName("Cập nhật hồ sơ cá nhân kèm tải ảnh từ máy tính (ảnh local) qua multipart thành công")
    void updateProfileWithMultipartUsingLocalFileSuccess() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});
        MediaUploadResponseDto uploadResponse = MediaUploadResponseDto.builder()
                .url("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/uploaded.png")
                .publicId("nexspace/avatars/uploaded")
                .build();
        when(mediaStorageService.uploadImage(any(), eq("nexspace/avatars"), eq(1L))).thenReturn(uploadResponse);

        base.api.feature.auth.dto.request.UpdateProfileMultipartDto dto = base.api.feature.auth.dto.request.UpdateProfileMultipartDto.builder()
                .firstName("Phong")
                .file(file)
                .build();

        UserDto result = service.updateProfileWithMultipart(1L, dto);

        assertThat(result.getFirstName()).isEqualTo("Phong");
        assertThat(result.getAvatar()).isEqualTo("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/uploaded.png");
    }

    @Test
    @DisplayName("Cập nhật hồ sơ cá nhân kèm link ảnh trên mạng qua multipart thành công")
    void updateProfileWithMultipartUsingWebUrlSuccess() {
        base.api.feature.auth.dto.request.UpdateProfileMultipartDto dto = base.api.feature.auth.dto.request.UpdateProfileMultipartDto.builder()
                .firstName("Phong")
                .avatar("https://images.unsplash.com/photo-sample.jpg")
                .build();

        UserDto result = service.updateProfileWithMultipart(1L, dto);

        assertThat(result.getFirstName()).isEqualTo("Phong");
        assertThat(result.getAvatar()).isEqualTo("https://images.unsplash.com/photo-sample.jpg");
    }

    @Test
    @DisplayName("Cách 1: Cập nhật ảnh đại diện bằng đường dẫn mạng (URL) thành công")
    void updateAvatarUrlSuccess() {
        String webUrl = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=500";

        UserDto result = service.updateAvatarUrl(1L, webUrl);

        assertThat(result.getAvatar()).isEqualTo(webUrl);
        verify(auditService).log(
                eq(user),
                eq(AuditActorType.USER),
                eq("USER"),
                eq("USER_AVATAR_UPDATED"),
                eq("UserModel"),
                eq(1L),
                eq(null),
                eq(webUrl),
                eq("Cập nhật ảnh đại diện bằng đường dẫn mạng"),
                eq(null)
        );
    }

    @Test
    @DisplayName("Cập nhật ảnh đại diện bằng link mạng thất bại khi không bắt đầu bằng http:// hoặc https://")
    void updateAvatarUrlRejectsInvalidProtocol() {
        assertThatThrownBy(() -> service.updateAvatarUrl(1L, "ftp://example.com/avatar.png"))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("phải bắt đầu bằng http:// hoặc https://");
    }

    @Test
    @DisplayName("Cập nhật ảnh đại diện bằng link rỗng sẽ tự động chuyển thành xóa ảnh đại diện")
    void updateAvatarUrlWithBlankDeletesAvatar() {
        user.setAvatar("https://images.unsplash.com/old-avatar.jpg");

        UserDto result = service.updateAvatarUrl(1L, "   ");

        assertThat(result.getAvatar()).isNull();
    }

    @Test
    @DisplayName("Cách 2: Tải lên ảnh đại diện từ máy tính (local file) thành công")
    void uploadAvatarSuccess() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});

        MediaUploadResponseDto uploadResponse = MediaUploadResponseDto.builder()
                .url("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/new-avatar.png")
                .publicId("nexspace/avatars/new-avatar")
                .build();

        when(mediaStorageService.uploadImage(any(), eq("nexspace/avatars"), eq(1L))).thenReturn(uploadResponse);

        UserDto result = service.uploadAvatar(1L, file);

        assertThat(result.getAvatar()).isEqualTo("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/new-avatar.png");
        verify(auditService).log(
                eq(user),
                eq(AuditActorType.USER),
                eq("USER"),
                eq("USER_AVATAR_UPDATED"),
                eq("UserModel"),
                eq(1L),
                eq(null),
                eq("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/new-avatar.png"),
                eq("Tải lên ảnh đại diện từ máy tính"),
                eq(null)
        );
    }

    @Test
    @DisplayName("Tải lên ảnh đại diện thất bại khi file rỗng")
    void uploadAvatarRejectsEmptyFile() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "empty.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> service.uploadAvatar(1L, emptyFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Vui lòng chọn file ảnh để tải lên");
    }

    @Test
    @DisplayName("Tải lên ảnh đại diện thất bại khi dung lượng file vượt quá 5MB")
    void uploadAvatarRejectsFileSizeOverLimit() {
        byte[] largeBytes = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.jpg", "image/jpeg", largeBytes);

        assertThatThrownBy(() -> service.uploadAvatar(1L, largeFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Dung lượng file vượt quá giới hạn");
    }

    @Test
    @DisplayName("Tải lên ảnh đại diện thất bại khi định dạng không phải ảnh")
    void uploadAvatarRejectsInvalidMimeType() {
        MockMultipartFile pdfFile = new MockMultipartFile("file", "doc.pdf", "application/pdf", new byte[]{1, 2, 3});

        assertThatThrownBy(() -> service.uploadAvatar(1L, pdfFile))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");
    }

    @Test
    @DisplayName("Xóa ảnh đại diện thành công và dọn dẹp storage")
    void deleteAvatarSuccess() {
        user.setAvatar("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/avatar.jpg");

        UserDto result = service.deleteAvatar(1L);

        assertThat(result.getAvatar()).isNull();
        verify(mediaStorageService).deleteImage(eq("nexspace/avatars/avatar"), eq(1L));
        verify(auditService).log(
                eq(user),
                eq(AuditActorType.USER),
                eq("USER"),
                eq("USER_AVATAR_DELETED"),
                eq("UserModel"),
                eq(1L),
                eq("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/avatar.jpg"),
                eq(null),
                eq("Xóa ảnh đại diện"),
                eq(null)
        );
    }

    @Test
    @DisplayName("Cập nhật avatar bằng DTO multipart kèm file ảnh tải từ máy tính")
    void updateAvatarMultipartWithFileSuccess() {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});
        when(mediaStorageService.uploadImage(any(), eq("nexspace/avatars"), eq(1L)))
                .thenReturn(MediaUploadResponseDto.builder()
                        .url("https://res.cloudinary.com/new.png")
                        .publicId("nexspace/avatars/new")
                        .build());

        base.api.feature.auth.dto.request.UpdateAvatarMultipartDto dto =
                base.api.feature.auth.dto.request.UpdateAvatarMultipartDto.builder()
                        .file(file)
                        .build();

        UserDto result = service.updateAvatar(1L, dto);

        assertThat(result.getAvatar()).isEqualTo("https://res.cloudinary.com/new.png");
    }

    @Test
    @DisplayName("Cập nhật avatar bằng DTO multipart kèm link ảnh mạng")
    void updateAvatarMultipartWithUrlSuccess() {
        base.api.feature.auth.dto.request.UpdateAvatarMultipartDto dto =
                base.api.feature.auth.dto.request.UpdateAvatarMultipartDto.builder()
                        .avatarUrl("https://images.unsplash.com/sample.jpg")
                        .build();

        UserDto result = service.updateAvatar(1L, dto);

        assertThat(result.getAvatar()).isEqualTo("https://images.unsplash.com/sample.jpg");
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
    @DisplayName("Tìm user theo ID thành công trả về UserDto đầy đủ thông tin")
    void getByIdReturnsUserDtoWhenFound() {
        user.setTwoFactorEnabled(true);
        when(userRepository.findById(1L)).thenReturn(Optional.of(user));

        UserDto result = service.getById(1L);

        assertThat(result).isNotNull();
        assertThat(result.getId()).isEqualTo(1L);
        assertThat(result.getUserName()).isEqualTo("john");
        assertThat(result.getEmail()).isEqualTo("john@example.com");
        assertThat(result.isTwoFactorEnabled()).isTrue();
        assertThat(result.getRole()).isEqualTo(UserRole.USER);
        assertThat(result.getStatus()).isEqualTo(UserStatus.ACTIVE);
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
