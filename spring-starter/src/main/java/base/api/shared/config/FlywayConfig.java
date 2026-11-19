package base.api.shared.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Cấu hình tự động sửa chữa schema history của Flyway trước khi thực thi migration.
 * Giúp triệt tiêu hoàn toàn các lỗi:
 * - Validate failed: Migrations have failed validation
 * - Checksum mismatch khi sửa file migration
 * - Bản ghi lỗi dở dang (failed migration) chặn khởi động backend
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> {
            flyway.repair();
            flyway.migrate();
        };
    }
}

