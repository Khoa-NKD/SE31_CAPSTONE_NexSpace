package base.api.feature.organizer.service;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.security.access.prepost.PreAuthorize;

@Service
@RequiredArgsConstructor
public class AdminOrganizerDocumentContentService {
    private final AdminOrganizerDocumentAccessService access;
    private final PrivateOrganizerDocumentStorage storage;

    public record Content(byte[] bytes, String contentType, String fileName) {}

    @PreAuthorize("hasRole('ADMIN')")
    public Content read(Long actorId, Long applicationId, Long documentId) {
        // Resolve authorization inside a short read-only transaction before doing provider/network I/O.
        var reference = access.authorize(actorId, applicationId, documentId);
        var content = storage.read(reference.key());
        return new Content(content.bytes(), content.contentType(), safeFilename(reference.fileName(), content.contentType()));
    }

    private String safeFilename(String original, String contentType) {
        String name = original == null ? "" : original.replace('\\', '/');
        name = name.substring(name.lastIndexOf('/') + 1).replaceAll("[\\p{Cntrl}<>:\"|?*]", "_").trim();
        String extension = switch (contentType) { case "application/pdf" -> ".pdf"; case "image/png" -> ".png"; default -> ".jpg"; };
        if (name.isBlank() || name.equals(".") || name.equals("..")) return "verification-document" + extension;
        if (name.length() > 180) name = name.substring(0, 180);
        String lower = name.toLowerCase(java.util.Locale.ROOT);
        if (!(lower.endsWith(extension) || (extension.equals(".jpg") && lower.endsWith(".jpeg")))) name += extension;
        return name;
    }
}
