package base.api.feature.organizer.controller;

import base.api.feature.auth.service.ITokenRevocationService;
import base.api.feature.auth.service.impl.CustomUserDetailsService;
import base.api.feature.organizer.service.OrganizerContractService;
import base.api.shared.config.*;
import base.api.shared.entity.*;
import base.api.shared.security.*;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.context.annotation.Import;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(value = OrganizerContractController.class, properties = "spring.profiles.active=test")
@Import({SecurityConfig.class, JwtAuthenticationFilter.class, CurrentUserProvider.class})
class OrganizerContractControllerTest {
    @Autowired MockMvc mvc;
    @MockitoBean OrganizerContractService service;
    @MockitoBean JwtUtil jwtUtil;
    @MockitoBean CustomUserDetailsService userDetails;
    @MockitoBean ITokenRevocationService revocations;
    AuthUser actor(String role) {
        var user = new UserModel(); user.setId(7L); user.setUserName("owner"); user.setEmail("owner@example.test");
        user.setRoleEntity(new RoleModel(role, null));
        return new AuthUser(user);
    }
    @Test void anonymousAndWrongRolesCannotAccessAgreements() throws Exception {
        mvc.perform(get("/api/organizer/contract")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/organizer/contract").with(user(actor("ADMIN")))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/organizer-applications/1/contract").with(user(actor("USER")))).andExpect(status().isForbidden());
        mvc.perform(post("/api/organizer/contract/otp").with(user(actor("ORGANIZER"))).contentType("application/json")
                .content("{\"contractId\":1,\"contentHash\":\"" + "a".repeat(64) + "\"}")).andExpect(status().isForbidden());
        verifyNoInteractions(service);
    }
    @Test void ownerIsTakenFromSessionAndPdfIsPrivate() throws Exception {
        when(service.ownerPdf(7L)).thenReturn("%PDF-test".getBytes(java.nio.charset.StandardCharsets.US_ASCII));
        mvc.perform(get("/api/organizer/contract/pdf?download=true&userId=999").with(user(actor("USER"))))
                .andExpect(status().isOk()).andExpect(header().string("Cache-Control", "no-store, private"))
                .andExpect(header().string("Content-Type", "application/pdf"))
                .andExpect(header().string("Content-Disposition", org.hamcrest.Matchers.startsWith("attachment")));
        verify(service).ownerPdf(7L); verifyNoMoreInteractions(service);
    }
    @Test void malformedIdentityOrMissingConsentNeverReachesSigning() throws Exception {
        mvc.perform(post("/api/organizer/contract/sign").with(user(actor("USER"))).contentType("application/json")
                .content("{\"contractId\":1,\"contentHash\":\"invalid\",\"otp\":\"123456\",\"consent\":false}"))
                .andExpect(status().isBadRequest());
        verifyNoInteractions(service);
    }
}
