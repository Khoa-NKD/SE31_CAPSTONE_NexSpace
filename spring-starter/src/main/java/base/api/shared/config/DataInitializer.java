package base.api.shared.config;

import base.api.feature.auth.repository.IRoleRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.workspace.repository.IAmenityRepository;
import base.api.feature.workspace.repository.IWorkspaceRepository;
import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.workspace.AmenityModel;
import base.api.shared.entity.workspace.WorkspaceModel;
import base.api.shared.enums.AmenityCategory;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import base.api.shared.enums.WorkspaceCategory;
import base.api.shared.enums.WorkspaceStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.util.List;

/**
 * Seed dữ liệu tối thiểu khi khởi động (idempotent):
 * - mọi role trong {@link UserRole}
 * - 1 tài khoản admin (nếu app.seed.admin.enabled=true và đã set password)
 * - 15 tiện ích tiêu chuẩn nếu bảng amenity trống
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class DataInitializer implements ApplicationRunner {

    private final IRoleRepository roleRepository;
    private final IUserRepository userRepository;
    private final IAmenityRepository amenityRepository;
    private final IWorkspaceRepository workspaceRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.seed.admin.enabled:false}")
    private boolean seedAdmin;

    @Value("${app.seed.admin.email:admin@nexspace.vn}")
    private String adminEmail;

    @Value("${app.seed.admin.username:admin}")
    private String adminUserName;

    @Value("${app.seed.admin.password:}")
    private String adminPassword;

    @Value("${app.seed.organizer.enabled:false}")
    private boolean seedOrganizer;

    @Value("${app.seed.organizer.email:organizer@nexspace.vn}")
    private String organizerEmail;

    @Value("${app.seed.organizer.username:organizer}")
    private String organizerUserName;

    @Value("${app.seed.organizer.password:}")
    private String organizerPassword;

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        for (UserRole role : UserRole.values()) {
            if (roleRepository.findByName(role.name()).isEmpty()) {
                roleRepository.save(new RoleModel(role.name(), role.name() + " role"));
                log.info("Seeded role {}", role);
            }
        }

        seedDefaultAmenities();
        seedAdminAccount();
        seedOrganizerAccount();
        seedDefaultWorkspace();
    }

    /**
     * [NOTE CHO DEV SAU / SEED DỮ LIỆU ĐỂ TEST FEATURE GÁN TIỆN ÍCH]:
     * Không gian làm việc ID 1 ("NexSpace Saigon Central Hub") được seed sẵn cho tài khoản Organizer ('organizer')
     * nhằm mục đích phục vụ kiểm thử và đồng bộ cho tính năng "Gán tiện ích cho Không gian" (Workspace Amenities Mapping).
     * Khi hệ thống triển khai module Quản lý / Đăng ký không gian đầy đủ (Workspace CRUD), không gian này
     * có thể giữ lại làm dữ liệu mẫu (demo fixture) hoặc tùy chỉnh theo yêu cầu của sprint sau.
     */
    private void seedDefaultWorkspace() {
        if (workspaceRepository.count() > 0) {
            return;
        }

        UserModel organizer = userRepository.findByLogin(organizerUserName)
                .or(() -> userRepository.findByLogin(organizerEmail))
                .orElse(null);

        if (organizer == null) {
            return;
        }

        WorkspaceModel ws = new WorkspaceModel();
        ws.setName("NexSpace Saigon Central Hub");
        ws.setOrganizer(organizer);
        ws.setStatus(WorkspaceStatus.ACTIVE);
        ws.setCategory(WorkspaceCategory.COWORKING_HUB);
        ws.setDescription("Modern coworking space situated in District 1, Ho Chi Minh City.");
        ws.setAddress("72 Le Thanh Ton Boulevard");
        ws.setDistrict("District 1");
        ws.setCity("Ho Chi Minh City");
        ws.setAreaSqm(new BigDecimal("1250.00"));
        ws.setSupportPhone("0901234567");

        workspaceRepository.save(ws);
        log.info("Seeded default workspace 'NexSpace Saigon Central Hub' for organizer '{}'", organizer.getUserName());
    }

    private void seedAdminAccount() {
        if (!seedAdmin) {
            return;
        }
        if (adminEmail.isBlank() || adminPassword.isBlank()) {
            log.warn("app.seed.admin.enabled=true nhưng thiếu email/password — bỏ qua seed admin");
            return;
        }
        seedUser(adminUserName, adminEmail, adminPassword, "System", "Admin", null, UserRole.ADMIN);
    }

    private void seedOrganizerAccount() {
        if (!seedOrganizer) {
            return;
        }
        if (organizerEmail.isBlank() || organizerPassword.isBlank()) {
            log.warn("app.seed.organizer.enabled=true nhưng thiếu email/password — bỏ qua seed organizer");
            return;
        }
        seedUser(organizerUserName, organizerEmail, organizerPassword, "Alex", "Nguyen", "0901234567", UserRole.ORGANIZER);
    }

    private void seedUser(
            String userName,
            String email,
            String rawPassword,
            String firstName,
            String lastName,
            String phone,
            UserRole role
    ) {
        UserModel user = userRepository.findByUserNameIgnoreCase(userName)
                .or(() -> userRepository.findByEmailIgnoreCase(email))
                .orElseGet(UserModel::new);

        user.setUserName(userName.toLowerCase());
        user.setEmail(email.toLowerCase());
        user.setPassword(passwordEncoder.encode(rawPassword));
        if (user.getFirstName() == null || user.getFirstName().isBlank()) {
            user.setFirstName(firstName);
        }
        if (user.getLastName() == null || user.getLastName().isBlank()) {
            user.setLastName(lastName);
        }
        if (phone != null && (user.getPhone() == null || user.getPhone().isBlank())) {
            user.setPhone(phone);
        }
        user.setVerified(true);
        user.setStatus(UserStatus.ACTIVE);
        user.setRoleEntity(roleRepository.findByName(role.name()).orElseThrow());

        userRepository.save(user);
        log.info("Seeded account '{}' ({}) with role {}", userName, email, role);
    }

    private void seedDefaultAmenities() {
        if (amenityRepository.count() > 0) {
            return;
        }

        List<AmenityModel> list = List.of(
                createAmenity("High-speed WiFi (1 Gbps)", AmenityCategory.TECH, "Wifi", "Symmetric fiber connection, multi-AP roaming and guest portal"),
                createAmenity("Soundproof Phone Booth", AmenityCategory.TECH, "PhoneCall", "Acoustic glass insulation, ventilation fan & interior task lighting"),
                createAmenity("Wireless Screen Casting", AmenityCategory.TECH, "Cast", "AirPlay, Miracast & Chromecast 4K low-latency streaming"),
                createAmenity("Dual Monitors Station", AmenityCategory.TECH, "Monitor", "27-inch 4K IPS monitors with 90W USB-C single cable docking"),
                createAmenity("High-speed Network Printer", AmenityCategory.TECH, "Printer", "Laser multifunction A3/A4 duplex scanner & printer"),
                createAmenity("Herman Miller Chairs", AmenityCategory.SPACE, "Armchair", "Aeron ergonomic lumbar support seating for all workstations"),
                createAmenity("Standing Desks", AmenityCategory.SPACE, "MoveVertical", "Motorized dual-motor height-adjustable sit-stand workstations"),
                createAmenity("Private Lockers", AmenityCategory.SPACE, "Lock", "Digital pin-pad secure storage lockers for personal belongings"),
                createAmenity("Hot Shower Facility", AmenityCategory.SPACE, "ShowerHead", "Private shower suites with heated water and fresh towels"),
                createAmenity("Dedicated Bike Storage", AmenityCategory.SPACE, "Bike", "Indoor secure bicycle rack with maintenance tool stand"),
                createAmenity("Executive Meeting Room", AmenityCategory.SPACE, "Presentation", "12-person boardroom with 75-inch 4K conference display"),
                createAmenity("Specialty Espresso Bar", AmenityCategory.COMFORT, "Coffee", "Premium Italian roast beans, automated espresso & cold brew on tap"),
                createAmenity("Filtered Water Station", AmenityCategory.COMFORT, "Droplets", "Reverse osmosis cold & sparkling mineral water dispenser"),
                createAmenity("Catering & Pantry Kitchen", AmenityCategory.COMFORT, "Utensils", "Microwaves, full-size refrigerators, utensils & dishwasher"),
                createAmenity("Wellness & Nap Pod", AmenityCategory.COMFORT, "Heart", "Zero-gravity recliner with ambient noise cancellation")
        );

        amenityRepository.saveAll(list);
        log.info("Seeded {} default coworking amenities", list.size());
    }

    private AmenityModel createAmenity(String name, AmenityCategory category, String icon, String description) {
        AmenityModel a = new AmenityModel();
        a.setName(name);
        a.setCategory(category);
        a.setIcon(icon);
        a.setDescription(description);
        a.setActive(true);
        return a;
    }
}

