package base.api.shared.config;

import base.api.shared.entity.UserModel;
import io.jsonwebtoken.*;
import io.jsonwebtoken.security.Keys;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.*;
import javax.crypto.SecretKey;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtUtil {
  private final SecretKey key;
  private final long expirationMs;

  public JwtUtil(
      @Value("${app.jwt.secret}") String secret,
      @Value("${app.jwt.expiration-ms:900000}") long expirationMs) {
    if (secret == null || secret.getBytes(StandardCharsets.UTF_8).length < 32)
      throw new IllegalStateException("JWT_SECRET must be set and at least 32 bytes long");
    key = Keys.hmacShaKeyFor(secret.getBytes(StandardCharsets.UTF_8));
    this.expirationMs = expirationMs;
  }

  public String generateToken(UserModel user, UUID sessionId) {
    Instant now = Instant.now();
    return Jwts.builder()
        .setIssuer("nexspace-api")
        .setSubject(user.getId().toString())
        .setId(UUID.randomUUID().toString())
        .claim("id", user.getId().toString())
        .claim("sid", sessionId.toString())
        .claim("role", user.getRole().getValue())
        .setIssuedAt(Date.from(now))
        .setExpiration(Date.from(now.plusMillis(expirationMs)))
        .signWith(key, SignatureAlgorithm.HS256)
        .compact();
  }

  public Claims parseClaims(String token) {
    return Jwts.parserBuilder()
        .requireIssuer("nexspace-api")
        .setSigningKey(key)
        .build()
        .parseClaimsJws(token)
        .getBody();
  }

  public UUID extractUserId(String token) {
    return identifier(parseClaims(token).getSubject());
  }

  public UUID extractSessionId(String token) {
    return identifier(parseClaims(token).get("sid", String.class));
  }

  public Instant extractExpiration(String token) {
    return parseClaims(token).getExpiration().toInstant();
  }

  private UUID identifier(String value) {
    try {
      UUID id = UUID.fromString(value);
      if (!id.toString().equals(value)) throw new IllegalArgumentException();
      return id;
    } catch (IllegalArgumentException | NullPointerException ex) {
      throw new io.jsonwebtoken.MalformedJwtException(
          "JWT must contain canonical UUID identifiers");
    }
  }
}
