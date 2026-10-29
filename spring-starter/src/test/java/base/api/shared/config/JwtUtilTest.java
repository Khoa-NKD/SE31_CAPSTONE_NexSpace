package base.api.shared.config;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import base.api.shared.entity.UserModel;
import base.api.shared.enums.UserRole;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.security.SignatureException;
import org.junit.jupiter.api.Test;

class JwtUtilTest {

  private static final String SECRET = "test-secret-test-secret-test-secret-123";

  private static UserModel user() {
    UserModel user = new UserModel();
    user.setId(java.util.UUID.fromString("00000000-0000-4000-8000-000000000042"));
    user.setFullName("John");
    user.setEmail("john@example.com");
    user.setRole(UserRole.CUSTOMER);
    return user;
  }

  @Test
  void generatedTokenCarriesUserIdAndRole() {
    JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000);

    String token =
        jwtUtil.generateToken(
            user(), java.util.UUID.fromString("00000000-0000-4000-8000-000000000001"));

    assertThat(jwtUtil.extractUserId(token)).isEqualTo(user().getId());
    assertThat(jwtUtil.parseClaims(token).get("role", String.class)).isEqualTo("Customer");
    assertThat(jwtUtil.parseClaims(token).getSubject()).isEqualTo(user().getId().toString());
  }

  @Test
  void rejectsTokenSignedWithAnotherSecret() {
    String token =
        new JwtUtil("another-secret-another-secret-another-1", 60_000)
            .generateToken(
                user(), java.util.UUID.fromString("00000000-0000-4000-8000-000000000001"));

    JwtUtil jwtUtil = new JwtUtil(SECRET, 60_000);

    assertThatThrownBy(() -> jwtUtil.extractUserId(token)).isInstanceOf(SignatureException.class);
  }

  @Test
  void rejectsExpiredToken() {
    JwtUtil jwtUtil = new JwtUtil(SECRET, -1_000);

    String token =
        jwtUtil.generateToken(
            user(), java.util.UUID.fromString("00000000-0000-4000-8000-000000000001"));

    assertThatThrownBy(() -> jwtUtil.extractUserId(token)).isInstanceOf(ExpiredJwtException.class);
  }

  @Test
  void failsFastWhenSecretTooShort() {
    assertThatThrownBy(() -> new JwtUtil("short", 60_000))
        .isInstanceOf(IllegalStateException.class);
    assertThatThrownBy(() -> new JwtUtil(null, 60_000)).isInstanceOf(IllegalStateException.class);
  }

  @Test
  void rejectsSignedTokenWithoutSessionIdentifier() {
    String token =
        io.jsonwebtoken.Jwts.builder()
            .setIssuer("nexspace-api")
            .setSubject(user().getId().toString())
            .setExpiration(new java.util.Date(System.currentTimeMillis() + 60_000))
            .signWith(
                io.jsonwebtoken.security.Keys.hmacShaKeyFor(
                    SECRET.getBytes(java.nio.charset.StandardCharsets.UTF_8)))
            .compact();
    assertThatThrownBy(() -> new JwtUtil(SECRET, 60_000).extractSessionId(token))
        .isInstanceOf(io.jsonwebtoken.MalformedJwtException.class);
  }
}
