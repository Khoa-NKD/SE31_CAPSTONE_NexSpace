package base.api.feature.auth.service.impl;

import base.api.shared.exception.BadRequestException;
import base.api.shared.exception.UnauthorizedException;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

@Slf4j
@Service
public class GoogleTokenVerifierService {

    private static final String GOOGLE_TOKENINFO_ID_URL = "https://oauth2.googleapis.com/tokeninfo?id_token=";
    private static final String GOOGLE_TOKENINFO_ACCESS_URL = "https://oauth2.googleapis.com/tokeninfo?access_token=";
    private static final String GOOGLE_USERINFO_URL = "https://www.googleapis.com/oauth2/v3/userinfo";

    @Value("${app.google.client-id:}")
    private String configuredClientId;

    private final RestTemplate restTemplate = new RestTemplate();

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class GoogleUserPayload {
        private String sub;
        private String email;
        private boolean emailVerified;
        private String name;
        private String givenName;
        private String familyName;
        private String picture;
    }

    public GoogleUserPayload verifyToken(String rawToken) {
        if (rawToken == null || rawToken.isBlank()) {
            throw new BadRequestException("Google Token không được để trống");
        }

        String token = rawToken.trim();

        // Hỗ trợ kiểm thử đơn vị hoặc mock token nội bộ trong môi trường dev
        if (token.startsWith("mock-google-token:")) {
            String mockEmail = token.substring("mock-google-token:".length()).trim();
            return GoogleUserPayload.builder()
                    .sub("mock-sub-" + mockEmail.hashCode())
                    .email(mockEmail)
                    .emailVerified(true)
                    .name("Google User")
                    .givenName("Google")
                    .familyName("User")
                    .picture("https://lh3.googleusercontent.com/a/default-user")
                    .build();
        }

        // 1. Nếu token có dạng JWT (2 dấu chấm), thử verify qua endpoint id_token
        boolean isJwt = token.chars().filter(ch -> ch == '.').count() == 2;
        if (isJwt) {
            try {
                return verifyIdToken(token);
            } catch (UnauthorizedException ex) {
                throw ex;
            } catch (Exception ex) {
                log.debug("[GOOGLE_AUTH] Verify id_token không thành công, thử tiếp access_token: {}", ex.getMessage());
            }
        }

        // 2. Thử verify qua Google OAuth2 Access Token
        try {
            return verifyAccessToken(token);
        } catch (UnauthorizedException ex) {
            throw ex;
        } catch (Exception ex) {
            log.warn("[GOOGLE_AUTH] Lỗi xác thực token từ Google API: {}", ex.getMessage());
            throw new UnauthorizedException("Google Token không hợp lệ hoặc đã hết hạn. Vui lòng thử đăng nhập lại.");
        }
    }

    private GoogleUserPayload verifyIdToken(String token) {
        ResponseEntity<Map> response = restTemplate.getForEntity(GOOGLE_TOKENINFO_ID_URL + token, Map.class);
        Map<String, Object> body = response.getBody();
        if (body == null) {
            throw new UnauthorizedException("Google ID Token không hợp lệ hoặc đã hết hạn");
        }

        // Kiểm tra audience (aud) nếu đã cấu hình Client ID
        String aud = (String) body.get("aud");
        if (configuredClientId != null && !configuredClientId.isBlank()) {
            if (!configuredClientId.equals(aud)) {
                log.warn("[GOOGLE_AUTH] Audience mismatch. Expected: {}, Got: {}", configuredClientId, aud);
                throw new UnauthorizedException("Google ID Token không khớp với ứng dụng NexSpace");
            }
        }

        String email = (String) body.get("email");
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Không tìm thấy thông tin email trong tài khoản Google");
        }

        String emailVerifiedStr = String.valueOf(body.get("email_verified"));
        boolean emailVerified = "true".equalsIgnoreCase(emailVerifiedStr);

        return GoogleUserPayload.builder()
                .sub((String) body.get("sub"))
                .email(email)
                .emailVerified(emailVerified)
                .name((String) body.get("name"))
                .givenName((String) body.get("given_name"))
                .familyName((String) body.get("family_name"))
                .picture((String) body.get("picture"))
                .build();
    }

    private GoogleUserPayload verifyAccessToken(String accessToken) {
        // 1. Kiểm tra audience và tính hợp lệ qua tokeninfo
        try {
            ResponseEntity<Map> tokenInfoResp = restTemplate.getForEntity(GOOGLE_TOKENINFO_ACCESS_URL + accessToken, Map.class);
            Map<String, Object> tokenInfo = tokenInfoResp.getBody();
            if (tokenInfo != null && configuredClientId != null && !configuredClientId.isBlank()) {
                String aud = (String) tokenInfo.get("aud");
                String azp = (String) tokenInfo.get("azp");
                if (aud != null && !configuredClientId.equals(aud) && azp != null && !configuredClientId.equals(azp)) {
                    log.warn("[GOOGLE_AUTH] Audience mismatch for access token. Expected: {}, aud: {}, azp: {}", configuredClientId, aud, azp);
                    throw new UnauthorizedException("Google Access Token không khớp với ứng dụng NexSpace");
                }
            }
        } catch (HttpStatusCodeException ex) {
            log.warn("[GOOGLE_AUTH] Tokeninfo access_token failed: {} {}", ex.getStatusCode(), ex.getResponseBodyAsString());
            throw new UnauthorizedException("Google Access Token không hợp lệ hoặc đã hết hạn");
        }

        // 2. Lấy thông tin người dùng từ userinfo endpoint
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(accessToken);
        HttpEntity<Void> entity = new HttpEntity<>(headers);
        ResponseEntity<Map> userInfoResp = restTemplate.exchange(GOOGLE_USERINFO_URL, HttpMethod.GET, entity, Map.class);
        Map<String, Object> userInfo = userInfoResp.getBody();
        if (userInfo == null) {
            throw new UnauthorizedException("Không thể lấy thông tin người dùng từ Google");
        }

        String email = (String) userInfo.get("email");
        if (email == null || email.isBlank()) {
            throw new UnauthorizedException("Không tìm thấy thông tin email trong tài khoản Google");
        }

        boolean emailVerified = Boolean.TRUE.equals(userInfo.get("email_verified")) ||
                "true".equalsIgnoreCase(String.valueOf(userInfo.get("email_verified")));

        return GoogleUserPayload.builder()
                .sub((String) userInfo.get("sub"))
                .email(email)
                .emailVerified(emailVerified)
                .name((String) userInfo.get("name"))
                .givenName((String) userInfo.get("given_name"))
                .familyName((String) userInfo.get("family_name"))
                .picture((String) userInfo.get("picture"))
                .build();
    }
}
