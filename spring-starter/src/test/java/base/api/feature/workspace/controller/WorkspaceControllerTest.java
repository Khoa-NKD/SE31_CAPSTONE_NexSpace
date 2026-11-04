package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.CreateWorkspaceDto;
import base.api.feature.workspace.dto.request.UpdateWorkspaceDto;
import base.api.feature.workspace.dto.request.WorkspaceLifecycleDto;
import base.api.feature.workspace.dto.response.WorkspaceDetailDto;
import base.api.feature.workspace.dto.response.WorkspaceDto;
import base.api.feature.workspace.service.IWorkspaceService;
import base.api.shared.dto.PageRequestDTO;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.BookingConfirmationMode;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceLifecycleAction;
import base.api.shared.enums.WorkspaceStatus;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.PageImpl;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WorkspaceControllerTest {

    private MockMvc mockMvc;
    private IWorkspaceService workspaceService;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        workspaceService = mock(IWorkspaceService.class);
        objectMapper = new ObjectMapper();
        objectMapper.registerModule(new com.fasterxml.jackson.datatype.jsr310.JavaTimeModule());

        WorkspaceController controller = new WorkspaceController(workspaceService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", new CurrentUserProvider());

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();

        UserModel organizer = new UserModel();
        organizer.setId(5L);
        organizer.setUserName("organizer_test");
        organizer.setPassword("hashed");
        organizer.setStatus(UserStatus.ACTIVE);
        organizer.setRoleEntity(new RoleModel(UserRole.ORGANIZER.name(), "Organizer"));

        AuthUser principal = new AuthUser(organizer);
        var auth = UsernamePasswordAuthenticationToken.authenticated(principal, null, principal.getAuthorities());
        SecurityContextHolder.getContext().setAuthentication(auth);
    }

    @Test
    @DisplayName("GET /api/v1/workspaces - Lấy danh sách workspace của Organizer thành công")
    void getMyWorkspaces_success() throws Exception {
        WorkspaceDto item = WorkspaceDto.builder()
                .id(1L)
                .name("NexSpace Central")
                .category(WorkspaceCategory.COWORKING_HUB)
                .status(WorkspaceStatus.DRAFT)
                .reviewStatus("Draft")
                .operatingStatus("Inactive")
                .organizerId(5L)
                .build();

        when(workspaceService.getMyWorkspaces(eq(5L), eq(null), any(PageRequestDTO.class)))
                .thenReturn(new PageImpl<>(List.of(item)));

        mockMvc.perform(get("/api/v1/workspaces")
                        .param("page", "1")
                        .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.listObjects[0].id").value(1))
                .andExpect(jsonPath("$.data.listObjects[0].name").value("NexSpace Central"))
                .andExpect(jsonPath("$.data.listObjects[0].status").value("DRAFT"));

        verify(workspaceService).getMyWorkspaces(eq(5L), eq(null), any(PageRequestDTO.class));
    }

    @Test
    @DisplayName("POST /api/v1/workspaces - Tạo không gian làm việc thành công trả về HTTP 201")
    void createWorkspace_success() throws Exception {
        CreateWorkspaceDto dto = CreateWorkspaceDto.builder()
                .name("NexSpace Central")
                .category(WorkspaceCategory.COWORKING_HUB)
                .description("Mô tả không gian")
                .address("72 Lê Thánh Tôn")
                .district("Quận 1")
                .city("TP Hồ Chí Minh")
                .latitude(new BigDecimal("10.778"))
                .longitude(new BigDecimal("106.702"))
                .areaSqm(new BigDecimal("350"))
                .supportPhone("0912345678")
                .entryInstructions("Tầng 12 quầy lễ tân")
                .bookingConfirmationMode(BookingConfirmationMode.INSTANT)
                .build();

        WorkspaceDetailDto responseDto = WorkspaceDetailDto.builder()
                .id(1L)
                .name("NexSpace Central")
                .category(WorkspaceCategory.COWORKING_HUB)
                .description("Mô tả không gian")
                .address("72 Lê Thánh Tôn")
                .district("Quận 1")
                .city("TP Hồ Chí Minh")
                .latitude(new BigDecimal("10.778"))
                .longitude(new BigDecimal("106.702"))
                .areaSqm(new BigDecimal("350"))
                .supportPhone("0912345678")
                .entryInstructions("Tầng 12 quầy lễ tân")
                .bookingConfirmationMode(BookingConfirmationMode.INSTANT)
                .status(WorkspaceStatus.DRAFT)
                .organizerId(5L)
                .organizerName("organizer_test")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(workspaceService.createWorkspace(eq(5L), any(CreateWorkspaceDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(post("/api/v1/workspaces")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(201))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("NexSpace Central"))
                .andExpect(jsonPath("$.data.status").value("DRAFT"))
                .andExpect(jsonPath("$.data.organizerId").value(5));

        verify(workspaceService).createWorkspace(eq(5L), any(CreateWorkspaceDto.class));
    }

    @Test
    @DisplayName("POST /api/v1/workspaces - Thất bại khi thiếu tên hoặc danh mục (Validation 400)")
    void createWorkspace_validationError() throws Exception {
        CreateWorkspaceDto dto = CreateWorkspaceDto.builder()
                .name("") // Blank name
                .build();

        mockMvc.perform(post("/api/v1/workspaces")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.statusCode").value(400));
    }

    @Test
    @DisplayName("PATCH /api/v1/workspaces/{id} - Cập nhật không gian làm việc thành công trả về HTTP 200")
    void updateWorkspace_success() throws Exception {
        UpdateWorkspaceDto dto = UpdateWorkspaceDto.builder()
                .name("NexSpace Updated Hub")
                .description("Mô tả mới")
                .supportPhone("0999888777")
                .build();

        WorkspaceDetailDto responseDto = WorkspaceDetailDto.builder()
                .id(1L)
                .name("NexSpace Updated Hub")
                .category(WorkspaceCategory.COWORKING_HUB)
                .description("Mô tả mới")
                .supportPhone("0999888777")
                .status(WorkspaceStatus.DRAFT)
                .organizerId(5L)
                .organizerName("organizer_test")
                .createdAt(LocalDateTime.now())
                .updatedAt(LocalDateTime.now())
                .build();

        when(workspaceService.updateWorkspace(eq(5L), eq(1L), any(UpdateWorkspaceDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(patch("/api/v1/workspaces/1")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("NexSpace Updated Hub"))
                .andExpect(jsonPath("$.data.supportPhone").value("0999888777"));

        verify(workspaceService).updateWorkspace(eq(5L), eq(1L), any(UpdateWorkspaceDto.class));
    }

    @Test
    @DisplayName("DELETE /api/v1/workspaces/{id} - Xóa mềm không gian làm việc thành công trả về HTTP 200")
    void deleteWorkspace_success() throws Exception {
        WorkspaceDetailDto responseDto = WorkspaceDetailDto.builder()
                .id(1L)
                .name("NexSpace Central")
                .status(WorkspaceStatus.ARCHIVED)
                .operatingStatus("Archived")
                .organizerId(5L)
                .build();

        when(workspaceService.archiveWorkspace(eq(5L), eq(1L))).thenReturn(responseDto);

        mockMvc.perform(delete("/api/v1/workspaces/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.statusCode").value(200))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.status").value("ARCHIVED"))
                .andExpect(jsonPath("$.data.operatingStatus").value("Archived"));

        verify(workspaceService).archiveWorkspace(eq(5L), eq(1L));
    }

    @Test
    @DisplayName("PATCH /api/v1/workspaces/{id}/lifecycle - Cập nhật vòng đời thành công")
    void updateLifecycle_success() throws Exception {
        WorkspaceLifecycleDto dto = WorkspaceLifecycleDto.builder()
                .action(WorkspaceLifecycleAction.ARCHIVE)
                .reason("Chủ sở hữu ngừng kinh doanh")
                .build();

        WorkspaceDetailDto responseDto = WorkspaceDetailDto.builder()
                .id(1L)
                .name("NexSpace Central")
                .status(WorkspaceStatus.ARCHIVED)
                .operatingStatus("Archived")
                .organizerId(5L)
                .build();

        when(workspaceService.updateLifecycle(eq(5L), eq(1L), any(WorkspaceLifecycleDto.class)))
                .thenReturn(responseDto);

        mockMvc.perform(patch("/api/v1/workspaces/1/lifecycle")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(dto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("ARCHIVED"));

        verify(workspaceService).updateLifecycle(eq(5L), eq(1L), any(WorkspaceLifecycleDto.class));
    }

    @Test
    @DisplayName("GET /api/v1/workspaces/{id} - Lấy chi tiết không gian thành công")
    void getWorkspaceDetail_success() throws Exception {
        WorkspaceDetailDto responseDto = WorkspaceDetailDto.builder()
                .id(1L)
                .name("NexSpace Central")
                .category(WorkspaceCategory.COWORKING_HUB)
                .address("72 Lê Thánh Tôn")
                .status(WorkspaceStatus.ACTIVE)
                .organizerId(5L)
                .build();

        when(workspaceService.getWorkspaceDetail(eq(5L), eq(1L)))
                .thenReturn(responseDto);

        mockMvc.perform(get("/api/v1/workspaces/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(1))
                .andExpect(jsonPath("$.data.name").value("NexSpace Central"));

        verify(workspaceService).getWorkspaceDetail(eq(5L), eq(1L));
    }

    @Test
    @DisplayName("GET /api/v1/workspaces/{id} - Hỗ trợ alias mã WS-xxx")
    void getWorkspaceDetail_aliasCode_success() throws Exception {
        WorkspaceDetailDto responseDto = WorkspaceDetailDto.builder()
                .id(101L)
                .name("NexSpace Code Hub")
                .status(WorkspaceStatus.ACTIVE)
                .organizerId(5L)
                .build();

        when(workspaceService.getWorkspaceDetail(eq(5L), eq(101L)))
                .thenReturn(responseDto);

        mockMvc.perform(get("/api/v1/workspaces/WS-101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(101));

        verify(workspaceService).getWorkspaceDetail(eq(5L), eq(101L));
    }

    @Test
    @DisplayName("GET /api/v1/workspaces/{id}/operating-hours - Lấy giờ hoạt động thành công")
    void getOperatingHours_success() throws Exception {
        base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto dto = base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto.builder()
                .dayOfWeek(1)
                .openTime(java.time.LocalTime.of(8, 0))
                .closeTime(java.time.LocalTime.of(22, 0))
                .isClosed(false)
                .build();

        when(workspaceService.getOperatingHours(eq(5L), eq(1L))).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/v1/workspaces/1/operating-hours"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].dayOfWeek").value(1))
                .andExpect(jsonPath("$.data[0].openTime").value("08:00"));

        verify(workspaceService).getOperatingHours(eq(5L), eq(1L));
    }

    @Test
    @DisplayName("PUT /api/v1/workspaces/{id}/operating-hours - Cập nhật giờ hoạt động thành công")
    void updateOperatingHours_success() throws Exception {
        base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto dto = base.api.feature.workspace.dto.response.WorkspaceOperatingHourDto.builder()
                .dayOfWeek(1)
                .openTime(java.time.LocalTime.of(9, 0))
                .closeTime(java.time.LocalTime.of(18, 0))
                .isClosed(false)
                .build();

        when(workspaceService.updateOperatingHours(eq(5L), eq(1L), any())).thenReturn(List.of(dto));

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put("/api/v1/workspaces/1/operating-hours")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(List.of(dto))))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].dayOfWeek").value(1));

        verify(workspaceService).updateOperatingHours(eq(5L), eq(1L), any());
    }
}
