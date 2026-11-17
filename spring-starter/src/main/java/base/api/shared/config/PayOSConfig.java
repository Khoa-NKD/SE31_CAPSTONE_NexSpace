package base.api.shared.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import vn.payos.PayOS;

/**
 * Spring configuration bean for PayOS Payment Gateway SDK.
 */
@Slf4j
@Configuration
public class PayOSConfig {

    @Value("${nexspace.payos.client-id:}")
    private String clientId;

    @Value("${nexspace.payos.api-key:}")
    private String apiKey;

    @Value("${nexspace.payos.checksum-key:}")
    private String checksumKey;

    @Bean
    public PayOS payOS() {
        if (!StringUtils.hasText(clientId) || !StringUtils.hasText(apiKey) || !StringUtils.hasText(checksumKey)) {
            log.warn("PayOS credentials are not fully configured. Falling back to dummy PayOS client.");
            return new PayOS("mock-client-id", "mock-api-key", "mock-checksum-key");
        }
        log.info("Initializing PayOS client with clientId: {}", clientId);
        return new PayOS(clientId.trim(), apiKey.trim(), checksumKey.trim());
    }
}

