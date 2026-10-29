package base.api.shared.security;

import base.api.shared.entity.UserModel;
import java.util.*;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

@Getter
public class AuthUser implements UserDetails {
  private final UUID id;
  private final String username;
  private final String password;
  private final boolean enabled;
  private final List<GrantedAuthority> authorities;

  public AuthUser(UserModel user) {
    id = user.getId();
    username = user.getEmail();
    password = user.getPassword();
    enabled = user.isActive() && user.getTwoFactorEnabled() == 0;
    authorities = List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
  }

  public Collection<? extends GrantedAuthority> getAuthorities() {
    return authorities;
  }
}
