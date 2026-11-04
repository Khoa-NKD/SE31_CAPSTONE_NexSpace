package base.api.feature.organizer.service;

import base.api.shared.exception.BadRequestException;
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

    public StoredDocument store(MultipartFile file) {
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
            String key = UUID.randomUUID() + "." + extension;
            if (cloudinaryEnabled && cloudinaryStorage != null && cloudinaryStorage.isCloudinaryConfigured()) {
                return new StoredDocument(cloudinaryStorage.uploadPrivateDocument(bytes, key), name);
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
