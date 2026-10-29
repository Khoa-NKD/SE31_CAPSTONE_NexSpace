package base.api.shared.config;

import java.net.URI;
import java.util.Arrays;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.InitializingBean;
import org.springframework.core.env.Environment;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
public class RuntimeSettingsValidator implements InitializingBean {
  private final Environment env;

  @Override
  public void afterPropertiesSet() {
    for (String key :
        new String[] {
          "app.jwt.expiration-ms",
          "app.auth.session-ttl-days",
          "app.auth.verification-token-ttl-hours",
          "app.auth.reset-token-ttl-minutes"
        })
      if (env.getProperty(key, Long.class, 0L) <= 0)
        throw new IllegalStateException(key + " must be positive");
    if (!Arrays.asList(env.getActiveProfiles()).contains("prod")) return;
    for (String key :
        new String[] {
          "spring.datasource.url",
          "spring.datasource.username",
          "spring.datasource.password",
          "app.jwt.secret",
          "app.client-url",
          "app.api-url",
          "app.cors.allowed-origins"
        }) required(key);
    httpUrl(required("app.client-url"));
    httpUrl(required("app.api-url"));
    for (String origin : required("app.cors.allowed-origins").split(",")) httpUrl(origin.trim());
    if (env.getProperty("app.auth.email-verification-enabled", Boolean.class, true)) {
      required("spring.mail.username");
      required("spring.mail.password");
    }
  }

  private String required(String key) {
    String v = env.getProperty(key);
    if (v == null || v.isBlank() || (v.startsWith("<") && v.endsWith(">")) || v.contains("${"))
      throw new IllegalStateException("Missing required configuration: " + key);
    return v;
  }

  private void httpUrl(String value) {
    URI uri = URI.create(value);
    if (!("http".equals(uri.getScheme()) || "https".equals(uri.getScheme()))
        || uri.getHost() == null)
      throw new IllegalStateException(
          "Expected an absolute HTTP(S) URL in production configuration");
  }
}
