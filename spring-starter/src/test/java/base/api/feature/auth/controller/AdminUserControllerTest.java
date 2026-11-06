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
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import base.api.shared.dto.PageRequestDTO;
import base.api.shared.enums.UserGender;
import base.api.shared.exception.NotFoundException;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class AdminUserControllerTest {

        private MockMvc mockMvc;
        private IUserService userService;
        private ObjectMapper objectMapper;

        @BeforeEach
        void setUp() {
                userService = mock(IUserService.class);
                objectMapper = new ObjectMapper();

                AdminUserController controller = new AdminUserController(userService);
                org.springframework.test.util.ReflectionTestUtils.setField(controller, "currentUserProvider",
                                new base.api.shared.security.CurrentUserProvider());

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
                var auth = UsernamePasswordAuthenticationToken.authenticated(principal, null,
                                principal.getAuthorities());
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

                when(userService.updateUserStatus(eq(1L), eq(10L), eq(UserStatus.LOCKED),
                                eq("Tài khoản có dấu hiệu gian lận"), eq(null)))
                                .thenReturn(userDto);

                mockMvc.perform(patch("/api/admin/users/10/status")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(dto)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.message").value("Cập nhật trạng thái thành công"))
                                .andExpect(jsonPath("$.data.status").value("LOCKED"));

                verify(userService).updateUserStatus(1L, 10L, UserStatus.LOCKED, "Tài khoản có dấu hiệu gian lận",
                                null);
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

                when(userService.updateUserStatus(eq(1L), eq(10L), eq(UserStatus.ACTIVE),
                                eq("Đã xác minh danh tính hợp lệ"), eq(null)))
                                .thenReturn(userDto);

                mockMvc.perform(patch("/api/admin/users/10/status")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(dto)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.status").value("ACTIVE"));

                verify(userService).updateUserStatus(1L, 10L, UserStatus.ACTIVE, "Đã xác minh danh tính hợp lệ", null);
        }

        @Test
        @DisplayName("PATCH /api/admin/users/{id}/status - Khóa tài khoản có thời hạn (lockedUntil)")
        void updateStatus_LockUserWithDuration_Success() throws Exception {
                LocalDateTime lockedUntil = LocalDateTime.now().plusDays(7);
                UpdateUserStatusDto dto = new UpdateUserStatusDto();
                dto.setStatus(UserStatus.LOCKED);
                dto.setReason("Tạm đình chỉ hoạt động 7 ngày");
                dto.setLockedUntil(lockedUntil);

                UserDto userDto = UserDto.builder()
                                .id(10L)
                                .userName("suspended_user")
                                .status(UserStatus.LOCKED)
                                .lockedUntil(lockedUntil)
                                .build();

                when(userService.updateUserStatus(eq(1L), eq(10L), eq(UserStatus.LOCKED),
                                eq("Tạm đình chỉ hoạt động 7 ngày"), any(LocalDateTime.class)))
                                .thenReturn(userDto);

                mockMvc.perform(patch("/api/admin/users/10/status")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(dto)))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.status").value("LOCKED"));
        }

        @Test
        @DisplayName("PATCH /api/admin/users/{id}/status - Thiếu trường status trả về 400 Bad Request")
        void updateStatus_MissingStatus_BadRequest() throws Exception {
                UpdateUserStatusDto dto = new UpdateUserStatusDto();
                dto.setReason("Lý do hợp lệ");

                mockMvc.perform(patch("/api/admin/users/10/status")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(dto)))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.statusCode").value(400));
        }

        @Test
        @DisplayName("PATCH /api/admin/users/{id}/status - Thiếu lý do thay đổi trạng thái trả về 400 Bad Request")
        void updateStatus_MissingReason_BadRequest() throws Exception {
                UpdateUserStatusDto dto = new UpdateUserStatusDto();
                dto.setStatus(UserStatus.LOCKED);
                dto.setReason("");

                mockMvc.perform(patch("/api/admin/users/10/status")
                                .contentType(MediaType.APPLICATION_JSON)
                                .content(objectMapper.writeValueAsString(dto)))
                                .andExpect(status().isBadRequest())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.statusCode").value(400));
        }

        @Test
        @DisplayName("GET /api/admin/users/{id} - Lấy thông tin chi tiết người dùng thành công")
        void getUser_Success() throws Exception {
                UserDto userDto = UserDto.builder()
                                .id(10L)
                                .userName("target_user")
                                .email("target@nexspace.vn")
                                .firstName("Van A")
                                .lastName("Nguyen")
                                .fullName("Nguyen Van A")
                                .phone("0912345678")
                                .gender(UserGender.MALE)
                                .birthDate(LocalDate.of(1995, 5, 20))
                                .avatar("https://res.cloudinary.com/nexspace/avatar.png")
                                .verified(true)
                                .twoFactorEnabled(true)
                                .status(UserStatus.ACTIVE)
                                .role(UserRole.USER)
                                .createdAt(LocalDateTime.of(2026, 1, 1, 10, 0, 0))
                                .updatedAt(LocalDateTime.of(2026, 2, 1, 12, 0, 0))
                                .lastLoginAt(LocalDateTime.of(2026, 3, 1, 8, 30, 0))
                                .build();

                when(userService.getById(10L)).thenReturn(userDto);

                mockMvc.perform(get("/api/admin/users/10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.id").value(10))
                                .andExpect(jsonPath("$.data.userName").value("target_user"))
                                .andExpect(jsonPath("$.data.email").value("target@nexspace.vn"))
                                .andExpect(jsonPath("$.data.firstName").value("Van A"))
                                .andExpect(jsonPath("$.data.lastName").value("Nguyen"))
                                .andExpect(jsonPath("$.data.fullName").value("Nguyen Van A"))
                                .andExpect(jsonPath("$.data.phone").value("0912345678"))
                                .andExpect(jsonPath("$.data.gender").value("MALE"))
                                .andExpect(jsonPath("$.data.birthDate").value("1995-05-20"))
                                .andExpect(jsonPath("$.data.avatar")
                                                .value("https://res.cloudinary.com/nexspace/avatar.png"))
                                .andExpect(jsonPath("$.data.verified").value(true))
                                .andExpect(jsonPath("$.data.twoFactorEnabled").value(true))
                                .andExpect(jsonPath("$.data.status").value("ACTIVE"))
                                .andExpect(jsonPath("$.data.role").value("USER"));

                verify(userService).getById(10L);
        }

        @Test
        @DisplayName("GET /api/admin/users/{id} - Không tìm thấy người dùng trả về 404 Not Found")
        void getUser_NotFound() throws Exception {
                when(userService.getById(999L))
                                .thenThrow(new NotFoundException("Không tìm thấy người dùng với ID: 999"));

                mockMvc.perform(get("/api/admin/users/999"))
                                .andExpect(status().isNotFound())
                                .andExpect(jsonPath("$.success").value(false))
                                .andExpect(jsonPath("$.statusCode").value(404))
                                .andExpect(jsonPath("$.message").value("Không tìm thấy người dùng với ID: 999"));

                verify(userService).getById(999L);
        }

        @Test
        @DisplayName("GET /api/admin/users - Lấy danh sách phân trang người dùng thành công")
        void getUsers_Success() throws Exception {
                UserDto user1 = UserDto.builder()
                                .id(1L)
                                .userName("user_one")
                                .email("one@nexspace.vn")
                                .status(UserStatus.ACTIVE)
                                .role(UserRole.USER)
                                .build();
                UserDto user2 = UserDto.builder()
                                .id(2L)
                                .userName("user_two")
                                .email("two@nexspace.vn")
                                .status(UserStatus.ACTIVE)
                                .role(UserRole.ORGANIZER)
                                .build();

                var page = new PageImpl<>(List.of(user1, user2), PageRequest.of(0, 10), 2);
                when(userService.getUserPage(any(PageRequestDTO.class), eq(null), eq(null))).thenReturn(page);

                mockMvc.perform(get("/api/admin/users")
                                .param("page", "0")
                                .param("size", "10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content").isArray())
                                .andExpect(jsonPath("$.data.content.length()").value(2))
                                .andExpect(jsonPath("$.data.content[0].userName").value("user_one"))
                                .andExpect(jsonPath("$.data.content[1].userName").value("user_two"))
                                .andExpect(jsonPath("$.data.totalElements").value(2));
        }

        @Test
        @DisplayName("GET /api/admin/users - Tìm kiếm và lọc người dùng theo vai trò và trạng thái")
        void getUsers_WithFilters() throws Exception {
                UserDto user1 = UserDto.builder()
                                .id(1L)
                                .userName("admin_boss")
                                .email("boss@nexspace.vn")
                                .status(UserStatus.ACTIVE)
                                .role(UserRole.ADMIN)
                                .build();

                var page = new PageImpl<>(List.of(user1), PageRequest.of(0, 10), 1);
                when(userService.getUserPage(any(PageRequestDTO.class), eq(UserRole.ADMIN), eq(UserStatus.ACTIVE)))
                                .thenReturn(page);

                mockMvc.perform(get("/api/admin/users")
                                .param("search", "boss")
                                .param("role", "ADMIN")
                                .param("status", "ACTIVE")
                                .param("page", "0")
                                .param("size", "10"))
                                .andExpect(status().isOk())
                                .andExpect(jsonPath("$.success").value(true))
                                .andExpect(jsonPath("$.data.content.length()").value(1))
                                .andExpect(jsonPath("$.data.content[0].userName").value("admin_boss"));
        }
}
