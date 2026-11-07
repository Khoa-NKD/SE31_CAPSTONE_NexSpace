package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import base.api.feature.workspace.service.IMediaStorageService;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.GlobalExceptionHandler;
import base.api.shared.security.AuthUser;
import base.api.shared.security.CurrentUserProvider;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class MediaUploadControllerTest {

    private MockMvc mockMvc;
    private IMediaStorageService mediaStorageService;
    private CurrentUserProvider currentUserProvider;

    @BeforeEach
    void setUp() {
        mediaStorageService = mock(IMediaStorageService.class);
        currentUserProvider = mock(CurrentUserProvider.class);

        MediaUploadController controller = new MediaUploadController(mediaStorageService);
        ReflectionTestUtils.setField(controller, "currentUserProvider", currentUserProvider);

        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setControllerAdvice(new GlobalExceptionHandler())
                .build();
    }

    private void mockAuth(Long userId) {
        when(currentUserProvider.getCurrentUserId()).thenReturn(userId);
    }

    @Test
    @DisplayName("POST /api/media/upload: tải lên thành công trả về 200 OK với MediaUploadResponseDto")
    void uploadMedia_success() throws Exception {
        mockAuth(10L);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test-room.jpg",
                "image/jpeg",
                "fake image content".getBytes()
        );

        MediaUploadResponseDto responseDto = MediaUploadResponseDto.builder()
                .id("workspaces/test-room")
                .publicId("workspaces/test-room")
                .url("https://res.cloudinary.com/demo/image/upload/v1/workspaces/test-room.jpg")
                .originalFileName("test-room.jpg")
                .originalName("test-room.jpg")
                .filename("test-room.jpg")
                .mimeType("image/jpeg")
                .format("jpg")
                .bytes(1024L)
                .size(1024L)
                .uploadedAt(LocalDateTime.now())
                .build();

        when(mediaStorageService.uploadImage(any(), eq("custom-folder"), eq(10L)))
                .thenReturn(responseDto);

        mockMvc.perform(multipart("/api/media/upload")
                        .file(file)
                        .param("folder", "custom-folder"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Tải lên ảnh thành công"))
                .andExpect(jsonPath("$.data.url").value("https://res.cloudinary.com/demo/image/upload/v1/workspaces/test-room.jpg"))
                .andExpect(jsonPath("$.data.publicId").value("workspaces/test-room"))
                .andExpect(jsonPath("$.data.format").value("jpg"));

        verify(mediaStorageService).uploadImage(any(), eq("custom-folder"), eq(10L));
    }

    @Test
    @DisplayName("POST /api/media/upload: khi truyền param workspaceId thì gọi uploadWorkspaceImage")
    void uploadMedia_withWorkspaceId_success() throws Exception {
        mockAuth(10L);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "room.jpg",
                "image/jpeg",
                "content".getBytes()
        );

        MediaUploadResponseDto responseDto = MediaUploadResponseDto.builder()
                .id("nexspace/workspaces/5/room")
                .publicId("nexspace/workspaces/5/room")
                .url("https://res.cloudinary.com/demo/image/upload/v1/nexspace/workspaces/5/room.jpg")
                .build();

        when(mediaStorageService.uploadWorkspaceImage(any(), eq(5L), eq(10L)))
                .thenReturn(responseDto);

        mockMvc.perform(multipart("/api/media/upload")
                        .file(file)
                        .param("workspaceId", "5"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.publicId").value("nexspace/workspaces/5/room"));

        verify(mediaStorageService).uploadWorkspaceImage(any(), eq(5L), eq(10L));
    }

    @Test
    @DisplayName("POST /api/media/upload: ném 400 Bad Request khi file không hợp lệ")
    void uploadMedia_invalidFile_returnsBadRequest() throws Exception {
        mockAuth(10L);

        MockMultipartFile file = new MockMultipartFile(
                "file",
                "test.pdf",
                "application/pdf",
                "pdf content".getBytes()
        );

        when(mediaStorageService.uploadImage(any(), any(), eq(10L)))
                .thenThrow(new BadRequestException("Định dạng file không hợp lệ. Chỉ chấp nhận các định dạng ảnh: JPEG, PNG, WebP."));

        mockMvc.perform(multipart("/api/media/upload").file(file))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Định dạng file không hợp lệ. Chỉ chấp nhận các định dạng ảnh: JPEG, PNG, WebP."));
    }

    @Test
    @DisplayName("DELETE /api/media/delete: xóa ảnh thành công khi truyền param publicId")
    void deleteMedia_success() throws Exception {
        mockAuth(10L);

        mockMvc.perform(delete("/api/media/delete")
                        .param("publicId", "workspaces/sample-id"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa ảnh thành công"));

        verify(mediaStorageService).deleteImage(eq("workspaces/sample-id"), eq(10L));
    }

    @Test
    @DisplayName("DELETE /api/media/delete: xóa ảnh thành công khi truyền param id alias")
    void deleteMedia_withAliasId_success() throws Exception {
        mockAuth(10L);

        mockMvc.perform(delete("/api/media/delete")
                        .param("id", "workspaces/sample-alias-id"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.message").value("Xóa ảnh thành công"));

        verify(mediaStorageService).deleteImage(eq("workspaces/sample-alias-id"), eq(10L));
    }

    @Test
    @DisplayName("DELETE /api/media/delete: ném 400 Bad Request khi thiếu cả publicId và id")
    void deleteMedia_missingParams_returnsBadRequest() throws Exception {
        mockAuth(10L);

        mockMvc.perform(delete("/api/media/delete"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false));
    }
}
