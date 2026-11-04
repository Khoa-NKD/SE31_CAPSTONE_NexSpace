package base.api.feature.organizer.config;

import base.api.feature.organizer.repository.IOrganizerProfileRepository;
import base.api.shared.exception.ForbiddenException;
import base.api.shared.security.AuthUser;
import jakarta.servlet.http.*;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.servlet.HandlerInterceptor;
import org.springframework.web.servlet.config.annotation.*;
import base.api.shared.config.SecurityConfig;

/** A targeted operational guard: account authentication, customer features and application status remain usable. */
@Configuration
@RequiredArgsConstructor
public class OrganizerOperationalAccessConfiguration implements WebMvcConfigurer {
    private final ObjectProvider<IOrganizerProfileRepository> profiles;

    @Override public void addInterceptors(InterceptorRegistry registry) {
        registry.addInterceptor(new HandlerInterceptor() {
            @Override public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
                var auth = SecurityContextHolder.getContext().getAuthentication();
                if (auth == null || auth.getAuthorities().stream().noneMatch(a -> a.getAuthority().equals("ROLE_ORGANIZER"))
                        || auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN"))) return true;
                var matcher = new AntPathMatcher();
                if (request.getMethod().equals("GET") && java.util.Arrays.stream(SecurityConfig.PUBLIC_GET_ENDPOINTS)
                        .anyMatch(path -> matcher.match(path, request.getServletPath().isEmpty() ? request.getRequestURI() : request.getServletPath()))) return true;
                if (!(auth.getPrincipal() instanceof AuthUser actor) || profiles.getIfAvailable() == null)
                    throw new ForbiddenException("Organizer operational access could not be verified");
                if (profiles.getObject().existsByOrganizerIdAndSuspendedTrue(actor.getId()))
                    throw new ForbiddenException("Organizer operations are suspended. You can still sign in and view your application status");
                return true;
            }
        }).addPathPatterns("/api/workspaces/**", "/api/v1/workspaces/**", "/api/organizer/business-profile/**");
    }
}
