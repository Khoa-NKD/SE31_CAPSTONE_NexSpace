package base.api.shared.config;

import org.springframework.boot.autoconfigure.flyway.FlywayMigrationStrategy;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * Validate and apply migrations without rewriting the recorded schema history.
 * Checksum conflicts and failed migrations require explicit review before repair.
 */
@Configuration
public class FlywayConfig {

    @Bean
    public FlywayMigrationStrategy flywayMigrationStrategy() {
        return flyway -> flyway.migrate();
    }
}

