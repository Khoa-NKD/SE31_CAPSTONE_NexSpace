import base.api.feature.organizer.service.PrivateOrganizerDocumentStorage;
import base.api.feature.workspace.service.impl.CloudinaryStorageServiceImpl;
import java.nio.file.*;
import java.sql.*;
import java.util.*;

/** Explicit maintenance command. No application startup, schema changes, accounts or review decisions. */
public class MigrateOrganizerDocuments {
    static void configure(Object target, String fieldName, String value) throws Exception {
        var field = CloudinaryStorageServiceImpl.class.getDeclaredField(fieldName); field.setAccessible(true); field.set(target, value);
    }
    public static void main(String[] args) throws Exception {
        boolean apply = Arrays.asList(args).contains("--apply");
        var config = new Properties();
        try (var reader = Files.newBufferedReader(Path.of("src/main/resources/application-local.properties"))) { config.load(reader); }
        var cloud = new CloudinaryStorageServiceImpl();
        configure(cloud, "cloudName", config.getProperty("cloudinary.cloud-name", ""));
        configure(cloud, "apiKey", config.getProperty("cloudinary.api-key", ""));
        configure(cloud, "apiSecret", config.getProperty("cloudinary.api-secret", ""));
        if (!cloud.isCloudinaryConfigured()) throw new IllegalStateException("Private Cloudinary configuration is required");
        var defaults = new Properties();
        try (var reader = Files.newBufferedReader(Path.of("src/main/resources/application.properties"))) { defaults.load(reader); }
        var environment = new org.springframework.core.env.StandardEnvironment();
        environment.getPropertySources().addLast(new org.springframework.core.env.PropertiesPropertySource("migration-local", config));
        environment.getPropertySources().addLast(new org.springframework.core.env.PropertiesPropertySource("migration-base", defaults));
        var storage = new PrivateOrganizerDocumentStorage(environment.getProperty("app.organizer.documents-directory", ""), cloud, true);
        int migrated = 0, ready = 0, obsolete = 0, failed = 0, cleanupPending = 0;
        try (var db = DriverManager.getConnection(config.getProperty("spring.datasource.url"), config.getProperty("spring.datasource.username"), config.getProperty("spring.datasource.password"))) {
            var ids = new ArrayList<long[]>();
            try (var statement = db.prepareStatement("SELECT id,organizer_profile_id FROM organizer_document ORDER BY organizer_profile_id,id"); var rows = statement.executeQuery()) {
                while (rows.next()) ids.add(new long[]{rows.getLong(1), rows.getLong(2)});
            }
            System.out.println("DOCUMENTS_FOUND=" + ids.size() + " APPLY=" + apply);
            for (var identity : ids) {
                long id = identity[0], profileId = identity[1];
                String uploaded = null, oldKey = null, name = null;
                boolean committed = false; String stage = "lock";
                try {
                    db.setAutoCommit(false);
                    try (var lock = db.prepareStatement("SELECT id FROM organizer_profile WHERE id=? FOR UPDATE")) { lock.setLong(1, profileId); try (var rows = lock.executeQuery()) { if (!rows.next()) throw new IllegalStateException("Profile missing"); } }
                    boolean current;
                    try (var lock = db.prepareStatement("SELECT file_url,file_name,is_current FROM organizer_document WHERE id=? AND organizer_profile_id=? FOR UPDATE")) {
                        lock.setLong(1, id); lock.setLong(2, profileId);
                        try (var row = lock.executeQuery()) { if (!row.next()) throw new IllegalStateException("Document missing"); oldKey = row.getString(1); name = row.getString(2); current = row.getBoolean(3); }
                    }
                    if (!current) {
                        if (apply) {
                            try (var update = db.prepareStatement("UPDATE organizer_document SET status='REPLACED' WHERE id=? AND is_current=false")) { update.setLong(1, id); update.executeUpdate(); }
                            db.commit(); committed = true;
                            if (unreferencedByCurrent(db, oldKey)) storage.delete(new PrivateOrganizerDocumentStorage.StoredDocument(oldKey, name));
                        } else db.rollback();
                        obsolete++; System.out.println("OBSOLETE_RECORD id=" + id + " METADATA_RETAINED"); continue;
                    }
                    if (oldKey != null && oldKey.contains(":Organizers/" + profileId + "/doc/")) {
                        db.rollback(); ready++; System.out.println("ALREADY_READY id=" + id); continue;
                    }
                    stage = "read-source"; var content = storage.read(oldKey);
                    if (!apply) { db.rollback(); ready++; System.out.println("READABLE_SOURCE id=" + id); continue; }
                    String extension = switch (content.contentType()) { case "application/pdf" -> ".pdf"; case "image/png" -> ".png"; default -> ".jpg"; };
                    stage = "upload"; uploaded = cloud.uploadPrivateDocument(content.bytes(), UUID.randomUUID() + extension, profileId);
                    stage = "verify-upload"; var verified = storage.read(uploaded);
                    if (!java.security.MessageDigest.isEqual(content.bytes(), verified.bytes())) throw new IllegalStateException("Uploaded document verification failed");
                    try (var update = db.prepareStatement("UPDATE organizer_document SET file_url=? WHERE id=? AND file_url=? AND is_current=true")) {
                        update.setString(1, uploaded); update.setLong(2, id); update.setString(3, oldKey);
                        if (update.executeUpdate() != 1) throw new IllegalStateException("Document changed during migration");
                    }
                    db.commit(); committed = true; migrated++;
                    if (unreferencedByCurrent(db, oldKey)) storage.delete(new PrivateOrganizerDocumentStorage.StoredDocument(oldKey, name));
                    System.out.println("MIGRATED_AND_VERIFIED id=" + id + " profile=" + profileId);
                } catch (Exception failure) {
                    if (!committed) {
                        try { db.rollback(); } catch (SQLException ignored) { }
                        if (uploaded != null) try { cloud.deletePrivateDocument(uploaded); } catch (RuntimeException ignored) { cleanupPending++; }
                        failed++; System.out.println("SOURCE_RETAINED id=" + id + " stage=" + stage + " failureType=" + failure.getClass().getSimpleName());
                    } else { cleanupPending++; System.out.println("OLD_FILE_CLEANUP_PENDING id=" + id); }
                } finally { db.setAutoCommit(true); }
            }
        } catch (SQLException failure) { System.out.println("DATABASE_OPERATION_FAILED SQLSTATE=" + failure.getSQLState()); System.exit(1); }
        System.out.println("SUMMARY migrated=" + migrated + " alreadyReady=" + ready + " obsolete=" + obsolete + " failed=" + failed + " cleanupPending=" + cleanupPending);
        if (failed > 0 || cleanupPending > 0) System.exit(2);
    }
    static boolean unreferencedByCurrent(Connection db, String key) throws SQLException {
        try (var statement = db.prepareStatement("SELECT COUNT(*) FROM organizer_document WHERE file_url=? AND is_current=true")) {
            statement.setString(1, key); try (var rows = statement.executeQuery()) { rows.next(); return rows.getLong(1) == 0; }
        }
    }
}
