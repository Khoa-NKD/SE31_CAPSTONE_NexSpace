package base.api.feature.auth.controller;

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
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class UserControllerTest {

    private MockMvc mockMvc;
    private IUserService userService;

    @BeforeEach
    void setUp() {
        userService = mock(IUserService.class);
        UserController controller = new UserController(userService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", new CurrentUserProvider());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        UserModel user = new UserModel();
        user.setId(42L);
        user.setUserName("phong_tester");
        user.setEmail("phong@example.com");
        user.setPassword("secret");
        user.setStatus(UserStatus.ACTIVE);
        user.setRoleEntity(new RoleModel(UserRole.USER.name(), "Customer"));

        AuthUser principal = new AuthUser(user);
        var auth = UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("GET /api/v1/users/me trả về thông tin hồ sơ của tài khoản đang đăng nhập")
    void getMyProfileReturnsUserDtoSuccessfully() throws Exception {
        UserDto dto = UserDto.builder()
                .id(42L)
                .userName("phong_tester")
                .email("phong@example.com")
                .firstName("Phong")
                .lastName("Nguyen")
                .fullName("Nguyen Phong")
                .phone("0912345678")
                .gender(UserGender.MALE)
                .birthDate(LocalDate.of(2000, 5, 20))
                .avatar("https://res.cloudinary.com/demo/image/upload/sample.jpg")
                .verified(true)
                .status(UserStatus.ACTIVE)
                .role(UserRole.USER)
                .createdAt(LocalDateTime.of(2026, 1, 1, 10, 0))
                .lastLoginAt(LocalDateTime.of(2026, 11, 4, 8, 30))
                .build();

        when(userService.getById(42L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Lấy thông tin hồ sơ thành công"))
                .andExpect(jsonPath("$.data.id").value(42))
                .andExpect(jsonPath("$.data.userName").value("phong_tester"))
                .andExpect(jsonPath("$.data.email").value("phong@example.com"))
                .andExpect(jsonPath("$.data.firstName").value("Phong"))
                .andExpect(jsonPath("$.data.lastName").value("Nguyen"))
                .andExpect(jsonPath("$.data.phone").value("0912345678"))
                .andExpect(jsonPath("$.data.gender").value("MALE"))
                .andExpect(jsonPath("$.data.birthDate").value("2000-05-20"))
                .andExpect(jsonPath("$.data.avatar").value("https://res.cloudinary.com/demo/image/upload/sample.jpg"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                .andExpect(jsonPath("$.data.role").value("USER"));
    }

    @Test
    @DisplayName("GET /api/users/me (alias) cũng hoạt động chuẩn xác")
    void getMyProfileAliasReturnsOk() throws Exception {
        UserDto dto = UserDto.builder()
                .id(42L)
                .userName("phong_tester")
                .email("phong@example.com")
                .status(UserStatus.ACTIVE)
                .role(UserRole.USER)
                .build();

        when(userService.getById(42L)).thenReturn(dto);

        mockMvc.perform(get("/api/users/me"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(42));
    }

    @Test
    @DisplayName("GET /api/v1/users/me khi không tìm thấy user trả về 404")
    void getMyProfileNotFoundReturns404() throws Exception {
        when(userService.getById(42L)).thenThrow(new NotFoundException("Không tìm thấy người dùng"));

        mockMvc.perform(get("/api/v1/users/me"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Không tìm thấy người dùng"));
    }
}

