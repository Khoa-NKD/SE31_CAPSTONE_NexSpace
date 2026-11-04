package base.api.feature.workspace.controller;

import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import base.api.feature.workspace.service.IMediaStorageService;
import base.api.shared.base.BaseAPIController;
import base.api.shared.dto.ApiResponse;
import base.api.shared.exception.BadRequestException;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.util.StringUtils;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/media")
@RequiredArgsConstructor
@Tag(name = "Media Storage", description = "Tải lên và quản lý tệp tin đa phương tiện")
public class MediaUploadController extends BaseAPIController {

    private final IMediaStorageService mediaStorageService;

    @PostMapping(value = "/upload", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Tải lên một file ảnh (tối đa 5MB, JPG/PNG/WebP)")
    public ResponseEntity<ApiResponse<MediaUploadResponseDto>> uploadMedia(
            @Parameter(description = "File ảnh tải lên") @RequestParam("file") MultipartFile file,
            @Parameter(description = "Thư mục lưu trữ tùy chọn") @RequestParam(value = "folder", required = false) String folder
    ) {
        Long actorId = getCurrentUserId();
        MediaUploadResponseDto response = mediaStorageService.uploadImage(file, folder, actorId);
        return success(response, "Tải lên ảnh thành công");
    }

    @DeleteMapping("/delete")
    @PreAuthorize("isAuthenticated()")
    @Operation(summary = "Xóa một file ảnh theo publicId hoặc id")
    public ResponseEntity<ApiResponse<Void>> deleteMedia(
            @Parameter(description = "Public ID của ảnh") @RequestParam(value = "publicId", required = false) String publicId,
            @Parameter(description = "ID của ảnh (alias của publicId)") @RequestParam(value = "id", required = false) String id
    ) {
        String targetId = StringUtils.hasText(publicId) ? publicId : id;
        if (!StringUtils.hasText(targetId)) {
            throw new BadRequestException("publicId hoặc id không được để trống");
        }
        Long actorId = getCurrentUserId();
        mediaStorageService.deleteImage(targetId, actorId);
        return success(null, "Xóa ảnh thành công");
    }
}
