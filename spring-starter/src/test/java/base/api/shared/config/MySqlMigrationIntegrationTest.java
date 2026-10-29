package base.api.shared.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;
import java.util.UUID;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.junit.jupiter.api.io.TempDir;

/** Opt-in real MySQL test. Run through scripts/verify-migration.py. */
@EnabledIfEnvironmentVariable(named = "NEXSPACE_MYSQL_TEST_URL", matches = ".+")
class MySqlMigrationIntegrationTest {

  @TempDir Path tempDir;

  @Test
  void initialSchemaMigratesOnceAndPreservesConstraintsAndTriggers() throws Exception {
    String url = System.getenv("NEXSPACE_MYSQL_TEST_URL");
    String user = System.getenv("NEXSPACE_MYSQL_TEST_USER");
    String password = System.getenv("NEXSPACE_MYSQL_TEST_PASSWORD");

    try (Connection connection = DriverManager.getConnection(url, user, password)) {
      // Refuse to run against a normal application database or a non-empty schema.
      assertThat(connection.getCatalog()).startsWith("nexspace_migration_");
      assertThat(
              count(
                  connection,
                  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE()"))
          .isZero();
    }

    Flyway flyway =
        Flyway.configure()
            .dataSource(url, user, password)
            .locations("classpath:db/migration")
            .cleanDisabled(true)
            .baselineOnMigrate(false)
            .validateMigrationNaming(true)
            .load();

    assertThat(flyway.migrate().migrationsExecuted).isEqualTo(1);
    flyway.validate();
    assertThat(flyway.info().current().getVersion().toString()).isEqualTo("1");
    assertThat(flyway.migrate().migrationsExecuted).isZero();

    try (Connection connection = DriverManager.getConnection(url, user, password)) {
      assertThat(
              count(
                  connection,
                  "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name <> 'flyway_schema_history'"))
          .isEqualTo(47);
      assertThat(
              count(
                  connection,
                  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND table_name <> 'flyway_schema_history'"))
          .isEqualTo(726);
      assertThat(
              count(
                  connection,
                  "SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = DATABASE() AND extra LIKE '%VIRTUAL GENERATED%'"))
          .isEqualTo(5);
      assertThat(
              count(
                  connection,
                  "SELECT COUNT(*) FROM information_schema.referential_constraints WHERE constraint_schema = DATABASE()"))
          .isEqualTo(103);
      assertThat(
              count(
                  connection,
                  "SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = DATABASE()"))
          .isEqualTo(30);
      assertThat(
              count(
                  connection,
                  "SELECT COUNT(*) FROM flyway_schema_history WHERE version = '1' AND success = 1"))
          .isEqualTo(1);

      connection.setAutoCommit(false);
      try {
        String id = UUID.randomUUID().toString();
        insertUser(connection, id, "migration@example.com", "Customer");
        assertThatThrownBy(
                () ->
                    insertUser(
                        connection,
                        UUID.randomUUID().toString(),
                        "MIGRATION@example.com",
                        "Customer"))
            .isInstanceOf(SQLException.class); // Case-insensitive unique email.
        assertThatThrownBy(
                () ->
                    insertUser(
                        connection, UUID.randomUUID().toString(), "bad-role@example.com", "USER"))
            .isInstanceOf(SQLException.class); // Business role CHECK is enforced.
        try (var statement =
            connection.prepareStatement(
                "UPDATE m_app_user SET updated_at = '2000-01-01 00:00:00' WHERE id = ?")) {
          statement.setString(1, id);
          assertThat(statement.executeUpdate()).isEqualTo(1);
        }
        assertThat(
                count(
                    connection,
                    "SELECT COUNT(*) FROM m_app_user WHERE ABS(TIMESTAMPDIFF(SECOND, updated_at, UTC_TIMESTAMP(6))) < 10"))
            .isEqualTo(1); // The BEFORE UPDATE trigger replaced the old timestamp.
        try (var statement = connection.createStatement()) {
          assertThatThrownBy(
                  () ->
                      statement.executeUpdate(
                          "INSERT INTO t_user_session (id, user_id, refresh_token_hash, expires_at) VALUES (UUID(), UUID(), 'orphan', DATE_ADD(UTC_TIMESTAMP(6), INTERVAL 1 DAY))"))
              .isInstanceOf(SQLException.class); // FK rejects an orphan session.
        }
      } finally {
        connection.rollback();
      }
      System.out.println(
          "MySQL schema verified: 47 tables, 721 business columns + 5 virtual columns, 103 foreign keys, 30 triggers; re-run applied 0 migrations.");
    }

    // A changed, already-applied V1 must be rejected by checksum validation.
    Path changed = tempDir.resolve("V1__init_nexspace_v3_3.sql");
    try (var source = getClass().getResourceAsStream("/db/migration/V1__init_nexspace_v3_3.sql")) {
      assertThat(source).isNotNull();
      Files.write(changed, source.readAllBytes());
    }
    Files.writeString(
        changed, "\n-- checksum verification change\n", java.nio.file.StandardOpenOption.APPEND);
    Flyway tampered =
        Flyway.configure()
            .dataSource(url, user, password)
            .locations("filesystem:" + tempDir)
            .cleanDisabled(true)
            .load();
    assertThatThrownBy(tampered::validate).hasMessageContaining("checksum mismatch");
  }

  private static long count(Connection connection, String sql) throws SQLException {
    try (var statement = connection.createStatement();
        var result = statement.executeQuery(sql)) {
      result.next();
      return result.getLong(1);
    }
  }

  private static void insertUser(Connection connection, String id, String email, String role)
      throws SQLException {
    try (var statement =
        connection.prepareStatement(
            "INSERT INTO m_app_user (id, email, full_name, role) VALUES (?, ?, 'Migration Test', ?)")) {
      statement.setString(1, id);
      statement.setString(2, email);
      statement.setString(3, role);
      statement.executeUpdate();
    }
  }
}
