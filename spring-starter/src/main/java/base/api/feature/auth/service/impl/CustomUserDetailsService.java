package base.api.feature.auth.service.impl;

import base.api.feature.auth.repository.IUserRepository;
import base.api.shared.security.AuthUser;
import java.util.UUID;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class CustomUserDetailsService implements UserDetailsService {

  private final IUserRepository userRepository;

  /** Dùng bởi AuthenticationManager khi login — nhận email. */
  @Override
  @Transactional(readOnly = true)
  public AuthUser loadUserByUsername(String login) throws UsernameNotFoundException {
    return userRepository
        .findByLogin(login)
        .map(AuthUser::new)
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));
  }

  /** Dùng bởi JwtAuthenticationFilter. */
  @Transactional(readOnly = true)
  public AuthUser loadUserById(UUID userId) throws UsernameNotFoundException {
    return userRepository
        .findById(userId)
        .map(AuthUser::new)
        .orElseThrow(() -> new UsernameNotFoundException("User not found"));
  }
}
