package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.IRevokedTokenRepository;
import base.api.feature.auth.repository.IUserRepository;
import base.api.feature.auth.repository.IUserSessionRepository;
import base.api.feature.auth.service.ITokenRevocationService;
import base.api.shared.config.JwtUtil;
import base.api.shared.entity.RevokedTokenModel;
import base.api.shared.entity.identity.UserSessionModel;
import base.api.shared.util.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRevocationService implements ITokenRevocationService {

    private static final ZoneId VIETNAM_ZONE = ZoneId.of("Asia/Ho_Chi_Minh");

    private final IRevokedTokenRepository revokedTokenRepository;
    private final IUserSessionRepository userSessionRepository;
    private final IUserRepository userRepository;
    private final JwtUtil jwtUtil;

    /**
     * Cache lưu mốc thời gian thu hồi toàn bộ token theo userId để tối ưu tốc độ kiểm tra filter (O(1)).
     */
    private final ConcurrentHashMap<Long, Instant> userRevocationCache = new ConcurrentHashMap<>();

    @Override
    @Transactional
    public void revoke(String token) {
        String hash = HashUtils.sha256Hex(token);
        if (revokedTokenRepository.existsByTokenHash(hash)) {
            return;
        }
        RevokedTokenModel model = new RevokedTokenModel();
        model.setTokenHash(hash);
        model.setExpiresAt(LocalDateTime.ofInstant(jwtUtil.extractExpiration(token), ZoneId.systemDefault()));
        revokedTokenRepository.save(model);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isRevoked(String token) {
        return revokedTokenRepository.existsByTokenHash(HashUtils.sha256Hex(token));
    }

    @Override
    @Transactional
    public void revokeAllUserTokens(Long userId) {
        if (userId == null) {
            return;
        }

        Instant nowInstant = Instant.now();
        userRevocationCache.put(userId, nowInstant);

        LocalDateTime nowVietnam = LocalDateTime.now(VIETNAM_ZONE);

        // 1. Thu hồi toàn bộ session đang active trong DB
        List<UserSessionModel> activeSessions = userSessionRepository.findByUserIdAndRevokedAtIsNull(userId);
        if (!activeSessions.isEmpty()) {
            activeSessions.forEach(session -> session.setRevokedAt(nowVietnam));
            userSessionRepository.saveAll(activeSessions);
        }

        // 2. Tạo bản ghi mốc thu hồi để lưu vết vĩnh viễn (phòng trường hợp restart ứng dụng)
        userRepository.findById(userId).ifPresent(user -> {
            UserSessionModel marker = new UserSessionModel();
            marker.setUser(user);
            marker.setRefreshTokenHash("REVOKE_ALL_" + UUID.randomUUID());
            marker.setExpiresAt(nowVietnam.plusDays(30));
            marker.setRevokedAt(nowVietnam);
            marker.setLastActivityAt(nowVietnam);
            marker.setDeviceInfo("All Devices Revocation Event");
            userSessionRepository.save(marker);
        });

        log.info("Da thu hoi toan bo phien dang nhap va token cua user ID {} tren moi thiet bi", userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isUserTokenRevoked(Long userId, Instant issuedAt, String tokenRole, String currentDbRole) {
        if (userId == null) {
            return false;
        }

        // 1. Kiểm tra lệch vai trò: nếu role trong token khác với role hiện tại trong database thì lập tức coi là token cũ
        if (tokenRole != null && currentDbRole != null && !tokenRole.equalsIgnoreCase(currentDbRole)) {
            return true;
        }

        // 2. Kiểm tra mốc thời gian thu hồi
        Instant revokedAt = userRevocationCache.get(userId);
        if (revokedAt == null) {
            Optional<LocalDateTime> latestRevokedAt = userSessionRepository.findLatestRevokedAtByUserId(userId);
            if (latestRevokedAt.isPresent()) {
                revokedAt = latestRevokedAt.get().atZone(VIETNAM_ZONE).toInstant();
                userRevocationCache.put(userId, revokedAt);
            }
        }

        if (revokedAt != null) {
            if (issuedAt == null) {
                return true;
            }
            // JWT iat lưu theo epoch seconds nên so sánh epoch second để đảm bảo độ chính xác
            return issuedAt.getEpochSecond() <= revokedAt.getEpochSecond();
        }

        return false;
    }

    /** Dọn các token đã hết hạn (không cần giữ trong blacklist nữa). Chạy mỗi giờ. */
    @Scheduled(fixedDelayString = "PT1H", initialDelayString = "PT5M")
    @Transactional
    public void purgeExpired() {
        int removed = revokedTokenRepository.deleteExpired(LocalDateTime.now());
        if (removed > 0) {
            log.info("Purged {} expired revoked tokens", removed);
        }
    }
}
