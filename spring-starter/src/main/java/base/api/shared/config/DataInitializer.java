package base.api.shared.config;

import base.api.feature.auth.repository.IRoleRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

/**
 * Seed dữ liệu tối thiểu khi khởi động (idempotent):
 * - mọi role trong {@link UserRole}
 * - 1 tài khoản admin (nếu app.seed.admin.enabled=true và đã set password)
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final IRoleRepository roleRepository;
    private final IUserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin.enabled:false}")
    private boolean seedAdmin;

    @Value("${app.seed.admin.email:}")
    private String adminEmail;

    @Value("${app.seed.admin.username:admin}")
    private String adminUserName;

    @Value("${app.seed.admin.password:}")
    private String adminPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (UserRole role : UserRole.values()) {
            if (roleRepository.findByName(role.name()).isEmpty()) {
                roleRepository.save(new RoleModel(role.name(), role.name() + " role"));
                log.info("Seeded role {}", role);
            }
        }

        if (!seedAdmin) {
            return;
        }
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            log.warn("app.seed.admin.enabled=true nhưng thiếu email/password — bỏ qua seed admin");
            return;
        }
        if (userRepository.existsByEmailIgnoreCase(adminEmail) || userRepository.existsByUserNameIgnoreCase(adminUserName)) {
            return;
        }

        UserModel admin = new UserModel();
        admin.setUserName(adminUserName.toLowerCase());
        admin.setEmail(adminEmail.toLowerCase());
        admin.setPassword(passwordEncoder.encode(adminPassword));
        admin.setFirstName("Admin");
        admin.setVerified(true);
        admin.setStatus(UserStatus.ACTIVE);
        admin.setRoleEntity(roleRepository.findByName(UserRole.ADMIN.name()).orElseThrow());
        userRepository.save(admin);
        log.info("Seeded admin account '{}'", adminUserName);
    }
}
