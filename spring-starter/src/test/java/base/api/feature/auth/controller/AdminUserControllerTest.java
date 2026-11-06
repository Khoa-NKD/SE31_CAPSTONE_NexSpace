package base.api.feature.auth.controller;

import base.api.feature.auth.dto.request.UpdateUserStatusDto;
import base.api.feature.auth.dto.response.UserDto;
import base.api.feature.auth.service.IUserService;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.AuthUser;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminUserControllerTest {

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
        objectMapper = new ObjectMapper();

        AdminUserController controller = new AdminUserController(userService);
        org.springframework.test.util.ReflectionTestUtils.setField(controller, "currentUserProvider", new base.api.shared.security.CurrentUserProvider());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        UserModel admin = new UserModel();
        admin.setId(1L);
        admin.setUserName("admin");
        admin.setPassword("hashed");
        admin.setStatus(UserStatus.ACTIVE);
        admin.setRoleEntity(new RoleModel(UserRole.ADMIN.name(), "Admin"));

        AuthUser principal = new AuthUser(admin);
        var auth = UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("PATCH /api/admin/users/{id}/status - Khóa tài khoản người dùng kèm lý do")
    void updateStatus_LockUser_Success() throws Exception {
        UpdateUserStatusDto dto = new UpdateUserStatusDto();
        dto.setStatus(UserStatus.LOCKED);
        dto.setReason("Tài khoản có dấu hiệu gian lận");

        UserDto userDto = UserDto.builder()
                .id(10L)
                .userName("fraud_user")
                .status(UserStatus.LOCKED)
                .build();

        when(userService.updateUserStatus(eq(1L), eq(10L), eq(UserStatus.LOCKED), eq("Tài khoản có dấu hiệu gian lận")))
                .thenReturn(userDto);

        mockMvc.perform(patch("/api/admin/users/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Cập nhật trạng thái thành công"))
                .andExpect(jsonPath("$.data.status").value("LOCKED"));

        verify(userService).updateUserStatus(1L, 10L, UserStatus.LOCKED, "Tài khoản có dấu hiệu gian lận");
    }

    @Test
    @DisplayName("PATCH /api/admin/users/{id}/status - Mở khóa tài khoản người dùng")
    void updateStatus_UnlockUser_Success() throws Exception {
        UpdateUserStatusDto dto = new UpdateUserStatusDto();
        dto.setStatus(UserStatus.ACTIVE);
        dto.setReason("Đã xác minh danh tính hợp lệ");

        UserDto userDto = UserDto.builder()
                .id(10L)
                .userName("verified_user")
                .status(UserStatus.ACTIVE)
                .build();

        when(userService.updateUserStatus(eq(1L), eq(10L), eq(UserStatus.ACTIVE), eq("Đã xác minh danh tính hợp lệ")))
                .thenReturn(userDto);

        mockMvc.perform(patch("/api/admin/users/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("PATCH /api/admin/users/{id}/status - Thiếu trường status trả về 400 Bad Request")
    void updateStatus_MissingStatus_BadRequest() throws Exception {
        UpdateUserStatusDto dto = new UpdateUserStatusDto();

        mockMvc.perform(patch("/api/admin/users/10/status")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    @DisplayName("GET /api/admin/users/{id} - Lấy thông tin chi tiết người dùng")
    void getUser_Success() throws Exception {
        UserDto userDto = UserDto.builder()
                .id(10L)
                .userName("target_user")
                .email("target@nexspace.vn")
                .status(UserStatus.ACTIVE)
                .build();

        when(userService.getById(10L)).thenReturn(userDto);

        mockMvc.perform(get("/api/admin/users/10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(10))
                .andExpect(jsonPath("$.data.userName").value("target_user"));
    }
}
