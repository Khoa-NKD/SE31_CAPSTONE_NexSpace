package base.api.feature.resource.service;

import base.api.feature.workspace.service.IMediaStorageService;
import base.api.shared.entity.resource.ResourceTypeModel.Photo;
import base.api.shared.exception.BadRequestException;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.*;

@Service
@RequiredArgsConstructor
@Slf4j
public class ResourceTypePhotos {
    private final IMediaStorageService storage;

    public List<Photo> save(Long actor, Long workspace, List<Photo> previous,
                            List<String> order, List<MultipartFile> files) {
        if (order == null) return previous;
        if (order.size() > 3 || new HashSet<>(order).size() != order.size())
            throw new BadRequestException("Choose up to three distinct photos per resource type");
        var existing = previous == null ? List.<Photo>of() : previous;
        var result = new ArrayList<Photo>();
        for (String entry : order) {
            if (entry != null && entry.matches("upload:(0|[1-9][0-9]?)")) {
                int index = Integer.parseInt(entry.substring("upload:".length()));
                if (index >= files.size()) throw new BadRequestException("Missing resource type photo");
                var file = files.get(index);
                validateImage(file);
                String folder = storage.resolveWorkspaceFolder(workspace) + "/resource-types";
                var uploaded = storage.uploadImage(file, folder, actor);
                var photo = new Photo(uploaded.getUrl(), uploaded.getPublicId());
                cleanupAfter(actor, photo, false);
                result.add(photo);
            } else {
                result.add(existing.stream().filter(photo -> photo.url().equals(entry)).findFirst()
                        .orElseThrow(() -> new BadRequestException("Invalid resource type photo")));
            }
        }
        for (var photo : existing) {
            if (!result.contains(photo)) cleanupAfter(actor, photo, true);
        }
        return result;
    }

    public void remove(Long actor, List<Photo> photos) {
        if (photos != null) photos.forEach(photo -> cleanupAfter(actor, photo, true));
    }

    private void cleanupAfter(Long actor, Photo photo, boolean committed) {
        TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
            @Override
            public void afterCompletion(int status) {
                if (committed ? status != STATUS_COMMITTED : status != STATUS_ROLLED_BACK) return;
                try {
                    storage.deleteImage(photo.publicId(), actor);
                } catch (RuntimeException failure) {
                    log.warn("Could not clean up resource type photo", failure);
                }
            }
        });
    }

    private static void validateImage(MultipartFile file) {
        // Local storage also serves files, so verify the signature and derive the safe extension.
        try (var stream = file.getInputStream()) {
            byte[] header = stream.readNBytes(12);
            boolean valid = switch (Objects.toString(file.getContentType(), "")) {
                case "image/jpeg" -> startsWith(header, 0, 0xff, 0xd8, 0xff);
                case "image/png" -> startsWith(header, 0, 0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a);
                case "image/webp" -> startsWith(header, 0, 'R', 'I', 'F', 'F')
                        && startsWith(header, 8, 'W', 'E', 'B', 'P');
                default -> false;
            };
            String filename = Objects.toString(file.getOriginalFilename(), "").toLowerCase(Locale.ROOT);
            boolean safeExtension = switch (Objects.toString(file.getContentType(), "")) {
                case "image/jpeg" -> filename.endsWith(".jpg") || filename.endsWith(".jpeg");
                case "image/png" -> filename.endsWith(".png");
                case "image/webp" -> filename.endsWith(".webp");
                default -> false;
            };
            if (!valid || !safeExtension) throw new BadRequestException("Upload a valid JPEG, PNG or WebP image");
        } catch (IOException failure) {
            throw new BadRequestException("Could not read the resource type photo");
        }
    }

    private static boolean startsWith(byte[] bytes, int offset, int... signature) {
        if (bytes.length < offset + signature.length) return false;
        for (int i = 0; i < signature.length; i++) {
            if (Byte.toUnsignedInt(bytes[offset + i]) != signature[i]) return false;
        }
        return true;
    }
}
