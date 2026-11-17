package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.request.AddWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.ReorderMediaItemDto;
import base.api.feature.workspace.dto.request.ReorderWorkspaceMediaDto;
import base.api.feature.workspace.dto.request.SyncWorkspaceMediaDto;
import base.api.feature.workspace.dto.response.WorkspaceMediaResponseDto;
import base.api.feature.workspace.service.IWorkspaceMediaService;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.CurrentUserProvider;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.MediaType;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

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
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class WorkspaceMediaControllerTest {

    private MockMvc mockMvc;
    private IWorkspaceMediaService workspaceMediaService;
    private CurrentUserProvider currentUserProvider;
    private ObjectMapper objectMapper;

    @BeforeEach
    void setUp() {
        workspaceMediaService = mock(IWorkspaceMediaService.class);
        currentUserProvider = mock(CurrentUserProvider.class);
        objectMapper = new ObjectMapper();

        WorkspaceMediaController controller = new WorkspaceMediaController(workspaceMediaService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private void mockAuth(Long userId) {
        when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    }

    @Test
    @DisplayName("GET /api/workspaces/{id}/media trả về 200 OK và danh sách ảnh khi truy cập ẩn danh công khai")
    void getWorkspaceMedia_anonymous_returnsList() throws Exception {
        when(currentUserProvider.getCurrentUser()).thenReturn(java.util.Optional.empty());

        WorkspaceMediaResponseDto dto = WorkspaceMediaResponseDto.builder()
                .id(101L)
                .workspaceId(1L)
                .url("https://res.cloudinary.com/test/photo.jpg")
                .mediaType(base.api.shared.enums.MediaType.IMAGE)
                .cover(true)
                .displayOrder(0)
                .createdAt(LocalDateTime.now())
                .build();

        when(workspaceMediaService.getWorkspaceMedia(eq(1L), eq(null))).thenReturn(List.of(dto));

        mockMvc.perform(get("/api/workspaces/1/media"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data[0].id").value(101L))
                .andExpect(jsonPath("$.data[0].cover").value(true))
                .andExpect(jsonPath("$.data[0].url").value("https://res.cloudinary.com/test/photo.jpg"));
    }

    @Test
    @DisplayName("POST /api/workspaces/{id}/media trả về 201 Created")
    void addMedia_returnsCreated() throws Exception {
        mockAuth(10L);

        AddWorkspaceMediaDto requestDto = AddWorkspaceMediaDto.builder()
                .url("https://res.cloudinary.com/test/new.jpg")
                .isCover(true)
                .build();

        WorkspaceMediaResponseDto responseDto = WorkspaceMediaResponseDto.builder()
                .id(102L)
                .workspaceId(1L)
                .url("https://res.cloudinary.com/test/new.jpg")
                .mediaType(base.api.shared.enums.MediaType.IMAGE)
                .cover(true)
                .displayOrder(1)
                .build();

        when(workspaceMediaService.addMedia(eq(1L), any(AddWorkspaceMediaDto.class), eq(10L))).thenReturn(responseDto);

        mockMvc.perform(post("/api/workspaces/1/media")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(102L))
                .andExpect(jsonPath("$.data.cover").value(true));
    }

    @Test
    @DisplayName("POST /api/workspaces/{id}/media ném 400 Bad Request khi url để trống")
    void addMedia_blankUrl_returnsBadRequest() throws Exception {
        mockAuth(10L);

        AddWorkspaceMediaDto requestDto = AddWorkspaceMediaDto.builder()
                .url("")
                .build();

        mockMvc.perform(post("/api/workspaces/1/media")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("PATCH /api/workspaces/{id}/media/{mediaId}/cover trả về 200 OK")
    void setCover_returnsOk() throws Exception {
        mockAuth(10L);

        WorkspaceMediaResponseDto responseDto = WorkspaceMediaResponseDto.builder()
                .id(101L)
                .workspaceId(1L)
                .url("https://res.cloudinary.com/test/photo.jpg")
                .cover(true)
                .build();

        when(workspaceMediaService.setCover(eq(1L), eq(101L), eq(10L))).thenReturn(responseDto);

        mockMvc.perform(patch("/api/workspaces/1/media/101/cover"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.cover").value(true));
    }

    @Test
    @DisplayName("PUT /api/workspaces/{id}/media/reorder trả về 200 OK")
    void reorderMedia_returnsOk() throws Exception {
        mockAuth(10L);

        ReorderWorkspaceMediaDto requestDto = ReorderWorkspaceMediaDto.builder()
                .items(List.of(
                        ReorderMediaItemDto.builder().mediaId(101L).displayOrder(1).build()
                ))
                .build();

        when(workspaceMediaService.reorderMedia(eq(1L), any(ReorderWorkspaceMediaDto.class), eq(10L)))
                .thenReturn(List.of());

        mockMvc.perform(put("/api/workspaces/1/media/reorder")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("PUT /api/workspaces/{id}/media/sync trả về 200 OK")
    void syncMedia_returnsOk() throws Exception {
        mockAuth(10L);

        SyncWorkspaceMediaDto requestDto = SyncWorkspaceMediaDto.builder()
                .items(List.of(
                        AddWorkspaceMediaDto.builder().url("https://res.cloudinary.com/test/a.jpg").build()
                ))
                .build();

        when(workspaceMediaService.syncMedia(eq(1L), any(SyncWorkspaceMediaDto.class), eq(10L)))
                .thenReturn(List.of());

        mockMvc.perform(put("/api/workspaces/1/media/sync")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(requestDto)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true));
    }

    @Test
    @DisplayName("DELETE /api/workspaces/{id}/media/{mediaId} trả về 200 OK")
    void deleteMedia_returnsOk() throws Exception {
        mockAuth(10L);

        mockMvc.perform(delete("/api/workspaces/1/media/101"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa ảnh thành công"));

        verify(workspaceMediaService).deleteMedia(eq(1L), eq(101L), eq(10L));
    }

    @Test
    @DisplayName("POST /api/workspaces/{id}/media/upload: tải lên ảnh multipart trực tiếp trả về 201 Created")
    void uploadWorkspaceMedia_returnsCreated() throws Exception {
        mockAuth(10L);

        org.springframework.mock.web.MockMultipartFile file = new org.springframework.mock.web.MockMultipartFile(
                "file", "office.jpg", "image/jpeg", "image bytes".getBytes()
        );

        WorkspaceMediaResponseDto responseDto = WorkspaceMediaResponseDto.builder()
                .id(105L)
                .workspaceId(1L)
                .url("https://res.cloudinary.com/test/nexspace/workspaces/1/office.jpg")
                .cover(true)
                .build();

        when(workspaceMediaService.uploadAndAddMedia(eq(1L), any(), eq(true), eq(10L)))
                .thenReturn(responseDto);

        mockMvc.perform(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/workspaces/1/media/upload")
                        .file(file)
                        .param("isCover", "true"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.id").value(105L))
                .andExpect(jsonPath("$.data.url").value("https://res.cloudinary.com/test/nexspace/workspaces/1/office.jpg"));

        verify(workspaceMediaService).uploadAndAddMedia(eq(1L), any(), eq(true), eq(10L));
    }
}
