package base.api.feature.auth.controller;

import base.api.feature.auth.dto.request.DeleteAccountDto;
import base.api.feature.auth.dto.request.UpdateAvatarDto;
import base.api.feature.auth.dto.request.UpdateProfileDto;
import base.api.feature.auth.dto.request.UpdateProfileMultipartDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IUserService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserGender;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.exception.NotFoundException;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    @AfterEach
    void clearAuthentication() {
        SecurityContextHolder.clearContext();
    }

    private MockMvc mockMvc;
    private IUserService userService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        userService = mock(IUserService.class);
        UserController controller = new UserController(userService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", new CurrentUserProvider());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new JavaTimeModule());

        UserModel user = new UserModel();
        user.setId(42L);
        user.setUserName("phong_tester");
        user.setEmail("phong@example.com");
        user.setRoleEntity(new RoleModel(UserRole.USER.name(), null));
        AuthUser authUser = new AuthUser(user);
        UsernamePasswordAuthenticationToken auth =
                new UsernamePasswordAuthenticationToken(authUser, null, authUser.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("GET /api/users/me trả về thông tin hồ sơ của tài khoản đang đăng nhập")
    void getMyProfileReturnsUserDtoSuccessfully() throws Exception {
        UserDto dto = UserDto.builder()
                .id(42L)
                .userName("phong_tester")
                .email("phong@example.com")
                .firstName("Phong")
                .lastName("Nguyễn")
                .fullName("Nguyễn Phong")
                .phone("0912345678")
                .birthDate(LocalDate.of(2000, 1, 1))
                .gender(UserGender.MALE)
                .avatar("https://example.com/avatar.jpg")
                .status(UserStatus.ACTIVE)
                .role(UserRole.USER)
                .createdAt(LocalDateTime.now())
                .build();

        when(userService.getById(42L)).thenReturn(dto);

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Lấy thông tin hồ sơ thành công"))
                .andExpect(jsonPath("$.data.id").value(42))
                .andExpect(jsonPath("$.data.userName").value("phong_tester"))
                .andExpect(jsonPath("$.data.email").value("phong@example.com"))
                .andExpect(jsonPath("$.data.firstName").value("Phong"))
                .andExpect(jsonPath("$.data.lastName").value("Nguyễn"))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Phong"))
                .andExpect(jsonPath("$.data.gender").value("MALE"))
                .andExpect(jsonPath("$.data.avatar").value("https://example.com/avatar.jpg"));
    }

    @Test
    @DisplayName("GET /api/users/me khi không tìm thấy user trả về 404")
    void getMyProfileNotFoundReturns404() throws Exception {
        when(userService.getById(42L)).thenThrow(new NotFoundException("Không tìm thấy người dùng"));

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Không tìm thấy người dùng"));
    }

    @Test
    @DisplayName("PUT /api/users/me cập nhật hồ sơ cá nhân thành công")
    void updateMyProfileSuccess() throws Exception {
        UpdateProfileDto req = UpdateProfileDto.builder()
                .firstName("Tuấn")
                .lastName("Trần")
                .phone("0987654321")
                .birthDate(LocalDate.of(1995, 8, 15))
                .gender(UserGender.MALE)
                .avatar("https://res.cloudinary.com/demo/image/upload/avatar.jpg")
                .build();

        UserDto updatedDto = UserDto.builder()
                .id(42L)
                .userName("phong_tester")
                .firstName("Tuấn")
                .lastName("Trần")
                .fullName("Trần Tuấn")
                .phone("0987654321")
                .birthDate(LocalDate.of(1995, 8, 15))
                .gender(UserGender.MALE)
                .avatar("https://res.cloudinary.com/demo/image/upload/avatar.jpg")
                .status(UserStatus.ACTIVE)
                .role(UserRole.USER)
                .build();

        when(userService.updateProfile(eq(42L), any(UpdateProfileDto.class))).thenReturn(updatedDto);

        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Cập nhật hồ sơ thành công"))
                .andExpect(jsonPath("$.data.firstName").value("Tuấn"))
                .andExpect(jsonPath("$.data.phone").value("0987654321"));
    }

    @Test
    @DisplayName("PUT /api/users/me (Multipart) cập nhật hồ sơ kèm file ảnh tải từ máy tính")
    void updateMyProfileMultipartWithFileSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});

        UserDto updatedDto = UserDto.builder()
                .id(42L)
                .firstName("Tuấn")
                .avatar("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/uploaded.png")
                .build();

        when(userService.updateProfileWithMultipart(eq(42L), any(UpdateProfileMultipartDto.class))).thenReturn(updatedDto);

        mockMvc.perform(multipart("/api/users/me")
                        .file(file)
                        .with(request -> { request.setMethod("PUT"); return request; })
                        .param("firstName", "Tuấn")
                        .param("lastName", "Trần")
                        .param("phone", "0987654321"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Cập nhật hồ sơ thành công"))
                .andExpect(jsonPath("$.data.avatar").value("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/uploaded.png"));
    }

    @Test
    @DisplayName("PUT /api/users/me chấp nhận họ và tên tiếng Việt có dấu và dấu cách")
    void updateMyProfileAcceptsVietnameseWithSpaces() throws Exception {
        UpdateProfileDto req = UpdateProfileDto.builder()
                .firstName("Văn Tuấn")
                .lastName("Nguyễn Đình")
                .phone("0912345678")
                .build();

        UserDto updatedDto = UserDto.builder()
                .id(42L)
                .firstName("Văn Tuấn")
                .lastName("Nguyễn Đình")
                .fullName("Nguyễn Đình Văn Tuấn")
                .build();

        when(userService.updateProfile(eq(42L), any(UpdateProfileDto.class))).thenReturn(updatedDto);

        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.fullName").value("Nguyễn Đình Văn Tuấn"));
    }

    @Test
    @DisplayName("PUT /api/users/me thất bại khi tên để trống")
    void updateMyProfileFailsWhenFirstNameEmpty() throws Exception {
        UpdateProfileDto req = UpdateProfileDto.builder()
                .firstName("")
                .phone("0987654321")
                .build();

        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("PUT /api/users/me thất bại khi số điện thoại sai định dạng")
    void updateMyProfileFailsWhenPhoneInvalid() throws Exception {
        UpdateProfileDto req = UpdateProfileDto.builder()
                .firstName("Phong")
                .phone("12345")
                .build();

        mockMvc.perform(put("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("PUT /api/users/me/avatar cập nhật avatar bằng link mạng thành công")
    void updateMyAvatarUrlSuccess() throws Exception {
        UpdateAvatarDto req = UpdateAvatarDto.builder()
                .avatarUrl("https://images.unsplash.com/photo-sample.jpg")
                .build();

        UserDto updatedDto = UserDto.builder()
                .id(42L)
                .avatar("https://images.unsplash.com/photo-sample.jpg")
                .build();

        when(userService.updateAvatarUrl(42L, "https://images.unsplash.com/photo-sample.jpg")).thenReturn(updatedDto);

        mockMvc.perform(put("/api/users/me/avatar")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(req)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Cập nhật ảnh đại diện thành công"))
                .andExpect(jsonPath("$.data.avatar").value("https://images.unsplash.com/photo-sample.jpg"));
    }

    @Test
    @DisplayName("PUT /api/users/me/avatar (Multipart) cập nhật avatar bằng file tải từ máy tính")
    void updateMyAvatarMultipartWithFileSuccess() throws Exception {
        MockMultipartFile file = new MockMultipartFile("file", "avatar.png", "image/png", new byte[]{1, 2, 3});

        UserDto updatedDto = UserDto.builder()
                .id(42L)
                .avatar("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/uploaded.png")
                .build();

        when(userService.updateAvatar(eq(42L), any(base.api.feature.auth.dto.request.UpdateAvatarMultipartDto.class))).thenReturn(updatedDto);

        mockMvc.perform(multipart("/api/users/me/avatar")
                        .file(file)
                        .with(request -> { request.setMethod("PUT"); return request; }))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Cập nhật ảnh đại diện thành công"))
                .andExpect(jsonPath("$.data.avatar").value("https://res.cloudinary.com/demo/image/upload/v1/nexspace/avatars/uploaded.png"));
    }

    @Test
    @DisplayName("DELETE /api/users/me/avatar xóa ảnh đại diện thành công")
    void deleteMyAvatarSuccess() throws Exception {
        UserDto updatedDto = UserDto.builder()
                .id(42L)
                .avatar(null)
                .build();

        when(userService.deleteAvatar(42L)).thenReturn(updatedDto);

        mockMvc.perform(delete("/api/users/me/avatar"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa ảnh đại diện thành công"))
                .andExpect(jsonPath("$.data.avatar").isEmpty());
    }

    @Test
    @DisplayName("DELETE /api/users/me tự xóa tài khoản cá nhân thành công")
    void deleteMyAccount_Success() throws Exception {
        DeleteAccountDto dto = DeleteAccountDto.builder()
                .password("Secret@123")
                .reason("Không còn nhu cầu sử dụng")
                .build();

        mockMvc.perform(delete("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Tài khoản của bạn đã được xóa thành công"));
    }

    @Test
    @DisplayName("DELETE /api/users/me thiếu mật khẩu trả về 400 Bad Request")
    void deleteMyAccount_MissingPassword_Returns400() throws Exception {
        DeleteAccountDto dto = DeleteAccountDto.builder()
                .password("")
                .build();

        mockMvc.perform(delete("/api/users/me")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
