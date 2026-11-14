package base.api.feature.organizer.service;

import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.NotFoundException;
import base.api.shared.enums.OrganizerDocumentType;
import base.api.feature.workspace.service.impl.CloudinaryStorageServiceImpl;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.LinkOption;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.nio.file.attribute.PosixFilePermissions;
import java.util.Locale;
import java.util.UUID;

/** Validates documents before authenticated Cloudinary or private local storage; supports legacy local keys. */
@Component
public class PrivateOrganizerDocumentStorage {
    public static final long MAX_BYTES = 5L * 1024 * 1024;
    private final String directory;
    private final CloudinaryStorageServiceImpl cloudinaryStorage;
    private final boolean cloudinaryEnabled;
    @Value("${app.organizer.identity-ocr-command:${OCR_TESSERACT_COMMAND:tesseract}}")
    private String identityOcrCommand;
    @Value("${app.organizer.identity-ocr-data-directory:${OCR_TESSDATA_DIR:}}")
    private String identityOcrDataDirectory;

    /** Local-only construction supports isolated filesystem tests and preserves legacy stored keys. */
    public PrivateOrganizerDocumentStorage(String directory) {
        this(directory, null, false);
    }

    @Autowired
    public PrivateOrganizerDocumentStorage(@Value("${app.organizer.documents-directory:}") String directory,
            CloudinaryStorageServiceImpl cloudinaryStorage,
            @Value("${app.organizer.documents-cloudinary-enabled:true}") boolean cloudinaryEnabled) {
        this.directory = directory;
        this.cloudinaryStorage = cloudinaryStorage;
        this.cloudinaryEnabled = cloudinaryEnabled;
    }

    public record StoredDocument(String key, String originalName) {}
    public record DocumentContent(byte[] bytes, String contentType) {}

