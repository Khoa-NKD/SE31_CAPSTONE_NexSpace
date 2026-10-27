package base.api.shared.config;

import static org.assertj.core.api.Assertions.*;

import org.junit.jupiter.api.Test;
import org.springframework.mock.env.MockEnvironment;

class RuntimeSettingsValidatorTest {
  private MockEnvironment settings() {
    return new MockEnvironment()
        .withProperty("app.jwt.expiration-ms", "900000")
        .withProperty("app.auth.session-ttl-days", "30")
        .withProperty("app.auth.verification-token-ttl-hours", "48")
        .withProperty("app.auth.reset-token-ttl-minutes", "60");
  }

  @Test
  void rejectsMissingProductionConfigurationWithoutEchoingSecretValues() {
    var env = settings();
    env.setActiveProfiles("prod");
    assertThatThrownBy(() -> new RuntimeSettingsValidator(env).afterPropertiesSet())
        .hasMessageContaining("spring.datasource.url");
  }

  @Test
  void rejectsNonPositiveSessionSettings() {
    var env = settings().withProperty("app.auth.session-ttl-days", "0");
    assertThatThrownBy(() -> new RuntimeSettingsValidator(env).afterPropertiesSet())
        .hasMessageContaining("app.auth.session-ttl-days");
  }

  @Test
  void acceptsLocalSettingsWithoutProductionSmtpCredentials() {
    var env = settings();
    env.setActiveProfiles("local");
    assertThatCode(() -> new RuntimeSettingsValidator(env).afterPropertiesSet())
        .doesNotThrowAnyException();
  }
}
