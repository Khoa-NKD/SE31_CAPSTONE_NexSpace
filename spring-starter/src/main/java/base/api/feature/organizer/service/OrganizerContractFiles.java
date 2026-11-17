package base.api.feature.organizer.service;

import base.api.shared.exception.ConflictException;
import java.io.IOException;
import java.nio.file.*;
import java.security.MessageDigest;
import java.util.HexFormat;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.transaction.support.*;

/** Private immutable artifacts live outside source and static web roots. Rollbacks remove new artifacts. */
@Component
public class OrganizerContractFiles {
    private final Path directory;
    public OrganizerContractFiles(@Value("${app.organizer.contract.directory:${user.home}/.nexspace/organizer-contracts}") String directory) {
        this.directory = Path.of(directory).toAbsolutePath().normalize();
    }
    public String store(byte[] pdf) {
        String key = UUID.randomUUID() + ".pdf";
        Path path = directory.resolve(key);
        try {
            Files.createDirectories(directory);
            Files.write(path, pdf, StandardOpenOption.CREATE_NEW);
        } catch (IOException exception) { throw new IllegalStateException("Contract storage is unavailable"); }
        if (TransactionSynchronizationManager.isSynchronizationActive()) {
            TransactionSynchronizationManager.registerSynchronization(new TransactionSynchronization() {
                @Override public void afterCompletion(int status) {
                    if (status != STATUS_COMMITTED) {
                        try { Files.deleteIfExists(path); } catch (IOException ignored) { /* Private orphan can be reconciled later. */ }
                    }
                }
            });
        }
        return key;
    }
    public byte[] read(String key) {
        if (key == null || !key.matches("[a-f0-9-]{36}\\.pdf")) throw new ConflictException("Contract artifact is unavailable");
        try { return Files.readAllBytes(directory.resolve(key)); }
        catch (IOException exception) { throw new ConflictException("Contract artifact is unavailable. Please contact support."); }
    }
    public static String digest(byte[] bytes) {
        try { return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(bytes)); }
        catch (java.security.NoSuchAlgorithmException exception) { throw new IllegalStateException("SHA-256 is unavailable"); }
    }
}
