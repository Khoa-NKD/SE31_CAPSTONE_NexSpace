package base.api.feature.workspace.service.impl;

import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import base.api.shared.exception.BadRequestException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.util.ReflectionTestUtils;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.Comparator;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class MediaStorageServiceImplTest {

    private CloudinaryStorageServiceImpl storageService;
    private final Path testUploadDir = Paths.get("uploads", "test-workspaces");

    @BeforeEach
    void setUp() {
        storageService = new CloudinaryStorageServiceImpl();
        // Leave Cloudinary keys blank to test local filesystem fallback
        ReflectionTestUtils.setField(storageService, "cloudName", "");
        ReflectionTestUtils.setField(storageService, "apiKey", "");
        ReflectionTestUtils.setField(storageService, "apiSecret", "");
        ReflectionTestUtils.setField(storageService, "rootFolder", "nexspace");
        ReflectionTestUtils.setField(storageService, "workspaceFolderPattern", "test-workspaces/{id}");
        ReflectionTestUtils.setField(storageService, "apiUrl", "http://localhost:8080");
    }

    @AfterEach
    void tearDown() throws IOException {
        if (Files.exists(testUploadDir)) {
            Files.walk(testUploadDir)
                    .sorted(Comparator.reverseOrder())
                    .map(Path::toFile)
                    .forEach(File::delete);
        }
    }

    @Test
    @DisplayName("uploadImage: ném BadRequestException khi file là null hoặc rỗng")
    void uploadImage_emptyFile_throwsBadRequest() {
        MockMultipartFile emptyFile = new MockMultipartFile("file", "test.jpg", "image/jpeg", new byte[0]);

        assertThatThrownBy(() -> storageService.uploadImage(emptyFile, "test-workspaces", 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File tải lên không được để trống.");

        assertThatThrownBy(() -> storageService.uploadImage(null, "test-workspaces", 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("File tải lên không được để trống.");
    }

    @Test
    @DisplayName("uploadImage: ném BadRequestException khi file vượt quá 5MB (BR-37)")
    void uploadImage_fileTooLarge_throwsBadRequest() {
        byte[] largeBytes = new byte[5 * 1024 * 1024 + 1];
        MockMultipartFile largeFile = new MockMultipartFile("file", "large.png", "image/png", largeBytes);

        assertThatThrownBy(() -> storageService.uploadImage(largeFile, "test-workspaces", 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB).");
    }

    @Test
    @DisplayName("uploadImage: ném BadRequestException khi định dạng file không phải JPEG, PNG, WebP")
    void uploadImage_invalidMimeType_throwsBadRequest() {
        MockMultipartFile pdfFile = new MockMultipartFile("file", "doc.pdf", "application/pdf", "dummy pdf content".getBytes());
        MockMultipartFile textFile = new MockMultipartFile("file", "notes.txt", "text/plain", "hello world".getBytes());
        MockMultipartFile gifFile = new MockMultipartFile("file", "animation.gif", "image/gif", "GIF89a".getBytes());

        assertThatThrownBy(() -> storageService.uploadImage(pdfFile, "test-workspaces", 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");

        assertThatThrownBy(() -> storageService.uploadImage(textFile, "test-workspaces", 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");

        assertThatThrownBy(() -> storageService.uploadImage(gifFile, "test-workspaces", 1L))
                .isInstanceOf(BadRequestException.class)
                .hasMessageContaining("Định dạng file không hợp lệ");
    }

    @Test
    @DisplayName("uploadImage: tải lên thành công ảnh JPEG hợp lệ qua local fallback")
    void uploadImage_validJpeg_success() {
        byte[] content = "fake jpeg binary data".getBytes();
        MockMultipartFile validFile = new MockMultipartFile("file", "office-space.jpg", "image/jpeg", content);

        MediaUploadResponseDto result = storageService.uploadImage(validFile, "test-workspaces", 42L);

        assertThat(result).isNotNull();
        assertThat(result.getUrl()).startsWith("http://localhost:8080/uploads/test-workspaces/");
        assertThat(result.getUrl()).endsWith(".jpg");
        assertThat(result.getOriginalFileName()).isEqualTo("office-space.jpg");
        assertThat(result.getMimeType()).isEqualTo("image/jpeg");
        assertThat(result.getFormat()).isEqualTo("jpg");
        assertThat(result.getBytes()).isEqualTo((long) content.length);
        assertThat(result.getSize()).isEqualTo((long) content.length);
        assertThat(result.getPublicId()).startsWith("test-workspaces/");
        assertThat(result.getId()).isEqualTo(result.getPublicId());
    }

    @Test
    @DisplayName("uploadImage: tải lên thành công ảnh WebP hợp lệ")
    void uploadImage_validWebp_success() {
        byte[] content = "fake webp binary data".getBytes();
        MockMultipartFile validFile = new MockMultipartFile("file", "modern-desk.webp", "image/webp", content);

        MediaUploadResponseDto result = storageService.uploadImage(validFile, "test-workspaces", 42L);

        assertThat(result).isNotNull();
        assertThat(result.getUrl()).endsWith(".webp");
        assertThat(result.getMimeType()).isEqualTo("image/webp");
        assertThat(result.getFormat()).isEqualTo("webp");
    }

    @Test
    @DisplayName("deleteImage: xóa file local không ném lỗi khi file tồn tại hoặc không tồn tại")
    void deleteImage_localFile_success() {
        byte[] content = "data to delete".getBytes();
        MockMultipartFile validFile = new MockMultipartFile("file", "delete-me.png", "image/png", content);
        MediaUploadResponseDto result = storageService.uploadImage(validFile, "test-workspaces", 42L);

        // Delete existing
        storageService.deleteImage(result.getPublicId(), 42L);

        // Delete non-existing (should not throw)
        storageService.deleteImage("non-existing-public-id", 42L);
        storageService.deleteImage(null, 42L);
        storageService.deleteImage("", 42L);
    }

    @Test
    @DisplayName("resolveWorkspaceFolder: thay thế {id} bằng workspaceId thực tế")
    void resolveWorkspaceFolder_withWorkspaceId_replacesPattern() {
        ReflectionTestUtils.setField(storageService, "rootFolder", "nexspace");
        ReflectionTestUtils.setField(storageService, "workspaceFolderPattern", "nexspace/workspaces/{id}");

        String folder = storageService.resolveWorkspaceFolder(99L);
        assertThat(folder).isEqualTo("nexspace/workspaces/99");
    }

    @Test
    @DisplayName("resolveWorkspaceFolder: khi workspaceId null thì trả về thư mục workspaces chung")
    void resolveWorkspaceFolder_withoutWorkspaceId_returnsFallback() {
        ReflectionTestUtils.setField(storageService, "rootFolder", "nexspace");
        ReflectionTestUtils.setField(storageService, "workspaceFolderPattern", "nexspace/workspaces/{id}");

        String folder = storageService.resolveWorkspaceFolder(null);
        assertThat(folder).isEqualTo("nexspace/workspaces");
    }

    @Test
    @DisplayName("uploadWorkspaceImage: tải lên file cục bộ vào thư mục phân cấp theo workspaceId")
    void uploadWorkspaceImage_success() {
        ReflectionTestUtils.setField(storageService, "rootFolder", "test-root");
        ReflectionTestUtils.setField(storageService, "workspaceFolderPattern", "test-workspaces/{id}");

        MockMultipartFile validFile = new MockMultipartFile(
                "file",
                "workspace-room.jpg",
                "image/jpeg",
                "image byte content".getBytes()
        );

        MediaUploadResponseDto result = storageService.uploadWorkspaceImage(validFile, 123L, 1L);
        assertThat(result).isNotNull();
        assertThat(result.getUrl()).contains("test-workspaces/123/");
        assertThat(result.getPublicId()).startsWith("test-workspaces/123/");
    }
}

