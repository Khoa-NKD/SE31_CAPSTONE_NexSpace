package base.api.feature.auth.service;

import java.util.UUID;

public interface ITokenRevocationService {
  void revoke(String token);

  boolean isRevoked(String token);

  void revokeAll(UUID userId);
}
