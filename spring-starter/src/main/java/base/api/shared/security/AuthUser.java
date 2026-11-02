package base.api.shared.security;

import base.api.shared.entity.UserModel;
import lombok.Getter;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;

import java.util.Collection;
import java.util.List;

/**
 * Principal lưu trong SecurityContext — mang theo userId để controller không phải parse lại JWT.
 */
@Getter
public class AuthUser implements UserDetails {

    private final Long id;
    private final String username;
    private final String password;
    private final boolean enabled;
    private final List<GrantedAuthority> authorities;

    public AuthUser(UserModel user) {
        this.id = user.getId();
        this.username = user.getUserName();
        this.password = user.getPassword();
        this.enabled = user.isActive();
        this.authorities = user.getRole() == null
                ? List.of()
                : List.of(new SimpleGrantedAuthority("ROLE_" + user.getRole().name()));
    }

    @Override
    public Collection<? extends GrantedAuthority> getAuthorities() {
        return authorities;
    }
}
