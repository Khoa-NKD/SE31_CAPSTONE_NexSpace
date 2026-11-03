package base.api.shared.config;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.shared.security.AuthUser;
import io.jsonwebtoken.ExpiredJwtException;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletResponse;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.util.Collections;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class JwtAuthenticationFilterTest {

    private JwtAuthenticationFilter filter;
    private JwtUtil jwtUtil;
    private CustomUserDetailsService userDetailsService;
    private ITokenRevocationService tokenRevocationService;
    private FilterChain filterChain;

    @BeforeEach
    void setUp() {
        SecurityContextHolder.clearContext();
        jwtUtil = mock(JwtUtil.class);
        userDetailsService = mock(CustomUserDetailsService.class);
        tokenRevocationService = mock(ITokenRevocationService.class);
        filterChain = mock(FilterChain.class);
        filter = new JwtAuthenticationFilter(jwtUtil, userDetailsService, tokenRevocationService);
    }

    @Test
    @DisplayName("shouldNotFilter trả về true cho public auth endpoints")
    void shouldNotFilter_PublicAuth_ReturnsTrue() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        assertThat(filter.shouldNotFilter(request)).isTrue();
    }

    @Test
    @DisplayName("shouldNotFilter trả về false cho GET /api/amenities để cho phép trích xuất token người dùng nếu có")
    void shouldNotFilter_GetAmenities_ReturnsFalse() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/amenities");
        assertThat(filter.shouldNotFilter(request)).isFalse();
    }

    @Test
    @DisplayName("shouldNotFilter trả về false cho POST /api/amenities (yêu cầu JWT)")
    void shouldNotFilter_PostAmenities_ReturnsFalse() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/amenities");
        assertThat(filter.shouldNotFilter(request)).isFalse();
    }

    @Test
    @DisplayName("shouldNotFilter trả về false cho GET /api/admin/amenities (yêu cầu ADMIN JWT)")
    void shouldNotFilter_GetAdminAmenities_ReturnsFalse() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/admin/amenities");
        assertThat(filter.shouldNotFilter(request)).isFalse();
    }

    @Test
    @DisplayName("doFilterInternal: Public GET không có header Authorization vẫn cho phép qua FilterChain")
    void doFilterInternal_PublicGet_NoHeader_PassesThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/workspaces/1/amenities");
        MockHttpServletResponse response = new MockHttpServletResponse();

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
    }

    @Test
    @DisplayName("doFilterInternal: Public GET với valid token sẽ trích xuất và lưu Authentication vào SecurityContext")
    void doFilterInternal_PublicGet_ValidToken_SetsAuthentication() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/workspaces/1/amenities");
        request.addHeader("Authorization", "Bearer valid.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtil.extractUserId("valid.jwt.token")).thenReturn(10L);
        when(tokenRevocationService.isRevoked("valid.jwt.token")).thenReturn(false);

        AuthUser authUser = mock(AuthUser.class);
        when(authUser.isEnabled()).thenReturn(true);
        when(authUser.getAuthorities()).thenReturn(Collections.emptyList());
        when(userDetailsService.loadUserById(10L)).thenReturn(authUser);

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNotNull();
        assertThat(SecurityContextHolder.getContext().getAuthentication().getPrincipal()).isEqualTo(authUser);
    }

    @Test
    @DisplayName("doFilterInternal: Public GET với expired token vẫn cho phép qua FilterChain mà không trả về 401")
    void doFilterInternal_PublicGet_ExpiredToken_PassesThrough() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/workspaces/1/amenities");
        request.addHeader("Authorization", "Bearer expired.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtil.extractUserId("expired.jwt.token")).thenThrow(new ExpiredJwtException(null, null, "Expired"));

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain).doFilter(request, response);
        assertThat(SecurityContextHolder.getContext().getAuthentication()).isNull();
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_OK);
    }

    @Test
    @DisplayName("doFilterInternal: Protected endpoint với expired token sẽ trả về 401 Unauthorized")
    void doFilterInternal_ProtectedEndpoint_ExpiredToken_Returns401() throws ServletException, IOException {
        MockHttpServletRequest request = new MockHttpServletRequest("PUT", "/api/workspaces/1/amenities");
        request.addHeader("Authorization", "Bearer expired.jwt.token");
        MockHttpServletResponse response = new MockHttpServletResponse();

        when(jwtUtil.extractUserId("expired.jwt.token")).thenThrow(new ExpiredJwtException(null, null, "Expired"));

        filter.doFilterInternal(request, response, filterChain);

        verify(filterChain, never()).doFilter(request, response);
        assertThat(response.getStatus()).isEqualTo(HttpServletResponse.SC_UNAUTHORIZED);
    }
}


