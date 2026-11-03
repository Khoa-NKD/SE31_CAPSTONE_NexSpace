package base.api.feature.workspace.service.impl;

import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import base.api.feature.workspace.service.IMediaStorageService;
import base.api.shared.exception.BadRequestException;
import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.Arrays;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Slf4j
@Service
public class CloudinaryStorageServiceImpl implements IMediaStorageService {

    public static final long MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB (BR-37)
    public static final List<String> ALLOWED_MIME_TYPES = Arrays.asList(
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp"
    );

    @Value("${cloudinary.cloud-name:}")
    private String cloudName;

    @Value("${cloudinary.api-key:}")
    private String apiKey;

    @Value("${cloudinary.api-secret:}")
    private String apiSecret;

    @Value("${cloudinary.folder:nexspace/workspaces}")
    private String defaultFolder;

    @Value("${app.api-url:http://localhost:8080}")
    private String apiUrl;

    @Override
    public MediaUploadResponseDto uploadImage(MultipartFile file, String folder, Long actorId) {
        validateFile(file);

        String targetFolder = (folder != null && !folder.isBlank()) ? folder : defaultFolder;

        if (isCloudinaryConfigured()) {
            return uploadToCloudinary(file, targetFolder, actorId);
        } else {
            log.info("Cloudinary credentials not configured; falling back to local filesystem storage");
            return uploadToLocalStorage(file, targetFolder, actorId);
        }
    }

    @Override
    public void deleteImage(String publicId, Long actorId) {
        if (!StringUtils.hasText(publicId)) {
            return;
        }

        if (isCloudinaryConfigured()) {
            try {
                Cloudinary cloudinary = createCloudinaryClient();
                cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());
                log.info("Deleted image from Cloudinary with publicId: {} by actor: {}", publicId, actorId);
            } catch (Exception e) {
                log.error("Failed to delete image from Cloudinary: {}", publicId, e);
            }
        } else {
            try {
                Path localFile = Paths.get("uploads", publicId);
                Files.deleteIfExists(localFile);
                log.info("Deleted local image file: {} by actor: {}", publicId, actorId);
            } catch (Exception e) {
                log.error("Failed to delete local image file: {}", publicId, e);
            }
        }
    }

    private void validateFile(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw new BadRequestException("File tải lên không được để trống.");
        }

        if (file.getSize() > MAX_FILE_SIZE_BYTES) {
            throw new BadRequestException("Dung lượng file vượt quá giới hạn cho phép (tối đa 5MB).");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType.toLowerCase())) {
            throw new BadRequestException("Định dạng file không hợp lệ. Chỉ chấp nhận các định dạng ảnh: JPEG, PNG, WebP.");
        }
    }

    private boolean isCloudinaryConfigured() {
        return StringUtils.hasText(cloudName) && StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret);
    }

    private Cloudinary createCloudinaryClient() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName.trim(),
                "api_key", apiKey.trim(),
                "api_secret", apiSecret.trim(),
                "secure", true
        ));
    }

    private MediaUploadResponseDto uploadToCloudinary(MultipartFile file, String folder, Long actorId) {
        try {
            Cloudinary cloudinary = createCloudinaryClient();
            Map<String, Object> params = ObjectUtils.asMap(
                    "folder", folder,
                    "resource_type", "image",
                    "overwrite", false
            );

            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), params);

            String secureUrl = (String) result.get("secure_url");
            String publicId = (String) result.get("public_id");
            String format = (String) result.get("format");
            Long bytes = result.get("bytes") instanceof Number n ? n.longValue() : file.getSize();
            Integer width = result.get("width") instanceof Number n ? n.intValue() : null;
            Integer height = result.get("height") instanceof Number n ? n.intValue() : null;
            String originalFileName = StringUtils.cleanPath(file.getOriginalFilename() != null ? file.getOriginalFilename() : "image." + format);

            log.info("Successfully uploaded image to Cloudinary: publicId={}, url={}, actorId={}", publicId, secureUrl, actorId);

            return MediaUploadResponseDto.builder()
                    .id(publicId)
                    .publicId(publicId)
                    .url(secureUrl)
                    .originalFileName(originalFileName)
                    .originalName(originalFileName)
                    .filename(originalFileName)
                    .mimeType(file.getContentType())
                    .format(format)
                    .bytes(bytes)
                    .size(bytes)
                    .width(width)
                    .height(height)
                    .uploadedAt(LocalDateTime.now())
                    .build();
        } catch (IOException e) {
            log.error("Cloudinary upload failed for file {}: {}", file.getOriginalFilename(), e.getMessage(), e);
            throw new BadRequestException("Không thể tải ảnh lên hệ thống lưu trữ Cloudinary: " + e.getMessage());
        }
    }

    private MediaUploadResponseDto uploadToLocalStorage(MultipartFile file, String folder, Long actorId) {
        try {
            Path targetDir = Paths.get("uploads", folder);
            Files.createDirectories(targetDir);

            String originalName = file.getOriginalFilename() != null ? StringUtils.cleanPath(file.getOriginalFilename()) : "image.jpg";
            String ext = "";
            int dotIdx = originalName.lastIndexOf('.');
            if (dotIdx >= 0) {
                ext = originalName.substring(dotIdx);
            } else if (file.getContentType() != null) {
                ext = switch (file.getContentType().toLowerCase()) {
                    case "image/png" -> ".png";
                    case "image/webp" -> ".webp";
                    default -> ".jpg";
                };
            }

            String storedFileName = UUID.randomUUID() + ext;
            Path filePath = targetDir.resolve(storedFileName);

            Files.copy(file.getInputStream(), filePath, StandardCopyOption.REPLACE_EXISTING);

            String relativePath = "/uploads/" + folder + "/" + storedFileName;
            String cleanApiUrl = apiUrl.endsWith("/") ? apiUrl.substring(0, apiUrl.length() - 1) : apiUrl;
            String fullUrl = cleanApiUrl + relativePath;

            String publicId = folder + "/" + storedFileName;
            String format = ext.startsWith(".") ? ext.substring(1) : ext;

            log.info("Successfully saved image to local filesystem: path={}, actorId={}", filePath, actorId);

            return MediaUploadResponseDto.builder()
                    .id(publicId)
                    .publicId(publicId)
                    .url(fullUrl)
                    .originalFileName(originalName)
                    .originalName(originalName)
                    .filename(storedFileName)
                    .mimeType(file.getContentType())
                    .format(format)
                    .bytes(file.getSize())
                    .size(file.getSize())
                    .uploadedAt(LocalDateTime.now())
                    .build();
        } catch (IOException e) {
            log.error("Local file storage failed: {}", e.getMessage(), e);
            throw new BadRequestException("Không thể lưu ảnh vào hệ thống file cục bộ: " + e.getMessage());
        }
    }
}

