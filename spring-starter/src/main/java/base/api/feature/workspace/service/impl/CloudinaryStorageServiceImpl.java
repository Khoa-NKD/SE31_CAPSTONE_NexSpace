package base.api.feature.workspace.service.impl;

import base.api.feature.workspace.dto.response.MediaUploadResponseDto;
import base.api.feature.workspace.service.IMediaStorageService;
import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import base.api.feature.organizer.service.PrivateDocumentUnavailableException;
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

    public static final String PRIVATE_DOCUMENT_REFERENCE_PREFIX = "cloudinary:authenticated:";
    private static final String PRIVATE_DOCUMENT_FOLDER = "nexspace/organizer-verification";

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

    @Value("${cloudinary.folder.nexspace:nexspace}")
    private String rootFolder;

    @Value("${cloudinary.folder.nexspace.workspace:${cloudinary.folder.nexspace:nexspace}/workspaces/{id}}")
    private String workspaceFolderPattern;

    @Value("${app.api-url:http://localhost:8080}")
    private String apiUrl;

    @Override
    public String resolveWorkspaceFolder(Long workspaceId) {
        if (workspaceId != null && workspaceId > 0) {
            if (StringUtils.hasText(workspaceFolderPattern) && workspaceFolderPattern.contains("{id}")) {
                return workspaceFolderPattern.replace("{id}", String.valueOf(workspaceId));
            }
            String base = StringUtils.hasText(rootFolder) ? rootFolder.trim() : "nexspace";
            return base + "/workspaces/" + workspaceId;
        }
        if (StringUtils.hasText(workspaceFolderPattern)) {
            String fallback = workspaceFolderPattern.replace("/{id}", "").replace("{id}", "").trim();
            if (StringUtils.hasText(fallback)) {
                return fallback;
            }
        }
        return StringUtils.hasText(defaultFolder) ? defaultFolder.trim() : "nexspace/workspaces";
    }

    @Override
    public MediaUploadResponseDto uploadWorkspaceImage(MultipartFile file, Long workspaceId, Long actorId) {
        String targetFolder = resolveWorkspaceFolder(workspaceId);
        return uploadImage(file, targetFolder, actorId);
    }

    @Override
    public MediaUploadResponseDto uploadImage(MultipartFile file, String folder, Long actorId) {
        validateFile(file);

        String targetFolder = (folder != null && !folder.isBlank()) ? folder : resolveWorkspaceFolder(null);

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

    public boolean isCloudinaryConfigured() {
        return StringUtils.hasText(cloudName) && StringUtils.hasText(apiKey) && StringUtils.hasText(apiSecret);
    }

    /** Server-only signed delivery. Neither the signed URL nor upstream errors are exposed to callers. */
    @SuppressWarnings("unchecked")
    public byte[] readPrivateDocument(String reference) {
        String uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
        if (!isCloudinaryConfigured() || reference == null
                || !reference.matches(PRIVATE_DOCUMENT_REFERENCE_PREFIX + "(?:image:(?:" + PRIVATE_DOCUMENT_FOLDER + "|Organizers/[1-9][0-9]*/doc)"
                + "/" + uuid + "|raw:(?:" + PRIVATE_DOCUMENT_FOLDER + "|Organizers/[1-9][0-9]*/doc)/" + uuid + "\\.pdf)")) {
            throw new PrivateDocumentUnavailableException();
        }
        String value = reference.substring(PRIVATE_DOCUMENT_REFERENCE_PREFIX.length());
        int separator = value.indexOf(':');
        try {
            boolean raw = "raw".equals(value.substring(0, separator));
            // Raw PDFs use the short-lived authenticated download API, keeping CDN delivery restrictions intact.
            String signed = raw ? createCloudinaryClient().privateDownload(value.substring(separator + 1), null,
                    ObjectUtils.asMap("resource_type", "raw", "type", "authenticated", "expires_at", java.time.Instant.now().getEpochSecond() + 60))
                    : createCloudinaryClient().url().secure(true).signed(true)
                    .resourceType(value.substring(0, separator)).type("authenticated")
                    .generate(value.substring(separator + 1));
            var uri = java.net.URI.create(signed);
            if (!"https".equals(uri.getScheme()) || !(raw ? "api.cloudinary.com" : "res.cloudinary.com").equals(uri.getHost())
                    || uri.getUserInfo() != null || uri.getPort() != -1) {
                throw new PrivateDocumentUnavailableException();
            }
            return downloadPrivateDocument(uri);
        } catch (NotFoundException | PrivateDocumentUnavailableException ex) {
            throw ex;
        } catch (Exception ex) {
            throw new PrivateDocumentUnavailableException();
        }
    }

    /** Bounded, timeout-controlled transport; redirects cannot turn stored references into arbitrary requests. */
    protected byte[] downloadPrivateDocument(java.net.URI uri) {
        java.net.HttpURLConnection connection = null;
        try {
            connection = (java.net.HttpURLConnection) uri.toURL().openConnection();
            connection.setInstanceFollowRedirects(false);
            connection.setConnectTimeout(5000);
            connection.setReadTimeout(20000);
            if (connection.getResponseCode() == 404) throw new NotFoundException("Verification document file not found");
            if (connection.getResponseCode() != 200) throw new PrivateDocumentUnavailableException();
            try (var input = connection.getInputStream()) {
                byte[] bytes = input.readNBytes((int) MAX_FILE_SIZE_BYTES + 1);
                if (bytes.length == 0 || bytes.length > MAX_FILE_SIZE_BYTES) throw new PrivateDocumentUnavailableException();
                return bytes;
            }
        } catch (IOException ex) {
            throw new PrivateDocumentUnavailableException();
        } finally {
            if (connection != null) connection.disconnect();
        }
    }

    protected Cloudinary createCloudinaryClient() {
        return new Cloudinary(ObjectUtils.asMap(
                "cloud_name", cloudName.trim(),
                "api_key", apiKey.trim(),
                "api_secret", apiSecret.trim(),
                "secure", true
        ));
    }

    /**
     * Private document path: never uses the public media DTO, upload preset or delivery URL.
     * The organizer storage facade validates filename, extension, MIME and signature before calling this method.
     */
    public String uploadPrivateDocument(byte[] content, String generatedKey) {
        return uploadPrivateDocumentToFolder(content, generatedKey, PRIVATE_DOCUMENT_FOLDER);
    }

    public String uploadPrivateDocument(byte[] content, String generatedKey, Long organizerProfileId) {
        if (organizerProfileId == null || organizerProfileId < 1) throw new IllegalArgumentException("Organizer profile ID is required");
        return uploadPrivateDocumentToFolder(content, generatedKey, "Organizers/" + organizerProfileId + "/doc");
    }

    private String uploadPrivateDocumentToFolder(byte[] content, String generatedKey, String folder) {
        if (!isCloudinaryConfigured() || content == null || content.length == 0
                || content.length > MAX_FILE_SIZE_BYTES || generatedKey == null
                || !generatedKey.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(jpg|jpeg|png|pdf)")) {
            throw new IllegalStateException("Private document storage is unavailable or invalid");
        }
        boolean raw = generatedKey.endsWith(".pdf");
        String resourceType = raw ? "raw" : "image";
        String publicId = folder + "/"
                + (raw ? generatedKey : generatedKey.substring(0, generatedKey.lastIndexOf('.')));
        try {
            var uploader = createCloudinaryClient().uploader();
            Map<?, ?> result = uploader.upload(content, ObjectUtils.asMap(
                    "public_id", publicId, "asset_folder", folder, "resource_type", resourceType, "type", "authenticated",
                    "overwrite", false, "use_filename", false, "unique_filename", false));
            if ("true".equalsIgnoreCase(String.valueOf(result.get("existing")))) {
                throw new IllegalStateException("Private document ID already exists");
            }
            if (!publicId.equals(result.get("public_id")) || !resourceType.equals(result.get("resource_type"))
                    || !"authenticated".equals(result.get("type"))) {
                // Only compensate the new ID generated for this request, never a returned foreign asset ID.
                if (publicId.equals(result.get("public_id"))
                        && List.of("image", "raw", "video").contains(result.get("resource_type"))
                        && List.of("upload", "private", "authenticated").contains(result.get("type"))) {
                    try {
                        uploader.destroy(publicId, ObjectUtils.asMap("resource_type", result.get("resource_type"),
                                "type", result.get("type"), "invalidate", true));
                    } catch (Exception ignored) {
                        log.error("Could not compensate a document upload with unexpected access settings");
                    }
                }
                throw new IllegalStateException("Unexpected private document storage response");
            }
            return PRIVATE_DOCUMENT_REFERENCE_PREFIX + resourceType + ":" + publicId;
        } catch (Exception ex) {
            // Provider errors can contain credentials, identifiers or signed URLs. Do not propagate them.
            throw new IllegalStateException("Could not store verification document");
        }
    }

    /** Compensation for a newly uploaded document; not exposed as an HTTP delete operation. */
    public void deletePrivateDocument(String reference) {
        String uuid = "[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}";
        if (!isCloudinaryConfigured() || reference == null
                || !reference.matches(PRIVATE_DOCUMENT_REFERENCE_PREFIX + "(?:image:(?:" + PRIVATE_DOCUMENT_FOLDER + "|Organizers/[1-9][0-9]*/doc)"
                + "/" + uuid + "|raw:(?:" + PRIVATE_DOCUMENT_FOLDER + "|Organizers/[1-9][0-9]*/doc)/" + uuid + "\\.pdf)")) {
            throw new IllegalStateException("Invalid or unavailable private document reference");
        }
        String value = reference.substring(PRIVATE_DOCUMENT_REFERENCE_PREFIX.length());
        int separator = value.indexOf(':');
        try {
            Map<?, ?> result = createCloudinaryClient().uploader().destroy(value.substring(separator + 1),
                    ObjectUtils.asMap("resource_type", value.substring(0, separator), "type", "authenticated", "invalidate", true));
            if (!"ok".equals(result.get("result")) && !"not found".equals(result.get("result"))) {
                throw new IllegalStateException("Document cleanup was not confirmed");
            }
        } catch (Exception ex) {
            throw new IllegalStateException("Could not clean up verification document");
        }
    }

    @SuppressWarnings("unchecked")
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

