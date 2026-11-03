package base.api.shared.config;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.shared.security.AuthUser;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.core.userdetails.UsernameNotFoundException;
import org.springframework.security.web.authentication.WebAuthenticationDetailsSource;
import org.springframework.stereotype.Component;
import org.springframework.util.AntPathMatcher;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Arrays;

@Component
@RequiredArgsConstructor
public class JwtAuthenticationFilter extends OncePerRequestFilter {

    private static final String BEARER_PREFIX = "Bearer ";

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final ITokenRevocationService tokenRevocationService;
    private final AntPathMatcher pathMatcher = new AntPathMatcher();

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        String path = request.getRequestURI();
        if ("GET".equalsIgnoreCase(request.getMethod()) &&
                Arrays.stream(SecurityConfig.PUBLIC_GET_ENDPOINTS).anyMatch(pattern -> pathMatcher.match(pattern, path))) {
            return true;
        }
        return Arrays.stream(SecurityConfig.PUBLIC_ENDPOINTS).anyMatch(pattern -> pathMatcher.match(pattern, path));
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {

        String header = request.getHeader(HttpHeaders.AUTHORIZATION);
        if (header == null || !header.startsWith(BEARER_PREFIX)) {
            filterChain.doFilter(request, response);
            return;
        }

        String token = header.substring(BEARER_PREFIX.length());
        try {
            Long userId = jwtUtil.extractUserId(token);
            if (userId == null || tokenRevocationService.isRevoked(token)) {
                writeUnauthorized(response, "Token không hợp lệ");
                return;
            }

            AuthUser user = userDetailsService.loadUserById(userId);
            if (!user.isEnabled()) {
                writeUnauthorized(response, "Tài khoản đã bị khóa");
                return;
            }

            var auth = UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
            auth.setDetails(new WebAuthenticationDetailsSource().buildDetails(request));
            SecurityContextHolder.getContext().setAuthentication(auth);
        } catch (ExpiredJwtException ex) {
            writeUnauthorized(response, "Token đã hết hạn");
            return;
        } catch (JwtException | IllegalArgumentException | UsernameNotFoundException ex) {
            writeUnauthorized(response, "Token không hợp lệ");
            return;
        }

        filterChain.doFilter(request, response);
    }

    static void writeUnauthorized(HttpServletResponse response, String message) throws IOException {
        writeJson(response, HttpServletResponse.SC_UNAUTHORIZED, message);
    }

    static void writeJson(HttpServletResponse response, int status, String message) throws IOException {
        response.setStatus(status);
        response.setContentType("application/json;charset=UTF-8");
        response.getWriter().write(
                "{\"success\":false,\"message\":\"" + message + "\",\"statusCode\":" + status + "}");
    }
}
