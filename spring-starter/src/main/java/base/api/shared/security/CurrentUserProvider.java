package base.api.shared.security;

import base.api.shared.exception.UnauthorizedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class CurrentUserProvider {

    public Optional<AuthUser> getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.getPrincipal() instanceof AuthUser authUser) {
            return Optional.of(authUser);
        }
        return Optional.empty();
    }

    public Long getCurrentUserId() {
        return getCurrentUser()
                .map(AuthUser::getId)
                .orElseThrow(() -> new UnauthorizedException("Chưa đăng nhập"));
    }

    public boolean isAdmin() {
        return getCurrentUser()
                .map(user -> user.getAuthorities().stream()
                        .anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")))
                .orElse(false);
    }
}
