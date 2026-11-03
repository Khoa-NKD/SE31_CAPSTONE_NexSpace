package base.api.shared.config;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;

class JwtAuthenticationFilterTest {

    private JwtAuthenticationFilter filter;

    @BeforeEach
    void setUp() {
        JwtUtil jwtUtil = mock(JwtUtil.class);
        CustomUserDetailsService userDetailsService = mock(CustomUserDetailsService.class);
        ITokenRevocationService tokenRevocationService = mock(ITokenRevocationService.class);
        filter = new JwtAuthenticationFilter(jwtUtil, userDetailsService, tokenRevocationService);
    }

    @Test
    @DisplayName("shouldNotFilter trả về true cho GET /api/amenities kể cả khi có token")
    void shouldNotFilter_GetAmenities_ReturnsTrue() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/amenities");
        assertThat(filter.shouldNotFilter(request)).isTrue();
    }

    @Test
    @DisplayName("shouldNotFilter trả về true cho GET /api/amenities/1")
    void shouldNotFilter_GetAmenityById_ReturnsTrue() {
        MockHttpServletRequest request = new MockHttpServletRequest("GET", "/api/amenities/1");
        assertThat(filter.shouldNotFilter(request)).isTrue();
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
    @DisplayName("shouldNotFilter trả về true cho public auth endpoints")
    void shouldNotFilter_PublicAuth_ReturnsTrue() {
        MockHttpServletRequest request = new MockHttpServletRequest("POST", "/api/auth/login");
        assertThat(filter.shouldNotFilter(request)).isTrue();
    }
}