    /** Read only internally stored references; never accept a URL or filesystem path from an HTTP request. */
    public DocumentContent read(String key) {
        if (key == null) throw new PrivateDocumentUnavailableException();
        byte[] bytes;
        if (key.startsWith(CloudinaryStorageServiceImpl.PRIVATE_DOCUMENT_REFERENCE_PREFIX)) {
            if (cloudinaryStorage == null) throw new PrivateDocumentUnavailableException();
            bytes = cloudinaryStorage.readPrivateDocument(key);
        } else {
            if (!key.matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(jpg|jpeg|png|pdf)")) {
                throw new PrivateDocumentUnavailableException();
            }
            try {
                if (directory.isBlank() || !Path.of(directory).isAbsolute()) throw new PrivateDocumentUnavailableException();
                Path configured = Path.of(directory).normalize();
                rejectPublicDirectory(configured);
                if (!Files.exists(configured, LinkOption.NOFOLLOW_LINKS)) throw new NotFoundException("Verification document file not found");
                if (Files.isSymbolicLink(configured)) throw new PrivateDocumentUnavailableException();
                Path root = configured.toRealPath();
                rejectPublicDirectory(root);
                Path target = root.resolve(key);
                if (!Files.isRegularFile(target, LinkOption.NOFOLLOW_LINKS)) throw new NotFoundException("Verification document file not found");
                try (var input = Files.newInputStream(target, LinkOption.NOFOLLOW_LINKS)) {
                    bytes = input.readNBytes((int) MAX_BYTES + 1);
                }
            } catch (IOException ex) {
                throw new PrivateDocumentUnavailableException();
            }
        }
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES) throw new PrivateDocumentUnavailableException();
        for (var type : new String[][]{{"jpg", "image/jpeg"}, {"png", "image/png"}, {"pdf", "application/pdf"}}) {
            if (matchesType(type[0], type[1], bytes)) return new DocumentContent(bytes, type[1]);
        }
        throw new PrivateDocumentUnavailableException();
    }

    public StoredDocument store(MultipartFile file) {
        return store(file, null);
    }

    static void requireSupportedFormat(base.api.shared.enums.OrganizerDocumentType type, MultipartFile file) {
        if (type == base.api.shared.enums.OrganizerDocumentType.WORKSPACE_OVERVIEW
                && !"application/pdf".equals(file.getContentType())) {
            throw new BadRequestException("The workspace overview must be a PDF file");
        }
    }

    public StoredDocument store(MultipartFile file, Long organizerProfileId) {
        return store(file, organizerProfileId, null);
    }

    public StoredDocument store(MultipartFile file, Long organizerProfileId, OrganizerDocumentType documentType) {
        return processUpload(file, organizerProfileId, documentType, false);
    }

    public void checkIdentityPhoto(MultipartFile file, OrganizerDocumentType type) {
        if (type != OrganizerDocumentType.ID_CARD_FRONT && type != OrganizerDocumentType.ID_CARD_BACK)
            throw new BadRequestException("Choose an identity card side");
        processUpload(file, null, type, true);
    }

    private StoredDocument processUpload(MultipartFile file, Long organizerProfileId,
            OrganizerDocumentType documentType, boolean checkOnly) {
        String name = file.getOriginalFilename();
        if (name == null || name.isBlank() || name.length() > 255
                || name.matches(".*[/\\\\:<>\"|?*].*") || name.codePoints().anyMatch(Character::isISOControl)) {
            throw new BadRequestException("Invalid document filename");
        }
        if (file.isEmpty() || file.getSize() > MAX_BYTES) {
            throw new BadRequestException("Document must be between 1 byte and 5 MB");
        }
        String lower = name.toLowerCase(Locale.ROOT);
        String extension = lower.substring(lower.lastIndexOf('.') + 1);
        try {
            byte[] bytes;
            try (var input = file.getInputStream()) {
                bytes = input.readNBytes((int) MAX_BYTES + 1);
            }
            if (bytes.length == 0 || bytes.length > MAX_BYTES || !matchesType(extension, file.getContentType(), bytes)) {
                throw new BadRequestException("Only valid JPG, PNG or PDF documents up to 5 MB are accepted");
            }
            if (documentType == OrganizerDocumentType.ID_CARD_FRONT || documentType == OrganizerDocumentType.ID_CARD_BACK) {
                if ("pdf".equals(extension)) throw new BadRequestException("Upload a JPG or PNG identity card photo");
                if (identityOcrCommand == null) throw new OrganizerIdentityCheckUnavailableException();
                OrganizerIdentityImageCheck.verify(documentType, bytes, identityOcrCommand, identityOcrDataDirectory);
            }
            if (checkOnly) return null;
            String key = UUID.randomUUID() + "." + extension;
            if (cloudinaryEnabled) {
                if (cloudinaryStorage == null || !cloudinaryStorage.isCloudinaryConfigured())
                    throw new IllegalStateException("Private Cloudinary storage is not configured");
                return new StoredDocument(organizerProfileId == null
                        ? cloudinaryStorage.uploadPrivateDocument(bytes, key)
                        : cloudinaryStorage.uploadPrivateDocument(bytes, key, organizerProfileId), name);
            }
            Path root = root();
            Path target = root.resolve(key);
            boolean created = false;
            try {
                if (Files.getFileStore(root).supportsFileAttributeView("posix")) {
                    Files.createFile(target, PosixFilePermissions.asFileAttribute(PosixFilePermissions.fromString("rw-------")));
                } else {
                    Files.createFile(target);
                }
                created = true;
                Files.write(target, bytes, StandardOpenOption.WRITE, LinkOption.NOFOLLOW_LINKS);
            } catch (IOException ex) {
                if (created) Files.deleteIfExists(target);
                throw ex;
            }
            return new StoredDocument(key, name);
        } catch (IOException ex) {
            throw new IllegalStateException("Could not store verification document", ex);
        }
    }

    public void delete(StoredDocument document) {
        // Dispatch by the saved reference, not by today's provider configuration.
        if (document.key().startsWith(CloudinaryStorageServiceImpl.PRIVATE_DOCUMENT_REFERENCE_PREFIX)) {
            if (cloudinaryStorage == null) throw new IllegalStateException("Private document provider is unavailable");
            cloudinaryStorage.deletePrivateDocument(document.key());
            return;
        }
        if (!document.key().matches("[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}\\.(jpg|jpeg|png|pdf)")) {
            throw new IllegalStateException("Invalid private document reference");
        }
        try {
            // Keys are generated internally and never taken from request parameters.
            Files.deleteIfExists(root().resolve(document.key()));
        } catch (IOException ex) {
            throw new IllegalStateException("Could not clean up verification document", ex);
        }
    }

    private Path root() throws IOException {
        if (directory.isBlank() || !Path.of(directory).isAbsolute()) {
            throw new IllegalStateException("Configure an absolute private app.organizer.documents-directory outside the web root");
        }
        Path path = Path.of(directory).normalize();
        rejectPublicDirectory(path);
        Files.createDirectories(path);
        if (Files.isSymbolicLink(path)) {
            throw new IllegalStateException("Document directory must not be a symbolic link");
        }
        Path resolved = path.toRealPath();
        rejectPublicDirectory(resolved);
        return resolved;
    }

    private static void rejectPublicDirectory(Path path) throws IOException {
        // WebMvcConfig exposes uploads, and Spring also serves classpath static resource directories.
        for (String location : new String[]{"uploads", "src/main/resources/static", "src/main/resources/public",
                "src/main/resources/resources", "src/main/resources/META-INF/resources", "target/classes/static",
                "target/classes/public", "target/classes/resources", "target/classes/META-INF/resources"}) {
            Path publicRoot = Path.of(location).toAbsolutePath().normalize();
            if (path.startsWith(publicRoot)
                    || (Files.exists(publicRoot) && path.startsWith(publicRoot.toRealPath()))) {
                throw new IllegalStateException("Verification documents must be stored outside public resource directories");
            }
        }
    }

    private static boolean matchesType(String extension, String contentType, byte[] bytes) {
        return switch (extension) {
            case "jpg", "jpeg" -> "image/jpeg".equals(contentType) && bytes.length >= 3
                    && (bytes[0] & 255) == 255 && (bytes[1] & 255) == 216 && (bytes[2] & 255) == 255;
            case "png" -> "image/png".equals(contentType) && bytes.length >= 8
                    && java.util.Arrays.equals(java.util.Arrays.copyOf(bytes, 8),
                    new byte[]{(byte) 137, 80, 78, 71, 13, 10, 26, 10});
            case "pdf" -> "application/pdf".equals(contentType) && bytes.length >= 8
                    && new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-");
            default -> false;
        };
    }
}
