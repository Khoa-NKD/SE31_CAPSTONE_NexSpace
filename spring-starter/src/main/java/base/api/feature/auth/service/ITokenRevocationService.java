package base.api.feature.auth.service;

public interface ITokenRevocationService {

    void revoke(String token);

    boolean isRevoked(String token);
}
