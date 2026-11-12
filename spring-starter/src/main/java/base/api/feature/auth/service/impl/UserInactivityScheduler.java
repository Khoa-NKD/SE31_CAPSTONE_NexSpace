package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.repository.IUserSessionRepository;
import base.api.feature.governance.service.IAuditService;
import base.api.shared.entity.UserModel;
import base.api.shared.entity.identity.UserSessionModel;
import base.api.shared.enums.AuditActorType;
import base.api.shared.enums.UserRole;
import base.api.shared.enums.UserStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;

/**
 * Tác vụ định kỳ tự động chuyển các tài khoản lâu không đăng nhập sang trạng thái INACTIVE
 * và yêu cầu xác thực lại email khi đăng nhập lại.
 * Ngưỡng ngày không hoạt động được cấu hình qua biến môi trường INACTIVE_THRESHOLD_DAYS.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class UserInactivityScheduler {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final IUserRepository userRepository;
    private final IUserSessionRepository userSessionRepository;
    private final IAuditService auditService;

    @Value("${app.auth.inactive-threshold-days:90}")
    private long inactiveThresholdDays = 90;

    @Scheduled(cron = "${app.auth.inactive-check-cron:0 0 * * * *}", zone = "Asia/Ho_Chi_Minh")
    @Transactional
    public int markInactiveUsers() {
        if (inactiveThresholdDays <= 0) {
            return 0;
        }

        LocalDateTime now = LocalDateTime.now(VIETNAM_ZONE);
        LocalDateTime cutoff = now.minusDays(inactiveThresholdDays);
        List<UserModel> candidates = userRepository.findActiveUsersInactiveSince(cutoff);
        if (candidates.isEmpty()) {
            return 0;
        }

        long activeAdminCount = userRepository.countByRoleNameAndStatus(UserRole.ADMIN.name(), UserStatus.ACTIVE);
        int markedCount = 0;

        for (UserModel candidate : candidates) {
            if (candidate.getRole() == UserRole.ADMIN) {
                if (activeAdminCount <= 1) {
                    log.warn("[INACTIVITY] Bỏ qua tài khoản ADMIN duy nhất đang hoạt động (id={})", candidate.getId());
                    continue;
                }
                activeAdminCount--;
            }

            candidate.setStatus(UserStatus.INACTIVE);
            candidate.setVerified(false);
            userRepository.save(candidate);

            List<UserSessionModel> activeSessions = userSessionRepository.findByUserIdAndRevokedAtIsNull(candidate.getId());
            if (!activeSessions.isEmpty()) {
                activeSessions.forEach(session -> session.setRevokedAt(now));
                userSessionRepository.saveAll(activeSessions);
            }

            auditService.log(
                    null,
                    AuditActorType.SYSTEM,
                    "USER",
                    "USER_MARKED_INACTIVE",
                    "UserModel",
                    candidate.getId(),
                    UserStatus.ACTIVE.name(),
                    UserStatus.INACTIVE.name(),
                    "Tự động chuyển sang trạng thái INACTIVE do không đăng nhập quá " + inactiveThresholdDays + " ngày",
                    null
            );

            markedCount++;
        }

        if (markedCount > 0) {
            log.info("[INACTIVITY] Đã chuyển {} tài khoản không hoạt động quá {} ngày sang trạng thái INACTIVE",
                    markedCount, inactiveThresholdDays);
        }

        return markedCount;
    }
}

