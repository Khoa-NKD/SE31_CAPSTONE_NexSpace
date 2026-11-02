package base.api.shared.config;

import base.api.shared.entity.RoleModel;
import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class JwtUtilTest {

    private static final String SECRET = "test-secret-test-secret-test-secret-123";

    private static UserModel user() {
        UserModel user = new UserModel();
        user.setId(42L);
        user.setUserName("john");
        user.setEmail("john@example.com");
        user.setRoleEntity(new RoleModel(UserRole.USER.name(), null));
        return user;
    }

    @Test
    void generatedTokenCarriesUserIdAndRole() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000);

        String token = jwtUtil.generateToken(user());

        assertThat(jwtUtil.extractUserId(token)).isEqualTo(42L);
        assertThat(jwtUtil.parseClaims(token).get("role", String.class)).isEqualTo("USER");
        assertThat(jwtUtil.parseClaims(token).getSubject()).isEqualTo("john");
    }

    @Test
    void rejectsTokenSignedWithAnotherSecret() {
        String token = new JwtUtil("another-secret-another-secret-another-1", 60_000).generateToken(user());

        JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000);

        assertThatThrownBy(() -> jwtUtil.extractUserId(token)).isInstanceOf(SignatureException.class);
    }

    @Test
    void rejectsExpiredToken() {
        JwtUtil jwtUtil = new JwtUtil(SECRET, -1_000);

        String token = jwtUtil.generateToken(user());

        assertThatThrownBy(() -> jwtUtil.extractUserId(token)).isInstanceOf(ExpiredJwtException.class);
    }

    @Test
    void failsFastWhenSecretTooShort() {
        assertThatThrownBy(() -> new JwtUtil("short", 60_000)).isInstanceOf(IllegalStateException.class);
        assertThatThrownBy(() -> new JwtUtil(null, 60_000)).isInstanceOf(IllegalStateException.class);
    }
}
