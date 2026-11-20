package base.api.feature.organizer.service;

import base.api.shared.exception.ConflictException;
import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.beans.factory.annotation.Autowired;
import base.api.feature.workspace.service.impl.CloudinaryStorageServiceImpl;
import org.springframework.transaction.support.*;

/** Private immutable artifacts live outside source and static web roots. Rollbacks remove new artifacts. */
@Component
public class OrganizerContractFiles {
    private final Path directory;
    private final CloudinaryStorageServiceImpl cloudinary;
    private final boolean cloudinaryEnabled;

    public OrganizerContractFiles(String directory) {
        this(directory, null, false);
    }

    @Autowired
    public OrganizerContractFiles(@Value("${app.organizer.contract.directory:${user.home}/.nexspace/organizer-contracts}") String directory,
            CloudinaryStorageServiceImpl cloudinary,
            @Value("${app.organizer.contract.cloudinary-enabled:false}") boolean cloudinaryEnabled) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
        this.cloudinary = cloudinary;
        this.cloudinaryEnabled = cloudinaryEnabled;
    }
    public String store(byte[] pdf) {
        String key = UUID.randomUUID() + ".pdf";
        Path path = directory.resolve(key);
        if (cloudinaryEnabled) {
            if (cloudinary == null || !cloudinary.isCloudinaryConfigured())
                throw new IllegalStateException("Private contract storage is not configured");
            String reference = cloudinary.uploadPrivateContract(pdf, key);
            compensate(() -> cloudinary.deletePrivateDocument(reference));
            return reference;
        }
        try {
            Files.createDirectories(directory);
            Files.write(path, pdf, StandardOpenOption.CREATE_NEW);
        } catch (IOException exception) { throw new IllegalStateException("Contract storage is unavailable"); }
        compensate(() -> {
            try { Files.deleteIfExists(path); }
            catch (IOException ignored) { /* A private orphan can be reconciled later. */ }
        });
        return key;
    }

    private void compensate(Runnable cleanup) {
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        try { cleanup.run(); } catch (RuntimeException ignored) { /* Reconcile private orphans without leaking provider details. */ }
                    }
                }
            });
        }
    }
    public byte[] read(String key) {
        if (key != null && key.startsWith(CloudinaryStorageServiceImpl.PRIVATE_DOCUMENT_REFERENCE_PREFIX)) {
            if (cloudinary == null) throw new ConflictException("Private contract storage is not configured");
            return cloudinary.readPrivateDocument(key);
        }
        if (key == null || !key.matches("[a-f0-9-]{36}\\.pdf")) throw new ConflictException("Contract artifact is unavailable");
        try { return Files.readAllBytes(directory.resolve(key)); }
        catch (IOException exception) { throw new ConflictException("Contract artifact is unavailable. Please contact support."); }
    }
    public static String digest(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (java.security.NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 is unavailable"); }
    }
}
