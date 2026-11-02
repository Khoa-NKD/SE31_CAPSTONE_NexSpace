package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.IRevokedTokenRepository;
import base.api.feature.auth.service.ITokenRevocationService;
import base.api.shared.config.JwtUtil;
import base.api.shared.entity.RevokedTokenModel;
import base.api.shared.util.HashUtils;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Slf4j
@Service
@RequiredArgsConstructor
public class TokenRevocationService implements ITokenRevocationService {

    private final IRevokedTokenRepository revokedTokenRepository;
    private final JwtUtil jwtUtil;

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
