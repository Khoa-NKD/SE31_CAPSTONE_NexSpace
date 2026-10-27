package base.api.shared.config;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.service.impl.AuditService;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.*;
import java.time.*;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.*;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {
  private final IUserRepository users;
  private final PasswordEncoder encoder;
  private final AuditService audit;

  @Value("${app.seed.admin.enabled:false}")
  private boolean enabled;

  @Value("${app.seed.admin.email:}")
  private String email;

  @Value("${app.seed.admin.password:}")
  private String password;

  @Override
  @Transactional
  public void run(ApplicationArguments args) {
    if (!enabled) return;
    if (email.isBlank()
        || password.length() < 8
        || password.getBytes(java.nio.charset.StandardCharsets.UTF_8).length > 72)
      throw new IllegalStateException(
          "Admin seeding requires an email and password of 8 characters / at most 72 UTF-8 bytes");
    if (users.existsByEmailIgnoreCase(email.trim())) return;
    UserModel admin = new UserModel();
    admin.setEmail(email.trim().toLowerCase(Locale.ROOT));
    admin.setFullName("NexSpace Administrator");
    admin.setPassword(encoder.encode(password));
    admin.setRole(UserRole.ADMINISTRATOR);
    admin.setStatus(UserStatus.ACTIVE);
    admin.setEmailVerifiedAt(LocalDateTime.now(ZoneOffset.UTC));
    users.saveAndFlush(admin);
    audit.record(null, admin.getId(), "SEED_ADMIN");
  }
}
