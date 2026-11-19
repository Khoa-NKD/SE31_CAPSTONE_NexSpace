package base.api.shared.config;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.shared.security.AuthUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.Message;
import org.springframework.messaging.MessageChannel;
import org.springframework.messaging.simp.stomp.StompCommand;
import org.springframework.messaging.simp.stomp.StompHeaderAccessor;
import org.springframework.messaging.support.ChannelInterceptor;
import org.springframework.messaging.support.MessageHeaderAccessor;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.stereotype.Component;

import java.util.List;

@Slf4j
@Component
@RequiredArgsConstructor
public class WebSocketAuthChannelInterceptor implements ChannelInterceptor {

    private final JwtUtil jwtUtil;
    private final CustomUserDetailsService userDetailsService;
    private final ITokenRevocationService tokenRevocationService;

    @Override
    public Message<?> preSend(Message<?> message, MessageChannel channel) {
        StompHeaderAccessor accessor = MessageHeaderAccessor.getAccessor(message, StompHeaderAccessor.class);
        if (accessor != null && StompCommand.CONNECT.equals(accessor.getCommand())) {
            String token = resolveToken(accessor);
            if (token != null) {
                try {
                    Long userId = jwtUtil.extractUserId(token);
                    if (userId != null && !tokenRevocationService.isRevoked(token)) {
                        AuthUser user = userDetailsService.loadUserById(userId);
                        if (user != null && user.isEnabled()) {
                            var auth = UsernamePasswordAuthenticationToken.authenticated(user, null, user.getAuthorities());
                            accessor.setUser(auth);
                        }
                    }
                } catch (Exception e) {
                    log.warn("WebSocket STOMP authentication failed: {}", e.getMessage());
                }
            }
        }
        return message;
    }

    private String resolveToken(StompHeaderAccessor accessor) {
        List<String> authHeaders = accessor.getNativeHeader("Authorization");
        if (authHeaders != null && !authHeaders.isEmpty()) {
            String header = authHeaders.get(0);
            if (header != null && header.startsWith("Bearer ")) {
                return header.substring(7);
            }
        }
        List<String> tokenHeaders = accessor.getNativeHeader("token");
        if (tokenHeaders != null && !tokenHeaders.isEmpty()) {
            return tokenHeaders.get(0);
        }
        return null;
    }
}
