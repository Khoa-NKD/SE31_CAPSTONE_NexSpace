package base.api.feature.organizer.config;

import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.security.AuthUser;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import java.util.Set;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.InterceptorRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

@Configuration
@RequiredArgsConstructor
public class OrganizerOperationalAccessConfiguration implements WebMvcConfigurer {
    private static final Set<String> MUTATIONS = Set.of("POST", "PUT", "PATCH", "DELETE");
    private final ObjectProvider<IOrganizerProfileRepository> profiles;

    @Override
    public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override
            public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                var authentication = SecurityContextHolder.getContext().getAuthentication();
                if (MUTATIONS.contains(request.getMethod()) && authentication != null
                        && authentication.getPrincipal() instanceof AuthUser user
                        && user.getAuthorities().stream().anyMatch(role -> role.getAuthority().equals("ROLE_ORGANIZER"))) {
                    var repository = profiles.getObject();
                    if (repository.findByOrganizerId(user.getId()).filter(profile -> profile.isSuspended()).isPresent()) {
                        throw new ForbiddenException("Quyền quản lý workspace của đối tác đang tạm ngưng.");
                    }
                }
                return true;
            }
        }).addPathPatterns("/api/organizer/**", "/api/v1/organizer/**", "/api/workspaces/**", "/api/v1/workspaces/**")
                .excludePathPatterns("/api/organizer/applications/**", "/api/organizer/contract/**",
                        "/api/organizer/business-profile/**", "/api/organizer/verification-documents/**",
                        "/api/organizer/bookings/**", "/api/v1/organizer/bookings/**",
                        "/api/organizer/workspaces/{workspaceId}/payments/**",
                        "/api/v1/organizer/workspaces/{workspaceId}/payments/**");
    }
}
